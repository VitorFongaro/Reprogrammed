import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import OptionsScene from './scenes/OptionsScene';
import PauseMenuScene from './scenes/PauseMenuScene';
import IntroScene from './scenes/IntroScene';
import SpritTestScene from './scenes/SpritTestScene';
import PoraoScene from './scenes/chapter1/PoraoScene';
import SalaArquivosScene from './scenes/chapter1/SalaArquivosScene';
import SalaControleScene from './scenes/chapter1/SalaControleScene';
import TreinamentoScene from './scenes/chapter1/TreinamentoScene';
import SentinelaScene from './scenes/chapter1/SentinelaScene';
import SalaSegurancaScene from './scenes/chapter1/SalaSegurancaScene';
import BattleScene from './scenes/chapter1/BattleScene';
import CorredorScene from './scenes/chapter1/CorredorScene';
import SaguaoScene from './scenes/chapter1/SaguaoScene';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',

    width: 1280,
    height: 720,

    pixelArt: true,

    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },

    scene: [
        GameScene,
        OptionsScene,
        IntroScene,
        SpritTestScene,
        PoraoScene,
        SalaArquivosScene,
        SalaControleScene,
        TreinamentoScene,
        SentinelaScene,
        SalaSegurancaScene,
        BattleScene,
        CorredorScene,
        SaguaoScene,
        // Overlays por último: renderizam por cima das salas (ver bringToTop).
        PauseMenuScene
    ]
};

const game = new Phaser.Game(config);

// Atalho de desenvolvimento (não entra no build): permite pular cenas pelo
// console do navegador, ex.: __game.scene.start("cap1-porao").
if (import.meta.env.DEV) {
    window.__game = game;
}
