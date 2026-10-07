import { createUserSupabaseClient } from '../config/supabase.js';
// A ficha de cada sala e o conferidor moram no cliente porque o jogo usa os
// mesmos arquivos no gerador local de reserva. O Render clona o repositório
// inteiro, então o caminho relativo existe lá também.
import { AI_SPECS } from '../../client/data/aiSpecs.js';
import { checkPuzzle } from '../../client/utils/puzzleCheck.js';

// =========================================================
// GERADOR DE PUZZLES POR IA (Gemini)
//
// Fluxo de um pedido (POST /ai/puzzle { slug }):
//   1. a ficha da sala (client/data/aiSpecs.js) diz o que a IA pode gerar;
//   2. o PERFIL DE APRENDIZADO do jogador (user_topic_performance + as
//      últimas tentativas neste puzzle) vira uma dificuldade: fácil, médio ou
//      difícil. O nível estimado é gravado de volta no perfil;
//   3. o Gemini gera o puzzle em JSON, preso a um schema montado da ficha;
//   4. o puzzle é EXECUTADO com todas as montagens possíveis das peças
//      (client/utils/puzzleCheck.js). Reprovado, o motivo volta para o modelo
//      e ele tenta de novo;
//   5. cada geração, aceita ou não, entra em ai_analysis_logs.
//
// Nada disso pode travar o jogo: se o Gemini estiver fora, lento ou errando,
// a rota responde erro e o cliente usa o gerador local da mesma ficha.
// =========================================================

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Modelo do .env primeiro; os outros entram quando ele responde 503/429
// (o "alta demanda" do Gemini é comum e passa sozinho). Os lite respondem em
// ~1 s; o conferidor segura a diferença de qualidade.
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
// O primeiro modelo ganha pouco tempo: quando o Gemini está em "alta demanda"
// ele demora para responder até o 503, e a sala inteira espera junto.
const FIRST_CALL_TIMEOUT_MS = 6000;
const CALL_TIMEOUT_MS = 9000;
const DEADLINE_MS = 16000;      // o cliente desiste em ~18 s e usa o gerador local
const MAX_CALLS = 4;
const RECENT_ATTEMPTS = 8;

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const DIFFICULTY_GUIDE = {
  easy: [
    'Uma comparação só, com um número redondo como limite.',
    'Peças-isca: um operador invertido e um número errado. Nada mais.',
    'O briefing deixa claro de que lado do limite fica cada saída.'
  ],
  medium: [
    'Uma comparação; o limite não precisa ser redondo.',
    'Peças-isca que exigem atenção: o mesmo número entre aspas (texto), o operador vizinho (< e <=, > e >=) e uma variável que não importa.',
    'Mais casos perto do limite.'
  ],
  hard: [
    'A regra pode combinar duas condições com "e" ou "ou" (por exemplo, uma das entradas de texto com uma numérica). Ponha o nome das variáveis como texto fixo da linha para caber em 4 encaixes: "se umidade [op] [valor] e planta [op] [valor] :".',
    'Iscas fortes: o conectivo errado, o operador vizinho, o número como texto.',
    'O briefing descreve a regra por extenso, sem entregar a ordem das peças.'
  ]
};

const EXAMPLE = {
  title: 'CATRACAS // ACESSO',
  briefing: [
    'O bloqueio travou as catracas para todo mundo.',
    'Reescreva a regra: só crachá de nível 3 ou mais passa.'
  ],
  hint: 'monte:  se cracha >= 3 :  catraca = true  /  senão :  catraca = false',
  lines: ['se [nome] [op] [valor] :', '    catraca = [valor]', 'senão :', '    catraca = [valor]'],
  blocks: { nome: ['cracha'], op: ['>=', '<', '=='], valor: ['3', '"3"', 'true', 'false'] },
  tests: [
    { label: 'A', given: { cracha: 2 }, expect: { catraca: false } },
    { label: 'B', given: { cracha: 3 }, expect: { catraca: true } },
    { label: 'C', given: { cracha: 5 }, expect: { catraca: true } }
  ],
  successMessage: 'ACESSO CONFIGURADO'
};

const serviceError = (message, statusCode, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
};

export const getAiServiceStatus = () => (process.env.GEMINI_API_KEY ? 'ready' : 'sem GEMINI_API_KEY');

