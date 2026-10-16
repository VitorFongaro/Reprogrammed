import Effects from "../ui/Effects";
import Sfx from "../ui/Sfx";
import { makeCrate, flashCrate } from "./crates";

// PUZZLE DE MUNDO (cap. 2): um bloco de ESTANTES com um corredor no meio,
// travado por caixas. Encostado em cada caixa há um vão VAZIO na estante, em
// cima ou embaixo; o programa do jogador diz para que lado o pistão empurra
// cada uma. Para o lado do vão, ela entra na estante e sai do caminho; para o
// lado da estante cheia, bate e fica. O corredor só abre quando TODAS saem — e
// ninguém precisa dizer ao jogador que errou: ele vê qual caixa ficou.
//
// Cada caixa é um caso de teste (`tests[i]`): `given` vai escrito nela e
// `expect[field]` é o lado do vão dela. O mapa é GERADO a partir dos testes
// (os testes podem vir da IA, então não dá para desenhar isto no fundo): o que
// o jogador vê e o que o jogo confere nunca discordam.
// Liga-se a um PuzzleDevice com `onRun: (results, done) => corredor.play(...)`.
//
// Arte: os vãos de estante são props do Aseprite (tools/deposito_props.lua),
// repetidos em grade — uma coluna por caixa, fileiras até as paredes da sala.

const CELL = 76;               // largura de uma coluna = um vão de estante (estante_*.png)
const BAY_H = 58;              // altura de um vão
const ROW_STEP = 57;           // fileiras sobrepostas 1 px: o contorno não dobra
const CRATE = 52;
const FULL_BAYS = ["estante_caixas", "estante_barris", "estante_sacos"];
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
        const niches = tests.map((test) => test.expect[field]);
        this.drawRacks(b, niches);
        scene.addColliders([
            { x: this.x0, y: b.y, w: this.x1 - this.x0, h: this.top - b.y },
            { x: this.x0, y: this.bottom, w: this.x1 - this.x0, h: b.y + b.h - this.bottom }
        ]);

        this.crates = tests.map((test, i) => {
            const cx = this.x0 + CELL * i + CELL / 2;
            const niche = niches[i];
            const dir = SIDES[niche];
            const box = makeCrate(scene, cx, y, {
                size: CRATE, kind: "madeira", letter: test.label ?? "", label: labelOf(test.given)
            }).setDepth(y + CRATE / 2);
            // O colisor ocupa a célula INTEIRA (não só a caixa): sem folga entre
            // caixas nem entre caixa e estante para a Artemis passar espremida.
            const [collider] = scene.addColliders([{ x: this.x0 + CELL * i, y: this.top, w: CELL, h: height }]);
            return {
                box, collider, niche, homeY: y,
                clearY: y + dir * (height / 2 + ROW_STEP / 2),
                cleared: false
            };
        });
    }

    // Grade de estantes dos dois lados do corredor. A fileira encostada no
    // corredor tem, em cada coluna, o vão vazio do lado do nicho daquela caixa.
    // Profundidade = base de cada vão (y-sort, como os props do Tiled); o vão
    // vazio fica atrás de tudo, para a caixa que entra nele aparecer.
    drawRacks(b, niches) {
        const s = this.scene;
        const place = (col, bottomY, row, side) => {
            const empty = row === 0 && niches[col] === side;
            const mix = col * 7 + row * 5 + col * row + (side === "cima" ? 1 : 0);
            const key = empty ? "estante_vazia" : FULL_BAYS[mix % FULL_BAYS.length];
            s.add.image(this.x0 + col * CELL + CELL / 2, bottomY, `prop-${key}`)
                .setOrigin(0.5, 1)
                .setDepth(empty ? bottomY - BAY_H : bottomY);
        };
        for (let col = 0; col < niches.length; col += 1) {
            for (let row = 0, bottomY = this.top; bottomY - BAY_H >= b.y - 6; row += 1, bottomY -= ROW_STEP) {
                place(col, bottomY, row, "cima");
            }
            for (let row = 0, topY = this.bottom; topY + BAY_H <= b.y + b.h + 20; row += 1, topY += ROW_STEP) {
                place(col, topY + BAY_H, row, "baixo");
            }
        }
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
                    this.clear(crate);
                    Sfx.play(s, "bump", 0.35);
                    next();
                }
            });
            return;
        }
        // Lado da estante cheia: encosta, bate (faísca + tranco) e volta para o
        // meio do caminho. É ESTA caixa parada que conta ao jogador o que deu errado.
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

    clear(crate) {
        crate.cleared = true;
        crate.collider.body.enable = false;
        crate.box.setDepth(crate.clearY + CRATE / 2);
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

    // Save com o corredor já resolvido: cada caixa já guardada no seu vão.
    showSolved() {
        this.crates.forEach((crate) => {
            crate.box.y = crate.clearY;
            this.clear(crate);
        });
    }
}
