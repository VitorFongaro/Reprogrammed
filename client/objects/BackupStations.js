import Sfx from "../ui/Sfx";
import Juice from "../ui/Juice";
import Effects from "../ui/Effects";

// PUZZLE DE MUNDO do data center (cap. 3, contador com `se` dentro do laço):
// cada caso de teste é uma ESTAÇÃO DE BACKUP, uma bancada com a fila de
// `arquivos` (todos de `tamanho` GB) à esquerda e o DRIVE à direita, uma barra
// com um quadradinho por GB livre (`espaco`). O mapa é gerado pelos `tests`.
//
// Ao rodar, os arquivos entram no drive um por um — uma volta do laço por
// arquivo. Os que o programa salvou (`salvos`) ocupam `tamanho` quadradinhos;
// os outros piscam e ficam na fila. Na medida = verde; salvou mais do que cabia
// = os GB que passaram da barra ficam vermelhos (ESTOUROU); deixou para trás um
// que cabia = COUBE MAIS. Errou um, todos esvaziam para a próxima tentativa.
//
// O console entrega só o valor final de `salvos` de cada caso, não o passo a
// passo do programa: a estação mostra os primeiros `salvos` arquivos indo para
// o drive (é o que o laço faz, em ordem). Basta, porque a conferência também é
// só pelo `salvos`; contar mais do que a fila tem aparece no contador.
//
// As estações ficam em linhas FIXAS (`rows`), criadas já na entrada como
// OFFLINE (o colisor da bancada existe antes de a IA responder); `activate`
// liga as que o puzzle usa.

const CELL = 10;
const FILE_W = 12;
const FILE_H = 16;
const ROW_W = 560;
const QUEUE_X = -210;          // primeiro arquivo da fila (relativo ao centro)
const DRIVE_X = -60;           // começo da barra do drive
const MAX_OVER = 6;            // GB estourados mostrados além da barra
const FILE_MS = 300;
const RESULT_HOLD_MS = 1400;
const COLORS = {
    desk: 0x16181f, deskLight: 0x2c303c, edge: 0x0a0b10,
    file: 0x4ad6ff, fileDim: 0x2a5a70, cell: 0x101218, cellLine: 0x2c303c,
    used: 0x4ad6ff, ok: 0x51e36b, bad: 0xff4545, amber: 0xffb347
};

export default class BackupStations {
    // rows = [{ x, y }] (centro de cada bancada, na tela).
    constructor(scene, rows) {
        this.scene = scene;
        this.rows = rows.map((row) => this.createRow(row));
    }

    createRow({ x, y }) {
        const s = this.scene;
        const c = s.add.container(x, y).setDepth(y + 20);
        const g = s.add.graphics();
        g.fillStyle(COLORS.desk, 1).fillRect(-ROW_W / 2, -20, ROW_W, 40);
        g.fillStyle(COLORS.deskLight, 1).fillRect(-ROW_W / 2, -20, ROW_W, 3);
        g.lineStyle(2, COLORS.edge, 1).strokeRect(-ROW_W / 2, -20, ROW_W, 40);
        const label = s.add.text(-ROW_W / 2 + 10, 0, "OFFLINE", {
            fontFamily: "VCR", fontSize: "13px", color: "#5b6178"
        }).setOrigin(0, 0.5);
        const counter = s.add.text(ROW_W / 2 - 8, 0, "", {
            fontFamily: "VCR", fontSize: "14px", color: "#e6ebf5"
        }).setOrigin(1, 0.5);
        c.add([g, label, counter]);
        return { c, x, y, label, counter, files: [], cells: [], test: null, right: false };
    }

    // Liga as estações que o puzzle usa, de cima para baixo.
    activate(tests) {
        const s = this.scene;
        tests.forEach((test, i) => {
            const row = this.rows[i];
            if (!row) return;
            row.test = test;
            const { arquivos, tamanho, espaco } = test.given;
            row.label.setText(`${test.label ?? ""}  ${tamanho}GB`).setColor("#e6ebf5");
            row.files = Array.from({ length: arquivos }, (_, k) => {
                const fx = QUEUE_X + k * (FILE_W + 4);
                const file = s.add.rectangle(fx, 0, FILE_W, FILE_H, COLORS.file).setStrokeStyle(1, 0xe6f7ff);
                row.c.add(file);
                return { obj: file, home: fx };
            });
            // drive: moldura + um quadradinho por GB livre, e espaço para mostrar o que estourar
            const frame = s.add.rectangle(DRIVE_X - 3, 0, espaco * CELL + 6, CELL + 10, 0x05060a)
                .setOrigin(0, 0.5).setStrokeStyle(2, COLORS.cellLine);
            row.c.add(frame);
            row.cells = Array.from({ length: espaco }, (_, k) => {
                const cell = s.add.rectangle(DRIVE_X + k * CELL + CELL / 2, 0, CELL - 2, CELL + 2, COLORS.cell);
                row.c.add(cell);
                return cell;
            });
            row.counter.setText("SALVOS: 0");
        });
    }

    get active() {
        return this.rows.filter((r) => r.test);
    }

    play(results, done) {
        const rows = this.active;
        const step = (i) => {
            if (i >= rows.length) {
                this.finish(done);
                return;
            }
            this.run(rows[i], results[i]?.got?.salvos, () => step(i + 1));
        };
        this.scene.time.delayedCall(250, () => step(0));
    }

