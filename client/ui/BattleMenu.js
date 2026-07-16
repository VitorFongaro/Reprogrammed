// Menu de ações do combate por turnos (estilo Undertale): botões horizontais
// selecionáveis por teclado (A/D ou setas + E/Enter para confirmar) ou pelo
// mouse (hover seleciona, clique confirma). `onSelect(id)` recebe o id da ação
// escolhida; o menu se esconde sozinho ao confirmar.

const BUTTON_W = 200;
const BUTTON_H = 52;
const GAP = 26;

const COLOR = {
    fill: 0x05060a,
    border: 0x4ad6ff,
    text: "#f7f7f7",
    dim: "#5b6178"
};

export default class BattleMenu {
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;
        this.actions = config.actions;
        this.onSelect = config.onSelect;
        this.index = 0;
        this.visible = false;

        this.build();
        scene.events.once("shutdown", () => this.destroy());
    }

    build() {
        this.container = this.scene.add.container(0, 0).setDepth(950).setVisible(false);

        const totalW = this.actions.length * BUTTON_W + (this.actions.length - 1) * GAP;
        const startX = this.x - totalW / 2 + BUTTON_W / 2;

        this.buttons = this.actions.map((action, index) => {
            const bx = startX + index * (BUTTON_W + GAP);
            const graphics = this.scene.add.graphics();
            const label = this.scene.add.text(bx, this.y, action.label, {
                fontFamily: "VCR",
                fontSize: "24px",
                color: COLOR.dim
            }).setOrigin(0.5);

            const hit = this.scene.add.rectangle(bx, this.y, BUTTON_W, BUTTON_H, 0xffffff, 0.001)
                .setInteractive({ useHandCursor: true });
            hit.on("pointerover", () => {
                this.index = index;
                this.render();
            });
            hit.on("pointerdown", () => this.confirm(index));

            this.container.add([graphics, label, hit]);
            return { graphics, label, x: bx };
        });

        this.hint = this.scene.add.text(this.x, this.y + BUTTON_H / 2 + 20, "[A]/[D] selecionar   [E] confirmar", {
            fontFamily: "VCR",
            fontSize: "14px",
            color: COLOR.dim
        }).setOrigin(0.5);
        this.container.add(this.hint);

        this.render();
    }

    render() {
        this.buttons.forEach((button, index) => {
            const selected = index === this.index;
            const left = button.x - BUTTON_W / 2;
            const top = this.y - BUTTON_H / 2;

            button.graphics.clear();
            button.graphics.fillStyle(COLOR.fill, 0.92);
            button.graphics.fillRect(left, top, BUTTON_W, BUTTON_H);
            button.graphics.fillStyle(COLOR.border, selected ? 0.16 : 0.03);
            button.graphics.fillRect(left, top, BUTTON_W, BUTTON_H);
            button.graphics.lineStyle(selected ? 3 : 2, COLOR.border, selected ? 1 : 0.45);
            button.graphics.strokeRect(left, top, BUTTON_W, BUTTON_H);
            button.label.setColor(selected ? COLOR.text : COLOR.dim);
        });
    }

    show() {
        this.visible = true;
        this.index = 0;
        this.render();
        this.container.setVisible(true);

        // Registra o teclado no próximo tick para não capturar a tecla que abriu
        // o menu (mesma convenção dos consoles).
        this.scene.time.delayedCall(0, () => {
            if (!this.visible) {
                return;
            }
            this.keyHandler = (event) => this.handleKey(event);
            this.scene.input.keyboard.on("keydown", this.keyHandler);
        });
    }

    hide() {
        this.visible = false;
        this.container.setVisible(false);
        if (this.keyHandler) {
            this.scene.input.keyboard.off("keydown", this.keyHandler);
            this.keyHandler = null;
        }
    }

    handleKey(event) {
        switch (event.code) {
            case "KeyA":
            case "ArrowLeft":
                this.index = (this.index + this.actions.length - 1) % this.actions.length;
                this.render();
                return;
            case "KeyD":
            case "ArrowRight":
                this.index = (this.index + 1) % this.actions.length;
                this.render();
                return;
            case "KeyE":
            case "Enter":
                this.confirm(this.index);
        }
    }

    confirm(index) {
        if (!this.visible) {
            return;
        }
        this.index = index;
        this.hide();
        this.onSelect?.(this.actions[index].id);
    }

    destroy() {
        this.hide();
        this.container?.destroy();
        this.container = null;
    }
}
