import Phaser from "phaser";
import Sfx from "../ui/Sfx";

// PUZZLE DE MUNDO do jardim de inverno (cap. 2): uma fileira de CANTEIROS
// encostada no vidro. Cada canteiro é um caso de teste do puzzle de irrigação —
// e o puzzle vem da IA (data/aiSpecs.js), então quantos canteiros existem, que
// planta tem em cada um e quanta umidade a terra tem são decididos na hora,
// para este jogador. O mapa é GERADO a partir dos `tests`: o que se vê e o que
// o jogo confere não têm como discordar.
//
// Ao rodar, o bico de cada canteiro abre ou não conforme o `regar` que o
// programa do jogador calculou, e a planta mostra o resultado:
//   - regou e precisava (ou não regou e não precisava): planta saudável;
//   - não regou e precisava: SECA;
//   - regou sem precisar: ENCHARCADA, com poça.
// Errou um, o jardim volta ao normal e todos são testados de novo na próxima
// (mesmo motivo do CrateCorridor: senão dava para acertar um por vez).
// Liga-se a um PuzzleDevice com `onRun: (results, done) => beds.play(...)`.

const BED_W = 104;              // canteiro.png em 2x
const BED_H = 48;
const SPACING = 136;
const PIPE_TOP = 116;           // cano principal pintado no vidro (jardim_bg.py)
const START_MS = 250;
const STAGGER_MS = 420;         // um de cada vez: dá para ver QUAL canteiro errou
const SPRAY_MS = 520;
const RESULT_HOLD_MS = 1300;
const PLAQUE_COLOR = { ok: "#51e36b", bad: "#ff4545", idle: "#c8d2e6" };

export default class GardenBeds {
    // `cx` = centro da fileira; `baseY` = base dos canteiros (tela).
    constructor(scene, { cx, baseY, tests, field = "regar" }) {
        this.scene = scene;
        this.field = field;
        this.baseY = baseY;

        const pipes = scene.add.graphics().setDepth(-3);
        const x0 = cx - ((tests.length - 1) * SPACING) / 2;

        this.beds = tests.map((test, i) => {
            const x = x0 + i * SPACING;
            const top = baseY - BED_H;
            const plantName = test.given.planta ?? "samambaia";

            // cano de descida até o bico, em cima da planta
            const nozzleY = top - 46;
            pipes.fillStyle(0x281a12, 1).fillRect(x - 3, PIPE_TOP, 6, nozzleY - PIPE_TOP);
            pipes.fillStyle(0xc47c4a, 1).fillRect(x - 2, PIPE_TOP, 2, nozzleY - PIPE_TOP);
            pipes.fillStyle(0x8c5230, 1).fillRect(x, PIPE_TOP, 2, nozzleY - PIPE_TOP);
            const nozzle = scene.add.image(x, nozzleY, "prop-bico_irrigacao").setOrigin(0.5, 0).setDepth(top - 1);

            scene.add.image(x, baseY, "prop-canteiro").setOrigin(0.5, 1).setDepth(baseY);
            const plant = scene.add.image(x, top + 14, this.plantKey(plantName, "ok"))
                .setOrigin(0.5, 1).setDepth(baseY + 1);

            // Plaquinha na frente: a letra do caso (a mesma da coluna do console)
            // e o que o sensor está lendo.
            const plaque = scene.add.text(x, baseY + 12, `${test.label ?? ""}  ${test.given.umidade}%`, {
                fontFamily: "VCR", fontSize: "16px", color: PLAQUE_COLOR.idle,
                backgroundColor: "#0a0c12", padding: { x: 6, y: 2 }
            }).setOrigin(0.5, 0).setDepth(baseY + 2);

            const [collider] = scene.addColliders([{ x: x - BED_W / 2 + 4, y: top + 10, w: BED_W - 8, h: BED_H - 12 }]);
            return { x, top, nozzle, plant, plaque, plantName, expect: test.expect[field], collider };
        });
    }

    plantKey(name, state) {
        return `prop-planta_${name}_${state}`;
    }

    // Executa o programa no mapa: um canteiro de cada vez, na ordem dos testes.
    play(results, done) {
        let settled = 0;
        this.beds.forEach((bed, i) => {
            this.scene.time.delayedCall(START_MS + i * STAGGER_MS, () => {
                this.water(bed, results[i]?.got?.[this.field], () => {
                    settled += 1;
                    if (settled === this.beds.length) {
                        this.finish(done);
                    }
                });
            });
        });
    }

    water(bed, value, next) {
        const s = this.scene;
        const watered = value === true;
        // Valor que não é true/false (texto, número): a válvula não entende e
        // não abre — para a planta, é igual a não regar.
        const right = watered === bed.expect;
        bed.right = right;

        const settle = () => {
            const state = right ? "ok" : (watered ? "encharcada" : "seca");
            bed.plant.setTexture(this.plantKey(bed.plantName, state));
            bed.plaque.setColor(right ? PLAQUE_COLOR.ok : PLAQUE_COLOR.bad);
            s.tweens.add({ targets: bed.plant, scaleY: { from: 0.85, to: 1 }, duration: 180, ease: "Back.easeOut" });
            Sfx.play(s, right ? "select" : "error", 0.5);
            next();
        };

        if (!watered) {
            // Bico fechado: um tremidinho para mostrar que ele foi consultado.
            s.tweens.add({ targets: bed.nozzle, x: bed.x + 2, duration: 50, yoyo: true, repeat: 2, onComplete: settle });
            return;
        }
        this.spray(bed, settle);
    }

    // Jato do aspersor: gotas caindo do bico até a terra.
    spray(bed, onDone) {
        const s = this.scene;
        const from = bed.nozzle.y + 14;
        const to = bed.top + 10;
        for (let k = 0; k < 14; k += 1) {
            const drop = s.add.rectangle(bed.x + Phaser.Math.Between(-6, 6), from, 2, 4, 0x82beec)
                .setDepth(bed.top + 5);
            s.tweens.add({
                targets: drop,
                x: drop.x + Phaser.Math.Between(-22, 22),
                y: to + Phaser.Math.Between(-2, 6),
                delay: k * (SPRAY_MS / 18),
                duration: 260,
                ease: "Quad.easeIn",
                onComplete: () => drop.destroy()
            });
        }
        s.time.delayedCall(SPRAY_MS, onDone);
    }

    finish(done) {
        if (this.beds.every((bed) => bed.right)) {
            done(true);
            return;
        }
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => {
            this.beds.forEach((bed) => {
                bed.plant.setTexture(this.plantKey(bed.plantName, "ok"));
                bed.plaque.setColor(PLAQUE_COLOR.idle);
            });
            done(false);
        });
    }

    // Save com o puzzle resolvido: o jardim já está no ponto.
    showSolved() {
        this.beds.forEach((bed) => bed.plaque.setColor(PLAQUE_COLOR.ok));
    }
}