    // Uma volta do laço por arquivo da fila.
    run(row, value, next) {
        const s = this.scene;
        const { tamanho, espaco } = row.test.given;
        const salvos = Number.isInteger(value) && value >= 0 ? value : 0;
        row.right = salvos === row.test.expect.salvos;
        row.extra = [];
        let used = 0;
        let count = 0;
        const step = (k) => {
            if (k >= row.files.length) {
                // O contador mostra o que o PROGRAMA contou, não o que a fila
                // animou: contar mais do que a fila tem tem de aparecer.
                row.counter.setText(`SALVOS: ${salvos}`);
                this.judge(row, salvos, used);
                s.time.delayedCall(260, next);
                return;
            }
            const file = row.files[k];
            if (count < salvos) {
                // copia: o arquivo voa até o drive e vira `tamanho` quadradinhos
                count += 1;
                const target = DRIVE_X + (used + tamanho / 2) * CELL;
                s.tweens.add({
                    targets: file.obj, x: target, scaleX: (tamanho * CELL) / FILE_W, scaleY: 0.6, alpha: 0,
                    duration: FILE_MS, ease: "Sine.easeIn",
                    onComplete: () => {
                        for (let g = used; g < used + tamanho; g += 1) {
                            if (g < espaco) {
                                row.cells[g].setFillStyle(COLORS.used);
                            } else if (g < espaco + MAX_OVER) {
                                // passou do drive: GB que não existem, em vermelho
                                const over = s.add.rectangle(DRIVE_X + g * CELL + CELL / 2, 0, CELL - 2, CELL + 2, COLORS.bad);
                                row.c.add(over);
                                row.extra.push(over);
                            }
                        }
                        used += tamanho;
                        row.counter.setText(`SALVOS: ${count}`);
                        Sfx.play(s, "select", 0.3);
                        s.time.delayedCall(80, () => step(k + 1));
                    }
                });
                return;
            }
            // pulou: o arquivo pisca e fica na fila
            s.tweens.add({
                targets: file.obj, alpha: 0.25, duration: 120, yoyo: true, repeat: 1,
                onComplete: () => {
                    file.obj.setFillStyle(COLORS.fileDim);
                    step(k + 1);
                }
            });
        };
        step(0);
    }

    judge(row, salvos, used) {
        const s = this.scene;
        const { espaco } = row.test.given;
        if (row.right) {
            row.cells.forEach((cell) => { if (cell.fillColor === COLORS.used) cell.setFillStyle(COLORS.ok); });
            row.counter.setColor("#51e36b");
            Sfx.play(s, "confirm", 0.4);
            return;
        }
        row.counter.setColor("#ff4545");
        Sfx.play(s, "error", 0.4);
        if (used > espaco) {
            this.flash(row, "ESTOUROU", "#ff4545");
            Effects.play(s, "fx-spark", row.x + DRIVE_X + espaco * CELL, row.y, { scale: 0.5, depth: 830 });
            s.cameras.main.shake(80, 0.002);
        } else if (salvos > row.files.length) {
            this.flash(row, "CONTOU ERRADO", "#ff4545");
        } else {
            this.flash(row, "COUBE MAIS", "#ffb347");
        }
    }

    flash(row, text, color) {
        const s = this.scene;
        const label = s.add.text(row.x + ROW_W / 2 - 8, row.y - 30, text, {
            fontFamily: "VCR", fontSize: "14px", color, backgroundColor: "#050505", padding: { x: 4, y: 1 }
        }).setOrigin(1, 0.5).setDepth(900);
        s.time.delayedCall(RESULT_HOLD_MS, () => label.destroy());
    }

    finish(done) {
        if (this.active.every((r) => r.right)) {
            // Resolvido: cada um pulsa em sequência com o tom subindo (game juice).
            Juice.celebrate(this.scene, this.active.map((r) => r.c), () => done(true), { amount: 1.03 });
            return;
        }
        // Errou: as estações esvaziam para a próxima tentativa testar todas.
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => {
            this.active.forEach((r) => this.resetRow(r));
            this.scene.time.delayedCall(200, () => done(false));
        });
    }

    resetRow(row) {
        row.right = false;
        row.extra?.forEach((o) => o.destroy());
        row.extra = [];
        row.files.forEach((f) => f.obj.setPosition(f.home, 0).setScale(1).setAlpha(1).setFillStyle(COLORS.file));
        row.cells.forEach((cell) => cell.setFillStyle(COLORS.cell));
        row.counter.setText("SALVOS: 0").setColor("#e6ebf5");
    }

    // Save com a sala resolvida: os drives cheios na medida.
    showSolved() {
        this.active.forEach((row) => {
            const { tamanho } = row.test.given;
            const salvos = row.test.expect.salvos;
            row.files.forEach((f, k) => (k < salvos ? f.obj.setAlpha(0) : f.obj.setFillStyle(COLORS.fileDim)));
            row.cells.forEach((cell, k) => cell.setFillStyle(k < salvos * tamanho ? COLORS.ok : COLORS.cell));
            row.counter.setText(`SALVOS: ${salvos}`).setColor("#51e36b");
        });
    }
}