// --- Perfil de aprendizado -> dificuldade ------------------------------------

// Sobe um nível com acerto alto e pouco erro por tentativa; desce com acerto
// baixo ou muito erro. Com poucas tentativas no tópico, fica onde está: três
// acertos de sorte não fazem ninguém "difícil".
export const estimateDifficulty = ({ current, attempts, accuracy, avgErrors }) => {
  let index = Math.max(DIFFICULTIES.indexOf(current), 0);

  if (attempts >= 3) {
    if (accuracy >= 80 && avgErrors <= 1) {
      index += 1;
    } else if (accuracy < 50 || avgErrors >= 3) {
      index -= 1;
    }
  }

  return DIFFICULTIES[Math.min(Math.max(index, 0), DIFFICULTIES.length - 1)];
};

const loadProfile = async (client, userId, spec, slug) => {
  const [topic, puzzle] = await Promise.all([
    client
      .from('user_topic_performance')
      .select('attempts, correct_attempts, wrong_attempts, accuracy, estimated_skill_level')
      .eq('user_id', userId)
      .eq('topic', spec.topic)
      .maybeSingle(),
    client.from('puzzles').select('id, level_id').eq('slug', slug).maybeSingle()
  ]);

  let recent = [];

  if (puzzle.data) {
    const { data } = await client
      .from('puzzle_attempts')
      .select('is_correct, errors_count, time_spent_seconds')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzle.data.id)
      .order('created_at', { ascending: false })
      .limit(RECENT_ATTEMPTS);
    recent = data ?? [];
  }

  const t = topic.data;
  const avg = (list, key) => (list.length ? list.reduce((n, a) => n + (a[key] ?? 0), 0) / list.length : 0);

  return {
    puzzleId: puzzle.data?.id ?? null,
    levelId: puzzle.data?.level_id ?? null,
    hasTopicRow: Boolean(t),
    current: t?.estimated_skill_level ?? 'easy',
    attempts: t?.attempts ?? 0,
    correct: t?.correct_attempts ?? 0,
    wrong: t?.wrong_attempts ?? 0,
    accuracy: Number(t?.accuracy ?? 0),
    recentCount: recent.length,
    avgErrors: Number(avg(recent, 'errors_count').toFixed(1)),
    avgSeconds: Math.round(avg(recent, 'time_spent_seconds'))
  };
};

// --- Prompt -----------------------------------------------------------------

const describeInputs = (inputs) => Object.entries(inputs).map(([name, def]) => {
  if (def.type === 'text') return `- ${name}: texto, um de ${def.values.map((v) => `"${v}"`).join(', ')}`;
  if (def.type === 'bool') return `- ${name}: true ou false`;
  const kind = def.type === 'int' ? 'inteiro' : 'número com casa decimal';
  return `- ${name}: ${kind} de ${def.min} a ${def.max}${def.unit ? ` (${def.unit})` : ''}`;
}).join('\n');

const describeOutputs = (outputs) => Object.entries(outputs)
  .map(([name, values]) => `- ${name}: ${values.map((v) => JSON.stringify(v)).join(' ou ')}`)
  .join('\n');

