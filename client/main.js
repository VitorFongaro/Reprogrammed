import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import OptionsScene from './scenes/OptionsScene';
import IntroScene from './scenes/IntroScene';
import SpritTestScene from './scenes/SpritTestScene';
import PoraoScene from './scenes/chapter1/PoraoScene';
import SalaArquivosScene from './scenes/chapter1/SalaArquivosScene';
import SalaControleScene from './scenes/chapter1/SalaControleScene';
import SalaSegurancaScene from './scenes/chapter1/SalaSegurancaScene';
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
        SalaSegurancaScene,
        CorredorScene,
        SaguaoScene
    ]
};

new Phaser.Game(config);
