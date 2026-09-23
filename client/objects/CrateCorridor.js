import Effects from "../ui/Effects";
import Sfx from "../ui/Sfx";
import { makeCrate, flashCrate } from "./crates";

// PUZZLE DE MUNDO (cap. 2): uma parede com um corredor travado por caixas. Cada
// caixa tem um NICHO na parede, em cima ou embaixo; o programa do jogador diz
// para que lado cada uma vai. Para o lado do nicho, ela sai do caminho; para o
// lado da parede, bate e fica. O corredor só abre quando TODAS saem — e ninguém
// precisa dizer ao jogador que errou: ele vê qual caixa ficou.
//
// Cada caixa é um caso de teste (`tests[i]`): `given` vai escrito nela e
// `expect[field]` é o lado do nicho dela. O mapa é GERADO a partir dos testes,
// então o que o jogador vê e o que o jogo confere nunca discordam.
// Liga-se a um PuzzleDevice com `onRun: (results, done) => corredor.play(...)`.

const CELL = 76;               // largura de cada célula do corredor
const CRATE = 60;
const NICHE_W = 68;
const NICHE_DEPTH = 72;
const START_MS = 250;          // respiro entre o console fechar e a 1ª caixa andar
const STAGGER_MS = 380;        // uma caixa de cada vez: dá para ver QUAL travou
const SLIDE_MS = 300;
const RESULT_HOLD_MS = 1100;   // o resultado errado fica à vista antes de desfazer
const RESET_MS = 260;
const SIDES = { cima: -1, baixo: 1 };

export default class CrateCorridor {
    constructor(scene, { x0, y, height = 80, tests, field, labelOf }) {
        this.scene = scene;
        this.field = field;
        this.height = height;
        this.x0 = x0;
        this.x1 = x0 + CELL * tests.length;
        this.top = y - height / 2;
        this.bottom = y + height / 2;

        const b = scene.bounds;
        this.drawWalls(b);
        scene.addColliders([
            { x: this.x0, y: b.y, w: this.x1 - this.x0, h: this.top - b.y },
            { x: this.x0, y: this.bottom, w: this.x1 - this.x0, h: b.y + b.h - this.bottom }
        ]);

        const niches = scene.add.graphics().setDepth(-4);
        this.crates = tests.map((test, i) => {
            const cx = this.x0 + CELL * i + CELL / 2;
            const niche = test.expect[field];
            const dir = SIDES[niche];
            this.drawNiche(niches, cx, dir);

            const box = makeCrate(scene, cx, y, {
                size: CRATE, kind: "madeira", letter: test.label ?? "", label: labelOf(test.given)
            }).setDepth(y + CRATE / 2);
            // O colisor ocupa a célula INTEIRA (não só a caixa): sem folga entre
            // caixas nem entre caixa e parede para a Artemis passar espremida.
            const [collider] = scene.addColliders([{ x: this.x0 + CELL * i, y: this.top, w: CELL, h: height }]);
            return {
                box, collider, niche, homeY: y,
                clearY: y + dir * (height / 2 + NICHE_DEPTH / 2),
                cleared: false
            };
        });
    }

    drawWalls(b) {
        const g = this.scene.add.graphics().setDepth(-5);
        const w = this.x1 - this.x0;
        [[b.y, this.top], [this.bottom, b.y + b.h]].forEach(([y0, y1]) => {
            g.fillStyle(0x11131b, 1).fillRect(this.x0, y0, w, y1 - y0);
            g.lineStyle(1, 0x1c2030, 1);
            for (let x = this.x0 + CELL / 2; x < this.x1; x += CELL / 2) {
                g.lineBetween(x, y0, x, y1);             // chapas da parede
            }
            g.lineStyle(2, 0x3a3f55, 1).strokeRect(this.x0, y0, w, y1 - y0);
        });
        // Faixa de perigo nas duas bordas do corredor (os nichos cobrem por cima).
        g.fillStyle(0xffb347, 0.8);
        for (let x = this.x0; x < this.x1; x += 16) {
            g.fillRect(x, this.top - 4, 8, 4);
            g.fillRect(x, this.bottom, 8, 4);
        }
    }

