import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import OptionsScene from './scenes/OptionsScene';
import IntroScene from './scenes/IntroScene';
import SpritTestScene from './scenes/SpritTestScene';

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

    scene: [GameScene, OptionsScene, IntroScene, SpritTestScene]
};

new Phaser.Game(config);
