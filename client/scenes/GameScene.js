import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {

    constructor() {
        super('game-scene');
    }

    preload() {

    }

    create() {

        this.add.text(500, 500, 'Phaser funcionando', {
            fontSize: '32px',
            color: '#ffffff'
        })

    }

    update() {

    }

}