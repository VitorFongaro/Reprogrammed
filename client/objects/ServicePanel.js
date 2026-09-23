// Painel de SERVIÇO das salas de teste do cap. 2 (reiniciar a sala, ir para a
// outra sala de teste...): caixa escura com uma luz, o rótulo embaixo e um
// prompt [E]. Não é peça de jogo — some junto com as salas de teste quando o
// mapa do capítulo existir.
export function addServicePanel(scene, { x, y, prompt, label, color, onInteract }) {
    const g = scene.add.graphics();
    g.fillStyle(0x14161f, 1).fillRect(x - 30, y - 40, 60, 80);
    g.lineStyle(2, 0x3a3f55, 1).strokeRect(x - 30, y - 40, 60, 80);
    g.fillStyle(color, 1).fillCircle(x, y - 18, 6);
    scene.add.text(x, y + 56, label, { fontFamily: "VCR", fontSize: "15px", color: "#7a8099" }).setOrigin(0.5);

    const promptObj = scene.add.text(x, y - 70, prompt, {
        fontFamily: "VCR", fontSize: "18px", color: "#4ad6ff"
    }).setOrigin(0.5).setDepth(800).setVisible(false);

    scene.registerInteractable({ x, y, radius: 110, promptObj, isAvailable: () => true, onInteract });
}
