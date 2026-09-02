// Efeitos sonoros da UI (pack Kenney Interface Sounds, CC0). Uso:
//   - no `preload` da cena: `Sfx.preload(scene)`;
//   - onde o evento acontece: `Sfx.play(scene, "select")`.
// O volume vem do slider de EFEITOS SONOROS da OptionsScene (state/audio). Os
// arquivos são carregados no cache global do Phaser, então tocam de qualquer cena.

import { getSfxVolume } from "../state/audio";
import selectUrl from "../assets/audio/select.ogg";
import errorUrl from "../assets/audio/error.ogg";
import confirmUrl from "../assets/audio/confirm.ogg";
import hackUrl from "../assets/audio/hack.ogg";

const SOUNDS = {
    select: { key: "sfx-select", url: selectUrl },     // bloco encaixado num espaço
    error: { key: "sfx-error", url: errorUrl },        // combinação de código errada
    confirm: { key: "sfx-confirm", url: confirmUrl },  // código do jogador correto
    hack: { key: "sfx-hack", url: hackUrl }            // robô inimigo invadido
};

const Sfx = {
    preload(scene) {
        Object.values(SOUNDS).forEach(({ key, url }) => {
            if (!scene.cache.audio.exists(key)) {
                scene.load.audio(key, url);
            }
        });
    },

    play(scene, name) {
        const def = SOUNDS[name];
        const volume = getSfxVolume();
        if (!def || volume <= 0 || !scene?.sound || !scene.cache.audio.exists(def.key)) {
            return;
        }
        scene.sound.play(def.key, { volume });
    }
};

export default Sfx;
