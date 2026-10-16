import Sfx from "../ui/Sfx";

// PUZZLE DE MUNDO da expedição (cap. 2): a ESTEIRA da triagem, com três rampas
// ao lado — CARGA, EXPRESSO e NORMAL. Cada pacote na esteira é um caso de teste
// do puzzle (gerado pela IA, ver data/aiSpecs.js): o peso vai na etiqueta, o
// tamanho da caixa acompanha o peso, e os carimbos dizem se é URGENTE e/ou
// FRÁGIL. O mapa é gerado a partir dos `tests`.
//
// Ao rodar, a esteira leva um pacote de cada vez até a rampa que o programa do
// jogador escolheu e o empurrador joga ele lá dentro: rampa certa acende verde,
// errada acende vermelho. Valor que não é rampa nenhuma (ou programa que nem
// escolheu) leva o pacote até o fim da esteira — para a PILHA que entope a
// passarela. Errou um, os pacotes voltam para a fila e todos são testados de
// novo (mesmo motivo do CrateCorridor).
//
// `clearPile()` é o que abre o caminho depois de acertar: sem pacote errado
// chegando, o braço de descarte esvazia a passarela.

const QUEUE_GAP = 42;
const SPEED = 0.42;              // px por ms na esteira
const PUSH_MS = 220;
const START_MS = 250;
const RESULT_HOLD_MS = 1200;
const LABEL_DX = -46;            // etiqueta à esquerda da esteira
const COLORS = { ok: 0x51e36b, bad: 0xff4545 };

const sizeOf = (peso) => (peso < 15 ? "p" : peso < 35 ? "m" : "g");

export default class ParcelSorter {
    // belt = { x, top, bottom } (centro e extremos da esteira, tela);
    // chutes = [{ value, label, color, baseY }] (rampas à direita, de cima para baixo);
    // pile = { x, baseY, collider } (a pilha na passarela).
    constructor(scene, { belt, chutes, pile, tests, field = "rampa" }) {
        this.scene = scene;
        this.belt = belt;
        this.field = field;

        this.chutes = chutes.map((chute) => {
            const x = belt.x + 30;
            const image = scene.add.image(x, chute.baseY, `prop-rampa_${chute.value}`)
                .setOrigin(0, 1).setDepth(chute.baseY);
            const mouthY = chute.baseY - 55;
            scene.add.text(x + 40, chute.baseY + 4, chute.label, {
                fontFamily: "VCR", fontSize: "13px", color: chute.color
            }).setOrigin(0.5, 0).setDepth(chute.baseY + 1);
            const pusher = scene.add.image(belt.x - 54, mouthY, "prop-empurrador")
                .setOrigin(0, 0.5).setDepth(mouthY + 20);
            const [collider] = scene.addColliders([{ x, y: chute.baseY - 58, w: 80, h: 56 }]);
            return { ...chute, x, image, mouthY, pusher, pusherX: pusher.x, collider };
        });

        scene.addColliders([{ x: belt.x - 30, y: belt.top, w: 60, h: belt.bottom - belt.top }]);

        this.pile = scene.add.image(pile.x, pile.baseY, "prop-pilha_pacotes").setOrigin(0.5, 1).setDepth(pile.baseY);
        [this.pileCollider] = scene.addColliders([pile.collider]);

        this.parcels = tests.map((test, i) => {
            const homeY = belt.top + 26 + i * QUEUE_GAP;
            const c = scene.add.container(belt.x, homeY).setDepth(homeY + 20);
            const box = scene.add.image(0, 0, `prop-pacote_${sizeOf(test.given.peso)}`).setOrigin(0.5, 0.5);
            const tag = scene.add.text(LABEL_DX, -9, `${test.label ?? ""} ${test.given.peso}kg`, {
                fontFamily: "VCR", fontSize: "14px", color: "#e6ebf5",
                backgroundColor: "#0a0c12", padding: { x: 4, y: 1 }
            }).setOrigin(1, 0.5);
            const stamps = [test.given.urgente && ["URGENTE", "#ff4545"], test.given.fragil && ["FRÁGIL", "#ffb347"]]
                .filter(Boolean);
            const stampTexts = stamps.map(([text, color], k) => scene.add.text(LABEL_DX, 6 + k * 12, text, {
                fontFamily: "VCR", fontSize: "11px", color
            }).setOrigin(1, 0.5));
            c.add([box, tag, ...stampTexts]);
            return { c, homeY, expect: test.expect[field] };
        });
    }

