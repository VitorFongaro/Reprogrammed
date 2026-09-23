import fxLightningUrl from "../assets/sprites/effects/fx_lightning.png";
import fxWarpUrl from "../assets/sprites/effects/fx_warp.png";
import fxExplosionUrl from "../assets/sprites/effects/fx_explosion.png";
import fxChargeUrl from "../assets/sprites/effects/fx_charge.png";
import fxSparkUrl from "../assets/sprites/effects/fx_spark.png";

// Efeitos do Super Pixel Effects Gigapack (Will Tice / unTied Games; ver
// docs/ASSETS.md). Moram aqui porque mais de uma tela os usa — a BattleScene
// (padrões do ENIAC e da LEO), o DodgeBox (laser do mensageiro) e os puzzles de
// mundo do depósito (faísca das caixas) — e ter duas listas de quadros/fps do
// mesmo sheet é receita de uma delas ficar para trás.
//
// Todas as animações tocam UMA VEZ (`repeat: 0`) e a chave é `<chave>-anim`.
// `preload` no `preload` da cena, `createAnimations` no `create`; as duas são
// idempotentes, então cena que já carregou não recarrega.

// [chave, url, tamanho do quadro (quadrado), nº de quadros, fps].
const SHEETS = [
    ["fx-lightning", fxLightningUrl, 128, 7, 20],
    ["fx-warp", fxWarpUrl, 128, 10, 16],
    ["fx-explosion", fxExplosionUrl, 64, 8, 18],
    ["fx-charge", fxChargeUrl, 96, 12, 15],
    ["fx-spark", fxSparkUrl, 128, 12, 26]
];

export default class Effects {
    static preload(scene) {
        SHEETS.forEach(([key, url, size]) => {
            if (!scene.textures.exists(key)) {
                scene.load.spritesheet(key, url, { frameWidth: size, frameHeight: size });
            }
        });
    }

    static createAnimations(scene) {
        SHEETS.forEach(([key, , , frames, rate]) => {
            if (scene.anims.exists(`${key}-anim`)) {
                return;
            }
            scene.anims.create({
                key: `${key}-anim`,
                frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
                frameRate: rate,
                repeat: 0
            });
        });
    }

    // Efeito avulso que se destrói sozinho ao terminar. Quem precisa rastrear
    // para limpar antes da hora (a BattleScene rastreia) usa o retorno.
    static play(scene, key, x, y, { scale = 1, depth = 26, angle = 0, alpha = 1 } = {}) {
        const spr = scene.add.sprite(x, y, key).setDepth(depth).setScale(scale).setAngle(angle);
        spr.setAlpha(alpha);
        spr.play(`${key}-anim`);
        spr.once("animationcomplete", () => spr.destroy());
        return spr;
    }
}
