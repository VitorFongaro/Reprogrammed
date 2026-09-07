// Música de fundo. Uso:
//   - no `preload` da cena: `Music.preload(scene)`;
//   - onde a faixa deve tocar: `Music.play(scene, "cap1")`.
//
// O SoundManager do Phaser é GLOBAL (criado pelo Game, não pela cena), então a
// faixa atravessa as trocas de cena sozinha — é por isso que a música começa na
// `IntroScene` e continua pelas salas do capítulo sem reiniciar. O `play` é
// IDEMPOTENTE: chamar de novo com a mesma faixa não recomeça a música (o
// `BaseRoomScene` chama a cada sala justamente para cobrir quem entrou pelo
// CONTINUAR, sem passar pela intro).
//
// O volume vem do slider de MÚSICA da OptionsScene (state/audio.js).

import { getMusicVolume } from "../state/audio";
import menuUrl from "../assets/audio/music/menu.mp3";
import cap1Url from "../assets/audio/music/cap1_subsolo.mp3";
import bossUrl from "../assets/audio/music/boss.mp3";

const TRACKS = {
    menu: { key: "music-menu", url: menuUrl },   // menu principal
    cap1: { key: "music-cap1", url: cap1Url },   // capítulo 1 (subsolo)
    boss: { key: "music-boss", url: bossUrl }    // embate com o boss de capítulo
};

let current = null;       // Phaser.Sound em execução (ou pausada).
let currentName = null;
let previousName = null;  // faixa trocada por um tema temporário (ver playTheme).

const Music = {
    // Carrega UMA faixa (as músicas têm alguns MB — o menu não deve baixar a do
    // capítulo antes de abrir, nem vice-versa).
    preload(scene, name) {
        const track = TRACKS[name];
        if (track && !scene.cache.audio.exists(track.key)) {
            scene.load.audio(track.key, track.url);
        }
    },

    play(scene, name) {
        const track = TRACKS[name];
        if (!track || !scene?.sound || !scene.cache.audio.exists(track.key)) {
            return;
        }

        // Mesma faixa já no ar: não reinicia (só destrava se estava pausada).
        if (currentName === name && current) {
            if (current.isPaused) {
                current.resume();
            }
            return;
        }

        Music.stop();
        current = scene.sound.add(track.key, { loop: true, volume: getMusicVolume() });
        currentName = name;

        // O navegador só libera áudio depois da PRIMEIRA interação do usuário, e o
        // menu é a primeira tela — o contexto costuma estar travado ali. Em vez de
        // perder o play, espera o Phaser destravar (no 1º clique/tecla) e só então
        // toca. O guard `current === pending` evita que uma faixa já trocada (ex.:
        // clicou INICIAR antes de destravar) volte a tocar por cima da nova.
        if (scene.sound.locked) {
            const pending = current;
            scene.sound.once("unlocked", () => {
                if (current === pending) {
                    pending.play();
                }
            });
            return;
        }

        current.play();
    },

    // Tema TEMPORÁRIO (o do boss): toca por cima, lembrando qual faixa estava no
    // ar para o `restore` devolver depois. Assim a BattleScene não precisa saber
    // em que capítulo está — no capítulo 2 volta para a faixa do capítulo 2.
    playTheme(scene, name) {
        if (currentName !== name) {
            previousName = currentName;
        }
        Music.play(scene, name);
    },

    // Fim do tema temporário: devolve a faixa anterior (recomeçando do zero — o
    // embate é longo demais para valer guardar a posição). Sem faixa anterior,
    // apenas silencia, para o tema do boss não vazar para fora do combate.
    restore(scene) {
        const back = previousName;
        previousName = null;

        if (back) {
            Music.play(scene, back);
        } else {
            Music.stop();
        }
    },

    stop() {
        if (!current) {
            return;
        }
        current.stop();
        current.destroy();
        current = null;
        currentName = null;
    },

    // Chamada pela OptionsScene quando o slider de MÚSICA muda, para o ajuste
    // valer na faixa que já está tocando.
    applyVolume() {
        current?.setVolume(getMusicVolume());
    }
};

export default Music;
