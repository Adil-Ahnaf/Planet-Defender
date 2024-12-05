// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'gameContainer',
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

let startButton;

function preload() {
    // Load assets
    this.load.image('space', 'images/space.png');
    this.load.image('glow', 'images/glow.png');
    this.load.image('earth', 'images/earth.png');
    this.load.image('start', 'images/start.png');
    this.load.image('asteroid', 'images/asteroid.png');
    this.load.audio('backgroundMusic', 'audios/background-music.mp3');
}

function create() {
    // Add background
    const background = this.add.image(0, 0, 'space');
    background.setOrigin(0, 0);
    background.setDisplaySize(config.width, config.height);

    // Add glow image behind Earth
    const glow = this.add.image(config.width / 2, config.height / 2, 'glow');
    glow.setScale(1);
    glow.setAlpha(0.1);

    // Add Earth image
    const earth = this.add.image(config.width / 2, config.height / 2, 'earth');
    earth.setScale(0.4);

    // Add Start button at the exact same position as Earth
    startButton = this.add.image(earth.x, earth.y, 'start').setInteractive();
    startButton.setScale(0.22);

    // Add interaction for the Start button
    startButton.on('pointerdown', () => {
        startButton.destroy();

        // Play background music
        const music = this.sound.add('backgroundMusic');
        music.play({
            loop: true,
            volume: 0.5,
        });

        // Start spawning asteroids
        spawnAsteroids.call(this, earth);
    });

    // Add hover effect
    startButton.on('pointerover', () => {
        startButton.setScale(0.24);
    });

    startButton.on('pointerout', () => {
        startButton.setScale(0.22);
    });
}

function spawnAsteroids(earth) {
    const asteroids = this.physics.add.group();

    // Generate asteroids at random positions outside the screen with a slower respawn rate
    this.time.addEvent({
        delay: 3000,
        callback: () => {
            let x, y, angle, edge;

            // Avoid overlapping asteroids by checking existing positions
            let spawnSuccessful = false;

            while (!spawnSuccessful) {
                edge = Phaser.Math.Between(0, 7); // 8 possible positions

                // Determine the spawn position based on the edge
                switch (edge) {
                    case 0: // Top edge
                        x = Phaser.Math.Between(0, config.width);
                        y = -50;
                        break;
                    case 1: // Bottom edge
                        x = Phaser.Math.Between(0, config.width);
                        y = config.height + 50;
                        break;
                    case 2: // Left edge
                        x = -50;
                        y = Phaser.Math.Between(0, config.height);
                        break;
                    case 3: // Right edge
                        x = config.width + 50;
                        y = Phaser.Math.Between(0, config.height);
                        break;
                    case 4: // Random top-left corner
                        x = Phaser.Math.Between(0, config.width / 2);
                        y = -50;
                        break;
                    case 5: // Random top-right corner
                        x = Phaser.Math.Between(config.width / 2, config.width);
                        y = -50;
                        break;
                    case 6: // Random bottom-left corner
                        x = Phaser.Math.Between(0, config.width / 2);
                        y = config.height + 50;
                        break;
                    case 7: // Random bottom-right corner
                        x = Phaser.Math.Between(config.width / 2, config.width);
                        y = config.height + 50;
                        break;
                }

                // Check for overlapping with existing asteroids
                spawnSuccessful = !asteroids.getChildren().some((asteroid) => {
                    const distance = Phaser.Math.Distance.Between(x, y, asteroid.x, asteroid.y);
                    return distance < 100; // Ensure a minimum distance of 100px
                });
            }

            const asteroid = asteroids.create(x, y, 'asteroid');

            // Scale the asteroid size randomly
            const scale = Phaser.Math.FloatBetween(0.2, 0.5);
            asteroid.setScale(scale);

            // Reduce speed of the asteroid
            const speed = 30 + Phaser.Math.Between(0, 20);

            // Calculate movement angle towards Earth
            angle = Phaser.Math.Angle.Between(asteroid.x, asteroid.y, earth.x, earth.y);
            asteroid.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

            // Slow asteroid rotation
            asteroid.setAngularVelocity(10);
        },
        loop: true,
    });

    // Add collision detection between asteroids and Earth
    this.physics.add.overlap(asteroids, earth, () => {
        alert('Game Over! The Earth has been hit!');
        this.scene.restart(); // Restart the scene
    });
}

function update() {
    // Any continuous game logic
}

function resize(gameSize, baseSize, displaySize, resolution) {
    // Resize background image
    const background = this.children.getByName('background');
    if (background) {
        background.setDisplaySize(gameSize.width, gameSize.height);
    }

    // Resize Earth and adjust position
    const earth = this.children.getByName('earth');
    if (earth) {
        earth.setPosition(gameSize.width / 2, gameSize.height / 2);
        earth.setScale(0.2);
    }

    // Resize and reposition Start button
    const startButton = this.children.getByName('startButton');
    if (startButton) {
        startButton.setPosition(gameSize.width / 2, gameSize.height / 2 + 100);
        startButton.setScale(0.55);
    }
}
