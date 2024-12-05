// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE, // Automatically resize with screen
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game on the screen
    },
    parent: 'gameContainer',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
        resize: resize
    },
};

// Initialize the Phaser Game
const game = new Phaser.Game(config);

let startButton, spaceship, angle = 0, radius = 200;

function preload() {
    // Load assets
    this.load.image('space', 'images/space.png');
    this.load.image('glow', 'images/glow.png');
    this.load.image('spaceship', 'images/spaceship_player.png');
    this.load.image('earth', 'images/earth.png');
    this.load.image('start', 'images/start.png');
    this.load.image('asteroid', 'images/asteroid.png');
    this.load.audio('backgroundMusic', 'audios/background-music.mp3');
}

function create() {
    const { width, height } = this.scale;

    // Add background
    const background = this.add.image(0, 0, 'space').setOrigin(0, 0);
    background.setDisplaySize(width, height);

    // Add glow image behind Earth
    const glow = this.add.image(width / 2, height / 2, 'glow');
    glow.setScale(Math.min(width, height) / 500); // Scale based on smaller dimension
    glow.setAlpha(0.1);

    // Add Earth image
    const earth = this.add.image(width / 2, height / 2, 'earth');
    earth.setScale(Math.min(width, height) / 1000); // Proportional scaling

    // Add spaceship image
    const spaceship = this.add.image(width / 2, height / 2 - 200, 'spaceship');
    spaceship.setScale(0.5); // Increase this value to make it larger
    spaceship.setDepth(1); // Ensure it appears above Earth

    // Handle mouse movement for spaceship rotation
    this.input.on('pointermove', (pointer) => {
        const angle = Phaser.Math.Angle.Between(
            earth.x,
            earth.y,
            pointer.x,
            pointer.y
        );
        const radius = 200; // Distance from Earth
        spaceship.x = earth.x + Math.cos(angle) * radius;
        spaceship.y = earth.y + Math.sin(angle) * radius;

        // Rotate spaceship to face the pointer
        spaceship.setRotation(angle + Math.PI / 2);
    });

    // Add Start button
    startButton = this.add.image(earth.x, earth.y, 'start').setInteractive();
    startButton.setScale(Math.min(width, height) / 2500);

    // Add button interactions
    startButton.on('pointerdown', () => {
        startButton.destroy();
        const music = this.sound.add('backgroundMusic');
        music.play({ loop: true, volume: 0.5 });
        spawnAsteroids.call(this, earth);
    });

    startButton.on('pointerover', () => {
        startButton.setScale(Math.min(width, height) / 2300);
    });

    startButton.on('pointerout', () => {
        startButton.setScale(Math.min(width, height) / 2500);
    });
}

function spawnAsteroids(earth) {
    const asteroids = this.physics.add.group();
    const { width, height } = this.scale;

    this.time.addEvent({
        delay: 3000,
        callback: () => {
            let x, y, angle, edge;
            let spawnSuccessful = false;

            while (!spawnSuccessful) {
                edge = Phaser.Math.Between(0, 7);
                switch (edge) {
                    case 0: x = Phaser.Math.Between(0, width); y = -50; break;
                    case 1: x = Phaser.Math.Between(0, width); y = height + 50; break;
                    case 2: x = -50; y = Phaser.Math.Between(0, height); break;
                    case 3: x = width + 50; y = Phaser.Math.Between(0, height); break;
                    default: x = Phaser.Math.Between(0, width); y = -50;
                }

                spawnSuccessful = !asteroids.getChildren().some((asteroid) => {
                    const distance = Phaser.Math.Distance.Between(x, y, asteroid.x, asteroid.y);
                    return distance < Math.min(width, height) / 20;
                });
            }

            const asteroid = asteroids.create(x, y, 'asteroid');
            asteroid.setScale(Phaser.Math.FloatBetween(0.05, 0.15) * (Math.min(width, height) / 500));
            const speed = 20 + Phaser.Math.Between(0, 10) * (Math.min(width, height) / 500);
            angle = Phaser.Math.Angle.Between(asteroid.x, asteroid.y, earth.x, earth.y);
            asteroid.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            asteroid.setAngularVelocity(10);
        },
        loop: true,
    });

    this.physics.add.overlap(asteroids, earth, () => {
        alert('Game Over! The Earth has been hit!');
        this.scene.restart();
    });
}

function update() {
    // Any continuous game logic
}

function resize() {
    const { width, height } = this.scale;

    // Resize background
    const background = this.children.getByName('background');
    if (background) {
        background.setDisplaySize(width, height);
    }

    // Reposition and rescale Earth
    const earth = this.children.getByName('earth');
    if (earth) {
        earth.setPosition(width / 2, height / 2);
        earth.setScale(Math.min(width, height) / 1000);
    }

    // Reposition and rescale Start button
    const startButton = this.children.getByName('startButton');
    if (startButton) {
        startButton.setPosition(width / 2, height / 2);
        startButton.setScale(Math.min(width, height) / 2500);
    }
}