    // Executa o programa no mapa: um pacote de cada vez, na ordem da fila.
    play(results, done) {
        const step = (i) => {
            if (i >= this.parcels.length) {
                this.finish(done);
                return;
            }
            this.route(this.parcels[i], results[i]?.got?.[this.field], () => step(i + 1));
        };
        this.scene.time.delayedCall(START_MS, () => step(0));
    }

    route(parcel, value, next) {
        const s = this.scene;
        const chute = this.chutes.find((ch) => ch.value === value);
        const targetY = chute ? chute.mouthY : this.belt.bottom + 6;
        const travel = Math.max(120, Math.abs(targetY - parcel.c.y) / SPEED);
        parcel.right = Boolean(chute) && value === parcel.expect;

        s.tweens.add({
            targets: parcel.c, y: targetY, duration: travel, ease: "Sine.easeInOut",
            onUpdate: () => parcel.c.setDepth(parcel.c.y + 20),
            onComplete: () => {
                if (!chute) {
                    // Ninguém mandou para rampa nenhuma: cai na pilha.
                    Sfx.play(s, "error", 0.5);
                    s.tweens.add({
                        targets: parcel.c, y: this.pile.y - 40, alpha: 0.4, duration: 260, ease: "Quad.easeIn",
                        onComplete: next
                    });
                    return;
                }
                this.push(parcel, chute, next);
            }
        });
    }

    push(parcel, chute, next) {
        const s = this.scene;
        s.tweens.add({ targets: chute.pusher, x: chute.pusherX + 18, duration: PUSH_MS / 2, yoyo: true });
        s.tweens.add({
            targets: parcel.c, x: chute.x + 40, scale: 0.75, duration: PUSH_MS, ease: "Quad.easeOut",
            onComplete: () => {
                s.tweens.add({ targets: parcel.c, alpha: 0, scale: 0.5, duration: 160 });
                chute.image.setTintFill(parcel.right ? COLORS.ok : COLORS.bad);
                s.time.delayedCall(170, () => chute.image.clearTint());
                Sfx.play(s, parcel.right ? "select" : "error", 0.5);
                s.time.delayedCall(200, next);
            }
        });
    }

    finish(done) {
        if (this.parcels.every((p) => p.right)) {
            done(true);
            return;
        }
        // Errou: volta todo mundo para a fila, para a próxima tentativa testar
        // todos os pacotes de novo.
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => {
            this.parcels.forEach((p) => {
                p.right = false;
                p.c.setPosition(this.belt.x, p.homeY).setScale(1).setDepth(p.homeY + 20);
                this.scene.tweens.add({ targets: p.c, alpha: { from: 0, to: 1 }, duration: 240 });
            });
            this.scene.time.delayedCall(260, () => done(false));
        });
    }

    // A triagem certa: o braço de descarte esvazia a passarela.
    clearPile(onDone) {
        const s = this.scene;
        Sfx.play(s, "bump", 0.6);
        s.cameras.main.shake(160, 0.003);
        s.tweens.add({
            targets: this.pile, y: this.pile.y + 30, alpha: 0, duration: 900, ease: "Quad.easeIn",
            onComplete: () => {
                this.pile.destroy();
                this.pileCollider.body.enable = false;
                onDone?.();
            }
        });
    }

    // Save com a triagem resolvida: sem pilha e com a fila já despachada.
    showSolved() {
        this.pile.destroy();
        this.pileCollider.body.enable = false;
        this.parcels.forEach((p) => p.c.setVisible(false));
    }
}