const buildPrompt = (spec, difficulty, profile, feedback, variety) => `
Você gera puzzles de lógica de programação para o Reprogrammed, um jogo educacional em português
para quem está aprendendo a programar. O jogador monta um programa arrastando BLOCOS para encaixes
e o jogo EXECUTA o programa contra casos de teste. Qualquer montagem que acerte todos os casos vale.

## A linguagem (recorte de Python em português)
- Estruturas: "se <condição> :", "senão se <condição> :", "senão :". O corpo vem 4 espaços mais recuado.
- Atribuição no corpo: "<nome> = <valor>".
- Comparações: == != > < >= <=. Conectivos: e, ou, não.
- Valores: inteiros (40), decimais (21.5), texto entre aspas duplas ("cacto"), true, false.
- "3" == 3 é false (tipos diferentes). Comparar texto com número usando < ou > é ERRO.

## Formato do programa
- "lines": as linhas do programa. Cada encaixe é escrito [nome], [op] ou [valor]; o resto é texto fixo.
- Texto fixo permitido: se, senão, :, =, e, ou, não e os nomes das variáveis da sala. NUNCA escreva um
  número, texto ou true/false fixo na linha: valores entram só por encaixe.
- No máximo ${6} linhas e 4 encaixes por linha.
- "blocks": TODAS as peças, as certas e as iscas, como texto: nome = nomes de variável, op = operadores
  ou conectivos, valor = literais ("40", "\\"cacto\\"", "true"). No máximo 12 peças no total.
  Para precisar de duas peças iguais, repita o rótulo.
- "tests": cada caso tem "label" (A, B, C...), "given" (as entradas) e "expect" (as saídas).

## A sala
${spec.setting}

O programa tem de ensinar: ${spec.concept}
${spec.rules?.length ? `\nO que precisa fazer sentido no mundo:\n${spec.rules.map((r) => `- ${r}`).join('\n')}` : ''}
${variety ? `\nPara este pedido, varie assim: ${variety}.` : ''}

Entradas (cada caso de teste vira um objeto no mapa com estes valores escritos nele):
${describeInputs(spec.inputs)}

Saídas que a sala sabe mostrar (só estas, só estes valores):
${describeOutputs(spec.outputs)}

${spec.requires?.length ? `O programa precisa usar: ${spec.requires.join(', ')}.` : ''}
${spec.forbids?.length ? `O programa NÃO pode usar: ${spec.forbids.join(', ')}.` : ''}
Casos de teste: de ${spec.tests[0]} a ${spec.tests[1]}.
${spec.defaults === false ? 'Não use "defaults": as saídas têm de ser escritas pelo programa nos dois caminhos.' : ''}

## O jogador
Dificuldade pedida: ${difficulty}.
${profile.attempts
    ? `Histórico em condicionais: ${profile.attempts} tentativas, ${profile.accuracy}% de acerto.`
    : 'Primeira vez com condicionais.'}
${profile.recentCount
    ? `Neste puzzle: ${profile.recentCount} tentativas recentes, média de ${profile.avgErrors} erros e ${profile.avgSeconds} s por tentativa.`
    : ''}
${DIFFICULTY_GUIDE[difficulty].map((l) => `- ${l}`).join('\n')}

## Regras de qualidade (o jogo confere e recusa o que não cumprir)
- Tem de existir pelo menos uma montagem certa, e uma montagem qualquer não pode passar.
- Todo LIMITE da regra aparece em um caso de teste com o valor exato, para que < e <= (ou > e >=)
  deem resultados diferentes. Inclua também os dois operadores vizinhos nas peças, como isca.
- Os casos precisam ter saídas diferentes entre si; varie as entradas que não importam.
- "title": curto, em MAIÚSCULAS, no estilo "SISTEMA // FUNÇÃO" (até 40 caracteres).
- "briefing": 1 a 3 linhas de até 60 caracteres, na voz da sala, descrevendo só o OBJETIVO. Não escreva
  a estrutura do código nem a ordem das peças, mas DIGA o número exato de cada limite (o jogador não
  tem outro lugar para descobrir que o limite é 35).
- "hint": começa com "monte:" e mostra a solução em uma linha, separando as linhas com " / ".
- "successMessage": curta, em MAIÚSCULAS.
- Escreva em português com acentos (água, não, irrigação).

## Exemplo (de outra sala, só para o formato)
${JSON.stringify(EXAMPLE)}
${feedback ? `\n## A sua tentativa anterior foi recusada\nProblemas encontrados ao executar:\n${feedback.map((p) => `- ${p}`).join('\n')}\nGere um puzzle novo que corrija isso.` : ''}
Responda só com o JSON do puzzle.
`.trim();

// Schema da resposta, montado da ficha: o modelo não consegue nem escrever uma
// entrada que a sala não tem.
const schemaType = (def) => {
  if (def.type === 'int') return { type: 'INTEGER' };
  if (def.type === 'float') return { type: 'NUMBER' };
  if (def.type === 'bool') return { type: 'BOOLEAN' };
  return { type: 'STRING', enum: def.values };
};

const outputType = (values) => (values.every((v) => typeof v === 'boolean')
  ? { type: 'BOOLEAN' }
  : { type: 'STRING', enum: values.map(String) });

const buildSchema = (spec) => {
  const inputNames = Object.keys(spec.inputs);
  const outputNames = Object.keys(spec.outputs);
  const strings = { type: 'ARRAY', items: { type: 'STRING' } };

  return {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      briefing: strings,
      hint: { type: 'STRING' },
      lines: strings,
      blocks: {
        type: 'OBJECT',
        properties: { nome: strings, op: strings, valor: strings },
        required: ['nome', 'op', 'valor']
      },
      tests: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            label: { type: 'STRING' },
            given: {
              type: 'OBJECT',
              properties: Object.fromEntries(inputNames.map((n) => [n, schemaType(spec.inputs[n])])),
              required: inputNames.filter((n) => spec.inputs[n].required)
            },
            expect: {
              type: 'OBJECT',
              properties: Object.fromEntries(outputNames.map((n) => [n, outputType(spec.outputs[n])])),
              required: outputNames
            }
          },
          required: ['label', 'given', 'expect']
        }
      },
      successMessage: { type: 'STRING' }
    },
    required: ['title', 'briefing', 'hint', 'lines', 'blocks', 'tests', 'successMessage']
  };
};

// --- Chamada ao Gemini --------------------------------------------------------

const callGemini = async (model, prompt, schema, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1,
          // Sem isso o 3.5-flash "pensa" por ~15 s antes de responder.
          thinkingConfig: { thinkingLevel: 'low' },
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      })
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { retryable: response.status === 503 || response.status === 429 || response.status >= 500, error: `HTTP ${response.status}` };
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

    try {
      return { puzzle: JSON.parse(text) };
    } catch {
      return { retryable: false, error: 'resposta não é JSON' };
    }
  } catch (error) {
    return { retryable: true, error: error.name === 'AbortError' ? 'tempo esgotado' : error.message };
  } finally {
    clearTimeout(timer);
  }
};

// O modelo não conta caracteres: o briefing é refeito em linhas de até 60. Se
// passar de 3 linhas, o conferidor recusa (não cabe no console).
const BRIEFING_WIDTH = 60;
const wrapLines = (text) => text.split(/\s+/).filter(Boolean).reduce((lines, word) => {
  const lastLine = lines[lines.length - 1];
  if (lastLine && `${lastLine} ${word}`.length <= BRIEFING_WIDTH) {
    lines[lines.length - 1] = `${lastLine} ${word}`;
  } else {
    lines.push(word);
  }
  return lines;
}, []);

// O que vem do modelo, já no formato do console. Converte o que o schema não
// consegue impedir (expect de texto que devia ser booleano) e põe a marca da IA.
const normalize = (raw, spec) => {
  const fixValue = (name, value) => {
    const allowed = spec.outputs[name];
    if (!allowed) return value;
    return allowed.find((v) => String(v) === String(value)) ?? value;
  };

  return {
    title: String(raw.title ?? '').trim().toUpperCase(),
    briefing: wrapLines((raw.briefing ?? []).map((l) => String(l).trim()).filter(Boolean).join(' ')),
    hint: String(raw.hint ?? '').trim(),
    lines: (raw.lines ?? []).map((l) => String(l).replace(/\s+$/, '')),
    blocks: {
      nome: raw.blocks?.nome ?? [],
      op: raw.blocks?.op ?? [],
      valor: raw.blocks?.valor ?? []
    },
    tests: (raw.tests ?? []).map((t, i) => ({
      label: String(t.label ?? 'ABCDEFGH'[i]).slice(0, 2),
      given: t.given ?? {},
      expect: Object.fromEntries(Object.entries(t.expect ?? {}).map(([k, v]) => [k, fixValue(k, v)]))
    })),
    successMessage: String(raw.successMessage ?? 'SISTEMA REPROGRAMADO').trim().toUpperCase(),
    source: 'ai'
  };
};

// --- Registro ------------------------------------------------------------------

const logGeneration = async (client, userId, entry) => {
  const { error } = await client.from('ai_analysis_logs').insert({
    user_id: userId,
    topic: entry.spec.topic,
    level_id: entry.profile.levelId,
    puzzle_id: entry.profile.puzzleId,
    previous_difficulty: entry.profile.current,
    suggested_difficulty: entry.difficulty,
    accuracy_snapshot: entry.profile.accuracy,
    attempts_snapshot: entry.profile.attempts,
    correct_attempts_snapshot: entry.profile.correct,
    wrong_attempts_snapshot: entry.profile.wrong,
    analysis_summary: entry.summary,
    generated_puzzle: entry.puzzle ?? null,
    model: entry.model ?? null,
    accepted: entry.accepted,
    problems: entry.problems?.length ? entry.problems.join(' | ') : null,
    latency_ms: entry.latencyMs
  });

  if (error) {
    console.warn('[ia] geração não registrada:', error.message);
  }
};

// O nível estimado volta para o perfil (monotônico: nunca passa pelo save).
const saveEstimate = async (client, userId, spec, profile, difficulty, summary) => {
  if (!profile.hasTopicRow) {
    return;
  }

  const { error } = await client
    .from('user_topic_performance')
    .update({
      estimated_skill_level: difficulty,
      last_ai_feedback: summary,
      last_ai_analysis_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('topic', spec.topic);

  if (error) {
    console.warn('[ia] nível estimado não gravado:', error.message);
  }
};

// --- Entrada ---------------------------------------------------------------------

export const generatePuzzle = async (userId, accessToken, slug) => {
  const spec = AI_SPECS[slug];

  if (!spec) {
    throw serviceError('Este puzzle não é gerado por IA.', 404);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw serviceError('GEMINI_API_KEY não configurada no servidor.', 503);
  }

  const client = createUserSupabaseClient(accessToken);
  const profile = await loadProfile(client, userId, spec, slug);
  const difficulty = estimateDifficulty(profile);
  const result = await runGeneration(spec, difficulty, profile);

  if (result.ok) {
    const summary = `Puzzle ${slug} gerado em ${difficulty} por ${result.model} (${result.solutions}/${result.total} montagens corretas). Variação: ${result.variety ?? '-'}. Tentativas: ${result.trace.join(' | ')}`;
    await Promise.all([
      logGeneration(client, userId, { ...result, spec, profile, difficulty, accepted: true, summary }),
      saveEstimate(client, userId, spec, profile, difficulty, summary)
    ]);
    return {
      puzzle: { ...result.puzzle, difficulty },
      difficulty,
      model: result.model,
      latencyMs: result.latencyMs
    };
  }

  const reason = result.error ?? result.problems.join('; ');
  await logGeneration(client, userId, {
    ...result, spec, profile, difficulty, accepted: false,
    problems: result.error ? [result.error] : result.problems,
    summary: `Puzzle ${slug} recusado: ${reason}`
  });

  throw serviceError('A IA não gerou um puzzle válido a tempo.', 502, { reason });
};

// Pede, confere e, se reprovado, pede de novo com o motivo. Sem banco: é o
// pedaço que dá para exercitar no terminal (ver tools/ia_teste.mjs).
export const runGeneration = async (spec, difficulty, profile) => {
  const schema = buildSchema(spec);
  const models = [...new Set([process.env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean))];
  const started = Date.now();
  let feedback = null;
  let modelIndex = 0;
  let last = { problems: [], error: null, puzzle: null, model: null };
  const variety = spec.variety?.length ? spec.variety[Math.floor(Math.random() * spec.variety.length)] : null;
  const trace = [];

  for (let call = 0; call < MAX_CALLS && Date.now() - started < DEADLINE_MS; call += 1) {
    const model = models[Math.min(modelIndex, models.length - 1)];
    const result = await callGemini(model, buildPrompt(spec, difficulty, profile, feedback, variety), schema,
      call === 0 ? FIRST_CALL_TIMEOUT_MS : CALL_TIMEOUT_MS);

    if (!result.puzzle) {
      last = { ...last, error: result.error, model };
      trace.push(`${model}: ${result.error}`);
      // Modelo ocupado ou fora do ar: tenta o próximo da lista.
      if (result.retryable) modelIndex += 1;
      continue;
    }

    const puzzle = normalize(result.puzzle, spec);
    const check = checkPuzzle(puzzle, spec);
    last = { problems: check.problems, error: null, puzzle, model };
    trace.push(`${model}: ${check.ok ? 'aceito' : check.problems.join('; ')}`);

    if (check.ok) {
      return { ok: true, puzzle, model, solutions: check.solutions, total: check.total, calls: call + 1, trace, variety, latencyMs: Date.now() - started };
    }

    // Reprovado na execução: o motivo volta no próximo pedido.
    feedback = check.problems;
  }

  return { ok: false, ...last, trace, variety, latencyMs: Date.now() - started };
};
