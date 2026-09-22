// Interpretador MÍNIMO dos puzzles de condicional (capítulo 2). O jogador monta
// o programa em blocos e o jogo EXECUTA de verdade contra vários casos de teste,
// em vez de comparar com uma resposta decorada: `cracha >= 3` e `cracha > 2`
// valem igual, porque o que importa é o comportamento.
//
// A linguagem é um recorte de Python em português, só o que os puzzles usam:
//
//   se <condição> :          senão se <condição> :          senão :
//       <nome> = <expressão>     (corpo indentado, 4 espaços = 1 nível)
//
// Condição/expressão: números, true/false, "texto", nomes de variável,
// + - * /, comparações (== != > < >= <=) e os conectivos `e` / `ou` / `não`.
//
// Semântica escolhida para ENSINAR (e bater com Python):
//   - `"3" == 3` é false (tipos diferentes nunca são iguais);
//   - `"3" > 2` é ERRO (não dá para ordenar texto com número);
//   - a condição do `se` precisa dar true ou false;
//   - `=` guarda, `==` compara: trocar um pelo outro é erro com explicação.
//
// Puro (sem Phaser), então dá para testar no Node. Erros sobem como
// CondError, com mensagem pronta para mostrar ao jogador.

export class CondError extends Error {}

const INDENT = 4;
const COMPARISON = ["==", "!=", ">", "<", ">=", "<="];
const STRING_RE = /^"[^"]*"$|^'[^']*'$/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const NAME_RE = /^[A-Za-z_À-ú][\wÀ-ú]*$/;

// Linha do template ("    [nome] = [valor]") -> { indent, tokens[] }. Cada token
// é texto fixo ("se", ":", "porta") ou um encaixe { category } (de "[nome]").
export function parseTemplateLine(line) {
    const spaces = line.length - line.trimStart().length;
    const tokens = line.trim().split(/\s+/).filter(Boolean).map((word) => {
        const slot = /^\[(\w+)\]$/.exec(word);
        return slot ? { category: slot[1] } : word;
    });
    return { indent: Math.floor(spaces / INDENT), tokens };
}

// --- Execução ---------------------------------------------------------------
// `lines` = [{ indent, tokens: string[] }] (encaixes já preenchidos). Devolve o
// ambiente final. Lança CondError em programa inválido.
export function run(lines, env) {
    const scope = { ...env };
    execBlock(structure(lines), scope);
    return scope;
}

// Agrupa as linhas por indentação: cada cabeçalho (se/senão se/senão) leva as
// linhas mais indentadas logo abaixo como corpo; senão/senão se se prendem ao
// `se` anterior do mesmo nível.
function structure(lines) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const body = [];
        let j = i + 1;
        while (j < lines.length && lines[j].indent > line.indent) {
            body.push(lines[j]);
            j += 1;
        }
        const kind = headerKind(line.tokens);
        if (kind === "if") {
            out.push({ type: "if", branches: [{ cond: conditionTokens(line.tokens, 1), body: structure(body) }] });
        } else if (kind === "elif" || kind === "else") {
            const prev = out[out.length - 1];
            if (!prev || prev.type !== "if" || prev.closed) {
                throw new CondError(`"${kind === "else" ? "senão" : "senão se"}" precisa vir logo depois de um "se"`);
            }
            prev.branches.push({
                cond: kind === "elif" ? conditionTokens(line.tokens, 2) : null,
                body: structure(body)
            });
            if (kind === "else") prev.closed = true;
        } else {
            if (body.length) {
                throw new CondError("só o que está dentro de um se/senão fica recuado");
            }
            out.push({ type: "assign", tokens: line.tokens });
        }
        i = j;
    }
    return out;
}

function headerKind(tokens) {
    if (tokens[0] === "se") return "if";
    if (tokens[0] === "senão" && tokens[1] === "se") return "elif";
    if (tokens[0] === "senão") return "else";
    return null;
}

// Tira a palavra-chave do começo e os ":" do fim.
function conditionTokens(tokens, skip) {
    const rest = tokens.slice(skip);
    if (rest[rest.length - 1] === ":") rest.pop();
    if (!rest.length) throw new CondError("falta a condição do se");
    return rest;
}

function execBlock(statements, scope) {
    statements.forEach((st) => {
        if (st.type === "assign") {
            assign(st.tokens, scope);
            return;
        }
        for (const branch of st.branches) {
            if (branch.cond === null) {
                execBlock(branch.body, scope);
                return;
            }
            const value = evaluate(branch.cond, scope);
            if (typeof value !== "boolean") {
                throw new CondError("a condição do se precisa dar true ou false");
            }
            if (value) {
                execBlock(branch.body, scope);
                return;
            }
        }
    });
}

