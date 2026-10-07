// Exercita o gerador de puzzles por IA no terminal, SEM banco e sem login:
// pede ao Gemini, confere no interpretador do jogo e mostra o que saiu.
//
//   cd server && node ../tools/ia_teste.mjs [slug] [easy|medium|hard] [vezes]
//
// Lê o GEMINI_API_KEY do .env da raiz (via server/config/supabase.js).
import { runGeneration } from '../server/services/aiService.js';
import { AI_SPECS } from '../client/data/aiSpecs.js';

const [slug = 'jardim-irrigacao', difficulty = 'easy', times = '1'] = process.argv.slice(2);
const spec = AI_SPECS[slug];
if (!spec) {
  console.error(`ficha desconhecida: ${slug} (há: ${Object.keys(AI_SPECS).join(', ')})`);
  process.exit(1);
}

const profile = { attempts: 0, accuracy: 0, recentCount: 0, avgErrors: 0, avgSeconds: 0 };
for (let i = 0; i < Number(times); i += 1) {
  const r = await runGeneration(spec, difficulty, profile);
  console.log(`\n=== ${slug} / ${difficulty} :: ${r.ok ? 'ACEITO' : 'RECUSADO'} em ${r.latencyMs} ms, ${r.model}${r.calls ? `, ${r.calls} chamada(s)` : ''}`);
  console.log('variação:', r.variety);
  console.log('tentativas:', r.trace.join(' | '));
  if (!r.ok) console.log('motivo:', r.error ?? r.problems);
  if (r.puzzle) {
    const p = r.puzzle;
    console.log(p.title, '\n ', p.briefing.join('\n  '));
    console.log(p.lines.map((l) => `  | ${l}`).join('\n'));
    console.log('  peças:', JSON.stringify(p.blocks));
    p.tests.forEach((t) => console.log(`  ${t.label}: ${JSON.stringify(t.given)} -> ${JSON.stringify(t.expect)}`));
    console.log('  dica:', p.hint);
    if (r.ok) console.log(`  ${r.solutions}/${r.total} montagens corretas`);
  }
}
