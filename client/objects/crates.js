// Caixa desenhada no código, para os puzzles de MUNDO do cap. 2 (CrateCorridor,
// CrateBridge). Sem arte de pack: a caixa precisa mostrar as variáveis dela
// escritas em cima — é assim que o jogador lê o caso de teste olhando o mapa.
//
// `kind`: "madeira" (caixote comum), "aco" (cinza com rebites) ou "papelao"
// (pardo com fita) — no puzzle da ponte o material É uma das variáveis, então
// aço e papelão precisam ser inconfundíveis de longe.
// `letter` vai no canto (casa com a lista do console), `label` no meio e `tag`
// embaixo. O container devolvido tem `.flash`, um retângulo vermelho com alpha
// 0 por cima de tudo, para piscar a caixa (Graphics não aceita tint).

const LOOKS = {
    madeira: { body: 0x7a5a32, top: 0x94703f, detail: 0x5c4224 },
    aco: { body: 0x4b5566, top: 0x6b7688, detail: 0x9aa4b4 },
    papelao: { body: 0x8a6636, top: 0xa47c46, detail: 0xc9ae78 }
};

export function makeCrate(scene, x, y, { size = 60, kind = "madeira", letter = "", label = "", tag = "" } = {}) {
    const look = LOOKS[kind] ?? LOOKS.madeira;
    const half = size / 2;
    const g = scene.add.graphics();

    g.fillStyle(look.body, 1).fillRect(-half, -half, size, size);
    g.fillStyle(look.top, 1).fillRect(-half, -half, size, 6);   // aresta de cima (3/4)
    if (kind === "aco") {
        g.lineStyle(2, 0x2a303c, 1).strokeRect(-half + 5, -half + 10, size - 10, size - 15);
        g.fillStyle(look.detail, 1);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            g.fillRect(sx * (half - 9) - 2, sy * (half - 9), 4, 4);
        });
    } else if (kind === "papelao") {
        g.fillStyle(look.detail, 1).fillRect(-5, -half, 10, size);   // fita
    } else {
        g.lineStyle(2, look.detail, 1);                                  // tábuas
        g.lineBetween(-half, -half / 3, half, -half / 3);
        g.lineBetween(-half, half / 3, half, half / 3);
    }
    g.lineStyle(2, 0x07080c, 1).strokeRect(-half, -half, size, size);

    const parts = [g];
    const text = (content, px, dx, dy, color, origin = 0.5) => {
        const t = scene.add.text(dx, dy, content, {
            fontFamily: "VCR", fontSize: `${px}px`, color,
            stroke: "#07080c", strokeThickness: 3
        }).setOrigin(origin);
        parts.push(t);
    };
    if (letter) text(letter, 13, -half + 4, -half + 8, "#4ad6ff", 0);
    if (label) text(label, 14, 0, tag ? -3 : 3, "#ffffff");
    if (tag) text(tag, 12, 0, label ? 13 : 5, "#f2e6c8");

    const flash = scene.add.rectangle(0, 0, size, size, 0xff4545, 1).setAlpha(0);
    parts.push(flash);

    const box = scene.add.container(x, y, parts);
    box.flash = flash;
    return box;
}

// Pisca a caixa em vermelho (bateu na parede, afundou...). Diegético: é a caixa
// que mostra o problema, não um texto.
export function flashCrate(scene, box) {
    scene.tweens.killTweensOf(box.flash);
    box.flash.setAlpha(0.7);
    scene.tweens.add({ targets: box.flash, alpha: 0, duration: 420, ease: "Quad.easeOut" });
}