function assign(tokens, scope) {
    const [name, op, ...expr] = tokens;
    if (op === "==") {
        throw new CondError("para GUARDAR um valor use =  (o == só compara)");
    }
    if (op !== "=" || !NAME_RE.test(name ?? "") || !expr.length) {
        throw new CondError("uma atribuição tem a forma  nome = valor");
    }
    scope[name] = evaluate(expr, scope);
}

// --- Expressões (descida recursiva) --------------------------------------------
// ou < e < não < comparação < + - < * / < átomo
export function evaluate(tokens, scope) {
    const p = { tokens, i: 0, scope };
    const value = parseOr(p);
    if (p.i < tokens.length) {
        throw new CondError(`sobrou "${tokens[p.i]}" na condição`);
    }
    return value;
}

function peek(p) { return p.tokens[p.i]; }

function parseOr(p) {
    let left = parseAnd(p);
    while (peek(p) === "ou") {
        p.i += 1;
        const right = parseAnd(p);
        left = requireBool(left, "ou") || requireBool(right, "ou");
    }
    return left;
}

function parseAnd(p) {
    let left = parseNot(p);
    while (peek(p) === "e") {
        p.i += 1;
        const right = parseNot(p);
        left = requireBool(left, "e") && requireBool(right, "e");
    }
    return left;
}

function parseNot(p) {
    if (peek(p) === "não") {
        p.i += 1;
        return !requireBool(parseNot(p), "não");
    }
    return parseComparison(p);
}

function parseComparison(p) {
    const left = parseAdditive(p);
    const op = peek(p);
    if (op === "=") {
        throw new CondError("para COMPARAR use ==  (o = guarda um valor)");
    }
    if (!COMPARISON.includes(op)) {
        return left;
    }
    p.i += 1;
    const right = parseAdditive(p);
    return compare(left, op, right);
}

function parseAdditive(p) {
    let left = parseMultiplicative(p);
    while (peek(p) === "+" || peek(p) === "-") {
        const op = p.tokens[p.i++];
        const right = parseMultiplicative(p);
        left = arith(left, op, right);
    }
    return left;
}

function parseMultiplicative(p) {
    let left = parseAtom(p);
    while (peek(p) === "*" || peek(p) === "/") {
        const op = p.tokens[p.i++];
        const right = parseAtom(p);
        left = arith(left, op, right);
    }
    return left;
}

function parseAtom(p) {
    const tok = peek(p);
    if (tok === undefined) {
        throw new CondError("a condição está incompleta");
    }
    p.i += 1;
    if (tok === "true") return true;
    if (tok === "false") return false;
    if (NUMBER_RE.test(tok)) return Number(tok);
    if (STRING_RE.test(tok)) return tok.slice(1, -1);
    if (NAME_RE.test(tok)) {
        if (!(tok in p.scope)) {
            throw new CondError(`a variável "${tok}" não existe aqui`);
        }
        return p.scope[tok];
    }
    throw new CondError(`"${tok}" está fora do lugar`);
}

function requireBool(value, op) {
    if (typeof value !== "boolean") {
        throw new CondError(`"${op}" só junta condições (true/false)`);
    }
    return value;
}

function arith(a, op, b) {
    if (typeof a !== "number" || typeof b !== "number") {
        throw new CondError(`"${op}" só funciona com números`);
    }
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (b === 0) throw new CondError("divisão por zero");
    return a / b;
}

function compare(a, op, b) {
    if (op === "==") return a === b;
    if (op === "!=") return a !== b;
    if (typeof a !== "number" || typeof b !== "number") {
        const texto = typeof a === "string" || typeof b === "string";
        throw new CondError(texto
            ? `não dá para usar ${op} entre texto e número`
            : `${op} só compara números`);
    }
    if (op === ">") return a > b;
    if (op === "<") return a < b;
    if (op === ">=") return a >= b;
    return a <= b;
}

// --- Casos de teste -------------------------------------------------------------
// Roda o programa em cada caso: ambiente = defaults + given; passa se TODAS as
// variáveis de `expect` baterem. Devolve [{ pass, got, error }].
export function runTests(lines, tests, defaults = {}) {
    return tests.map((test) => {
        try {
            const scope = run(lines, { ...defaults, ...test.given });
            const got = {};
            Object.keys(test.expect).forEach((k) => { got[k] = scope[k]; });
            const pass = Object.entries(test.expect).every(([k, v]) => scope[k] === v);
            return { pass, got, error: null };
        } catch (err) {
            if (err instanceof CondError) {
                return { pass: false, got: null, error: err.message };
            }
            throw err;
        }
    });
}

// Valor -> literal como o jogador o vê nos blocos ("texto" com aspas).
export function formatValue(value) {
    if (typeof value === "string") return `"${value}"`;
    if (value === undefined) return "?";
    return String(value);
}