    // Nicho = recuo escuro na parede, aberto para o corredor, com uma seta
    // apontando para dentro dele.
    drawNiche(g, cx, dir) {
        const ny = dir < 0 ? this.top - NICHE_DEPTH : this.bottom;
        const cy = ny + NICHE_DEPTH / 2;
        g.fillStyle(0x06070a, 1).fillRect(cx - NICHE_W / 2, ny, NICHE_W, NICHE_DEPTH);
        g.lineStyle(2, 0x2a2f45, 1).strokeRect(cx - NICHE_W / 2, ny, NICHE_W, NICHE_DEPTH);
        g.lineStyle(2, 0x3a3f55, 1);
        g.lineBetween(cx, cy + dir * 8, cx - 10, cy - dir * 4);
        g.lineBetween(cx, cy + dir * 8, cx + 10, cy - dir * 4);
    }

    // Executa o programa no mapa: uma caixa de cada vez, na ordem dos testes.
    play(results, done) {
        let settled = 0;
        this.crates.forEach((crate, i) => {
            this.scene.time.delayedCall(START_MS + i * STAGGER_MS, () => {
                this.push(crate, results[i]?.got?.[this.field], () => {
                    settled += 1;
                    if (settled === this.crates.length) {
                        this.finish(done);
                    }
                });
            });
        });
    }

    push(crate, side, next) {
        const dir = SIDES[side];
        if (!dir) {
            this.jam(crate, next);               // lado que o pistão não entende
            return;
        }
        const s = this.scene;
        if (side === crate.niche) {
            s.tweens.add({
                targets: crate.box, y: crate.clearY, duration: SLIDE_MS, ease: "Back.easeOut",
                onComplete: () => {
                    crate.cleared = true;
                    crate.collider.body.enable = false;
                    crate.box.setDepth(crate.clearY + CRATE / 2);
                    Sfx.play(s, "bump", 0.35);
                    next();
                }
            });
            return;
        }
        // Lado da parede: encosta, bate (faísca + tranco) e volta para o meio do
        // caminho. É ESTA caixa parada que conta ao jogador o que deu errado.
        const hitY = crate.homeY + dir * (this.height / 2 - CRATE / 2);
        s.tweens.add({
            targets: crate.box, y: hitY, duration: 110, ease: "Quad.easeIn",
            onComplete: () => {
                Sfx.play(s, "bump", 0.8);
                Effects.play(s, "fx-spark", crate.box.x, crate.homeY + dir * this.height / 2, {
                    scale: 0.35, depth: 700
                });
                flashCrate(s, crate.box);
                s.cameras.main.shake(120, 0.004);
                s.tweens.add({
                    targets: crate.box, y: crate.homeY, duration: 170, ease: "Quad.easeOut",
                    onComplete: next
                });
            }
        });
    }

    jam(crate, next) {
        flashCrate(this.scene, crate.box);
        this.scene.tweens.add({
            targets: crate.box, x: crate.box.x + 4, duration: 50, yoyo: true, repeat: 3,
            onComplete: next
        });
    }

    finish(done) {
        if (this.crates.every((crate) => crate.cleared)) {
            done(true);
            return;
        }
        // Errou: o resultado fica à vista um instante e o pistão desfaz TUDO,
        // para a próxima tentativa testar todas as caixas de novo — senão dava
        // para acertar uma caixa por vez com regras diferentes.
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => this.reset(done));
    }

    reset(done) {
        this.crates.forEach((crate) => {
            crate.cleared = false;
            crate.collider.body.enable = true;
            crate.box.setDepth(crate.homeY + CRATE / 2);
            this.scene.tweens.add({
                targets: crate.box, y: crate.homeY, duration: RESET_MS, ease: "Quad.easeInOut"
            });
        });
        this.scene.time.delayedCall(RESET_MS, () => done(false));
    }
}
