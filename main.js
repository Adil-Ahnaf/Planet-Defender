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

let startButton, spaceship, bullets, asteroids;
let angle = 0, radius = 200;
let explosionSound; // Declare a variable for the explosion sound
let gameStarted = false; // Track if the game has started

function preload() {
    // Load assets
    this.load.image('space', 'images/space.png');
    this.load.image('glow', 'images/glow.png');
    this.load.image('spaceship', 'images/spaceship_player.png');
    this.load.image('bullet', 'images/bullet.png');
    this.load.image('earth', 'images/earth.png');
    this.load.image('start', 'images/start.png');
    this.load.image('asteroid', 'images/asteroid.png');
    this.load.image('asteroid_destroyed', 'images/asteroid_destroyed.png');
    this.load.audio('backgroundMusic', 'audios/background-music.mp3');
    this.load.audio('explosionMusic', 'audios/explosion-music.mp3');
}

function create() {
    const { width, height } = this.scale;

    // Add background
    const background = this.add.image(0, 0, 'space').setOrigin(0, 0);
    background.setDisplaySize(width, height);

    // Add glow image behind Earth with significantly reduced scale
    const glow = this.add.image(width / 2, height / 2, 'glow');
    glow.setScale(Math.min(width, height) / 1000); // Significantly smaller glow
    glow.setAlpha(0.1);

    // Add Earth image with a much smaller size
    const earth = this.add.image(width / 2, height / 2, 'earth');
    earth.setScale(Math.min(width, height) / 2000); // Much smaller Earth

    // Add spaceship image inside the glow, initially hidden
    spaceship = this.add.image(width / 2, height / 2 - 100, 'spaceship'); // Inside the glow
    spaceship.setScale(0.2); // Significantly smaller spaceship
    spaceship.setDepth(1); // Ensure it appears above Earth
    spaceship.setVisible(false); // Initially hide the spaceship

    // Handle mouse movement for spaceship rotation
    this.input.on('pointermove', (pointer) => {
        if (!gameStarted) return; // Do nothing if the game hasn't started

        const angle = Phaser.Math.Angle.Between(
            earth.x,
            earth.y,
            pointer.x,
            pointer.y
        );
        const radius = 100; // Smaller radius to keep spaceship inside the glow
        spaceship.x = earth.x + Math.cos(angle) * radius;
        spaceship.y = earth.y + Math.sin(angle) * radius;

        // Rotate spaceship to face the pointer
        spaceship.setRotation(angle + Math.PI / 2);
    });

    // Add bullet group
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    });

    // Add asteroid group
    asteroids = this.physics.add.group();

    // Add Start button
    startButton = this.add.image(earth.x, earth.y, 'start').setInteractive();
    startButton.setScale(Math.min(width, height) / 2500);

    // Add button interactions
    startButton.on('pointerdown', () => {
        startButton.destroy(); // Remove the start button
        spaceship.setVisible(true); // Show the spaceship
        gameStarted = true; // Set the game as started
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

    // Fire bullets on mouse click
    this.input.on('pointerdown', () => {
        if (!gameStarted) return; // Prevent firing bullets if the game hasn't started
        fireBullet.call(this);
    });

    // Handle collision between bullets and asteroids
    this.physics.add.collider(bullets, asteroids, (bullet, asteroid) => {
        // Destroy bullet
        bullet.destroy();

        // Play explosion sound effect
        const explosionSound = this.sound.add('explosionMusic');
        explosionSound.play({ volume: 0.5 }); // Adjust volume as needed

        // Replace the asteroid with an explosion effect
        const explosion = this.add.sprite(asteroid.x, asteroid.y, 'asteroid_destroyed');
        explosion.setScale(asteroid.scaleX); // Match the asteroid's size
        explosion.setOrigin(0.5, 0.5);

        // Add an animation for the explosion (fade out and destroy)
        this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: asteroid.scaleX * 1.5, // Slightly enlarge the explosion
            scaleY: asteroid.scaleY * 1.5,
            duration: 500, // Animation duration (ms)
            onComplete: () => explosion.destroy(), // Destroy sprite after animation
        });

        // Destroy the asteroid
        asteroid.destroy();
    });
}

function spawnAsteroids(earth) {
    const { width, height } = this.scale;

    // Repeatedly spawn asteroids
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

            // Create the asteroid
            const asteroid = asteroids.create(x, y, 'asteroid');
            asteroid.setScale(Phaser.Math.FloatBetween(0.05, 0.15) * (Math.min(width, height) / 500));
            const speed = 20 + Phaser.Math.Between(0, 10) * (Math.min(width, height) / 500);
            angle = Phaser.Math.Angle.Between(asteroid.x, asteroid.y, earth.x, earth.y);
            asteroid.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            asteroid.setAngularVelocity(10);
        },
        loop: true,
    });

    // Check for overlap with Earth
    this.physics.add.overlap(asteroids, earth, () => {
        alert('Game Over! The Earth has been hit!');
        this.scene.restart();
    });
}

function fireBullet() {
    const bullet = bullets.get(spaceship.x, spaceship.y);
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setScale(0.02);
        bullet.setOrigin(0.5, 0.5);

        const bulletOffsetX = Math.cos(spaceship.rotation - Math.PI / 2) * 20;
        const bulletOffsetY = Math.sin(spaceship.rotation - Math.PI / 2) * 20;

        bullet.setPosition(spaceship.x + bulletOffsetX, spaceship.y + bulletOffsetY);
        bullet.setRotation(spaceship.rotation - Math.PI / 2);

        const bulletSpeed = 500;
        bullet.body.setVelocity(
            Math.cos(spaceship.rotation - Math.PI / 2) * bulletSpeed,
            Math.sin(spaceship.rotation - Math.PI / 2) * bulletSpeed
        );

        bullet.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;
        bullet.body.world.on('worldbounds', (body) => {
            if (body.gameObject === bullet) {
                bullet.destroy();
            }
        });
    }
}
function update() {
    // Continuous game logic
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
