import fxLightningUrl from "../assets/sprites/effects/fx_lightning.png";
import fxWarpUrl from "../assets/sprites/effects/fx_warp.png";
import fxExplosionUrl from "../assets/sprites/effects/fx_explosion.png";
import fxChargeUrl from "../assets/sprites/effects/fx_charge.png";
import fxSparkUrl from "../assets/sprites/effects/fx_spark.png";
import fxHasteUrl from "../assets/sprites/effects/fx_haste.png";
import fxDeathUrl from "../assets/sprites/effects/fx_death.png";
import fxRageUrl from "../assets/sprites/effects/fx_rage.png";
import fxSkullUrl from "../assets/sprites/effects/fx_skull.png";
import fxPortalUrl from "../assets/sprites/effects/fx_portal.png";
import fxArriveUrl from "../assets/sprites/effects/fx_arrive.png";
import fxImpactUrl from "../assets/sprites/effects/fx_impact.png";
import fxRingUrl from "../assets/sprites/effects/fx_ring.png";
import fxBurstUrl from "../assets/sprites/effects/fx_burst.png";
import fxAlertUrl from "../assets/sprites/effects/fx_alert.png";
import fxDizzyUrl from "../assets/sprites/effects/fx_dizzy.png";

// Efeitos dos packs da unTied Games — Super Pixel Effects Gigapack e Super Pixel
// Fantasy FX Pack 3 (Will Tice; ver docs/ASSETS.md). Moram aqui porque várias
// telas os usam — a BattleScene (ENIAC, LEO, WITCH), o DodgeBox (laser do
// mensageiro), os puzzles de mundo do depósito e a WITCH na sala — e ter duas
// listas de quadros/fps do mesmo sheet é receita de uma delas ficar para trás.
// Os da WITCH saem de tools/fx_sheets.py.
//
// Todas as animações tocam UMA VEZ (`repeat: 0`) e a chave é `<chave>-anim`.
// `preload` no `preload` da cena, `createAnimations` no `create`; as duas são
// idempotentes, então cena que já carregou não recarrega. Golpe que precisa
// acertar o instante de um quadro (a caveira da sentença) usa `frameMs`, em vez
// de um número mágico que desanda se alguém mexer no fps daqui.

// [chave, url, tamanho do quadro (quadrado), nº de quadros, fps].
const SHEETS = [
    ["fx-lightning", fxLightningUrl, 128, 7, 20],
    ["fx-warp", fxWarpUrl, 128, 10, 16],
    ["fx-explosion", fxExplosionUrl, 64, 8, 18],
    ["fx-charge", fxChargeUrl, 96, 12, 15],
    ["fx-spark", fxSparkUrl, 128, 12, 26],
    // WITCH. O relógio é LENTO de propósito (2,4 s): é o tempo parado.
    ["fx-haste", fxHasteUrl, 128, 29, 12],
    ["fx-death", fxDeathUrl, 64, 50, 30],     // 死 pincelado (0-31), caveira (32-44)
    ["fx-rage", fxRageUrl, 128, 18, 20],
    ["fx-skull", fxSkullUrl, 64, 12, 18],
    ["fx-portal", fxPortalUrl, 96, 10, 14],
    ["fx-arrive", fxArriveUrl, 128, 12, 20],
    ["fx-impact", fxImpactUrl, 80, 6, 18],
    ["fx-ring", fxRingUrl, 96, 10, 20],
    ["fx-burst", fxBurstUrl, 96, 10, 20],
    ["fx-alert", fxAlertUrl, 80, 14, 20],
    ["fx-dizzy", fxDizzyUrl, 96, 24, 14]
];

// Quadros do fx-death em que a caveira queima (o 死 antes disso é só o aviso).
// A sentença da WITCH usa na sala e na batalha: um lugar só para os dois.
export const DEATH_SKULL = { from: 32, to: 45 };

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

    // Quanto tempo depois de começar o efeito chega no quadro `frame` (ms).
    static frameMs(key, frame) {
        const sheet = SHEETS.find(([k]) => k === key);
        return sheet ? (frame * 1000) / sheet[4] : 0;
    }

    // Duração total do efeito (ms).
    static durationMs(key) {
        const sheet = SHEETS.find(([k]) => k === key);
        return sheet ? (sheet[3] * 1000) / sheet[4] : 0;
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
