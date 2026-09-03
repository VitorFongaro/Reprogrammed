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
import bumpUrl from "../assets/audio/bump.ogg";
import gunUrl from "../assets/audio/gun.ogg";
import laserUrl from "../assets/audio/laser.ogg";
import crunchUrl from "../assets/audio/crunch.ogg";
import menuInUrl from "../assets/audio/menu_in.ogg";
import menuOutUrl from "../assets/audio/menu_out.ogg";

const SOUNDS = {
    select: { key: "sfx-select", url: selectUrl },     // bloco encaixado num espaço
    error: { key: "sfx-error", url: errorUrl },        // combinação de código errada
    confirm: { key: "sfx-confirm", url: confirmUrl },  // código do jogador correto
    hack: { key: "sfx-hack", url: hackUrl },           // robô inimigo invadido
    bump: { key: "sfx-bump", url: bumpUrl },           // biped aterrissa (slam)
    gun: { key: "sfx-gun", url: gunUrl },              // tiro de inimigo com arma
    laser: { key: "sfx-laser", url: laserUrl },        // tiro do carro (torreta)
    crunch: { key: "sfx-crunch", url: crunchUrl },     // card iniciar/continuar no espaço (menu)
    menuIn: { key: "sfx-menu-in", url: menuInUrl },    // inventário abre
    menuOut: { key: "sfx-menu-out", url: menuOutUrl }  // inventário fecha
};

const Sfx = {
    preload(scene) {
        Object.values(SOUNDS).forEach(({ key, url }) => {
            if (!scene.cache.audio.exists(key)) {
                scene.load.audio(key, url);
            }
        });
    },

    // `volumeScale` (0..1) atenua sons que disparam com frequência (ex.: tiros de
    // vários inimigos) para não dominarem os demais efeitos.
    play(scene, name, volumeScale = 1) {
        const def = SOUNDS[name];
        const volume = getSfxVolume() * volumeScale;
        if (!def || volume <= 0 || !scene?.sound || !scene.cache.audio.exists(def.key)) {
            return;
        }
        scene.sound.play(def.key, { volume });
    }
};

export default Sfx;
