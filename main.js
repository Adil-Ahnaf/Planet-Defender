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

let startButton, spaceship, bullets, asteroids, helmetMen;
let angle = 0, radius = 200;
let explosionSound; // Declare a variable for the explosion sound
let gameStarted = false; // Track if the game has started
let backgroundMusic;
let gameOverFlag = false; // This flag ensures game over happens only once

let score = 0;
let scoreText;


// Global Variables for Asteroid Sizes
const SMALL_ASTEROID_SIZE = 0.03;
const MEDIUM_ASTEROID_SIZE = 0.08;
const LARGE_ASTEROID_SIZE = 0.12;

let hasina;
let hasinaHitCount = 0; // Counter for hits on Hasina
let hasinaHitProcessed = false; // Flag to prevent multiple hits in the same frame

function preload() {
    // Load assets
    this.load.image('space', 'images/space.png');
    this.load.image('glow', 'images/glow.png');
    this.load.image('spaceship', 'images/spaceship_player.png');
    this.load.image('bullet', 'images/bullet.png');
    this.load.image('earth', 'images/earth.png');
    this.load.image('start', 'images/start.png');
    this.load.image('asteroid', 'images/asteroid.png');
    this.load.image('destroyed', 'images/destroyed.png');
    this.load.image('game_over', 'images/game_over.png');
    this.load.audio('backgroundMusic', 'audios/background-music.mp3');
    this.load.audio('explosionMusic', 'audios/explosion-music.mp3');
    this.load.audio('gameOverMusic', 'audios/game_over_music.mp3');
    this.load.image('helmet_man', 'images/helmet_man.png');
    this.load.image('hasina', 'images/hasina.png');
}

function create() {
    const { width, height } = this.scale;

    // Add background
    const background = this.add.image(0, 0, 'space').setOrigin(0, 0);
    background.setDisplaySize(width, height);

    // Add glow image behind Earth with significantly reduced scale
    this.glow = this.add.image(width / 2, height / 2, 'glow');
    this.glow.setScale(Math.min(width, height) / 1000);
    this.glow.setAlpha(0.3);


    // Add Earth image with a much smaller size
    const earth = this.physics.add.staticImage(width / 2, height / 2, 'earth');
    earth.setScale(Math.min(width, height) / 2000);
    earth.setCircle(earth.displayWidth / 2); // Circular collision boundary
    earth.setOrigin(0.5, 0.5); // Center the Earth

    // Add spaceship image inside the glow, initially hidden
    spaceship = this.add.image(width / 2, height / 2 - 100, 'spaceship'); // Inside the glow
    spaceship.setScale(0.2); // Significantly smaller spaceship
    spaceship.setDepth(1); // Ensure it appears above Earth
    spaceship.setVisible(false); // Initially hide the spaceship

    // Handle mouse movement for spaceship rotation
    this.input.on('pointermove', (pointer) => {
        if (!gameStarted) return; // Do nothing if the game hasn't started

        // Calculate the angle between the Earth and the pointer
        const angle = Phaser.Math.Angle.Between(earth.x, earth.y, pointer.x, pointer.y);

        // Define the orbit radius for the spaceship to move around the Earth
        const orbitRadius = 100; // Keep this value consistent for a circular orbit

        // Calculate the target position based on the angle and orbit radius
        const targetX = earth.x + Math.cos(angle) * orbitRadius;
        const targetY = earth.y + Math.sin(angle) * orbitRadius;

        // Interpolate the spaceship's position for smoother and slower movement
        const lerpFactor = 0.05; // Lower factor for slower interpolation
        spaceship.x = Phaser.Math.Linear(spaceship.x, targetX, lerpFactor);
        spaceship.y = Phaser.Math.Linear(spaceship.y, targetY, lerpFactor);

        // Rotate the spaceship to face the pointer
        spaceship.setRotation(angle + Math.PI / 2);
    });

    // Add bullet group
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    });

    asteroids = this.physics.add.group();
    helmetMen = this.physics.add.group();
    hasina = this.physics.add.sprite(-100, -100, 'hasina');
    hasina.setScale(0.3 * (Math.min(width, height) / 500)); // Make Hasina larger
    hasina.setOrigin(0.5, 0.5); // Center the origin


    scoreText = this.add.text(10, 10, `Score: ${score}`, {
        fontSize: '20px',
        fill: '#ffffff',
    });

    // Add Start button
    startButton = this.add.image(earth.x, earth.y, 'start').setInteractive();
    startButton.setScale(Math.min(width, height) / 4000);

    // Add button interactions
    startButton.on('pointerdown', () => {
        startButton.destroy(); // Remove the start button
        spaceship.setVisible(true); // Show the spaceship
        gameStarted = true; // Set the game as started
        const music = this.sound.add('backgroundMusic');
        music.play({ loop: true, volume: 0.5 });
        spawnAsteroids.call(this, earth);
        spawnHelmetMen.call(this, earth);
        spawnHasina.call(this, earth);

    });

    startButton.on('pointerover', () => {
        startButton.setScale(Math.min(width, height) / 3500);
    });

    startButton.on('pointerout', () => {
        startButton.setScale(Math.min(width, height) / 4000);
    });

    // Fire bullets on mouse click
    this.input.on('pointerdown', () => {
        if (!gameStarted || gameOverFlag) return; // Prevent firing bullets if the game hasn't started or if the game is over
        fireBullet.call(this);

    });

    // Handle collision between bullets and asteroids
    this.physics.add.collider(bullets, asteroids, (bullet, asteroid) => {
        console.log("Called for asteroid");
        // Destroy bullet
        bullet.destroy();

        // Play explosion sound effect
        const explosionSound = this.sound.add('explosionMusic');
        explosionSound.play({ volume: 0.5 }); // Adjust volume as needed

        // Replace the asteroid with an explosion effect
        const explosion = this.add.sprite(asteroid.x, asteroid.y, 'destroyed');
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

        // Update score based on original size
        let asteroidSize = asteroid.originalScale;
        if (asteroidSize === 'small') {
            score += 1; // Small asteroid gives 1 point
        } else if (asteroidSize === 'medium') {
            score += 3; // Medium asteroid gives 3 points
        } else {
            score += 5; // Large asteroid gives 5 points
        }
        updateScoreText();
    });

    this.physics.add.collider(bullets, helmetMen, (bullet, helmetMan) => {
        console.log("Called for helmet man");

        // Destroy bullet
        bullet.destroy();

        // Play explosion sound
        const explosionSound = this.sound.add('explosionMusic');
        explosionSound.play({ volume: 0.5 });

        // Replace helmet_man with an explosion effect
        const explosion = this.add.sprite(helmetMan.x, helmetMan.y, 'destroyed');
        explosion.setScale(helmetMan.scaleX); // Match the size
        explosion.setOrigin(0.5, 0.5);

        this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: helmetMan.scaleX * 1.5,
            scaleY: helmetMan.scaleY * 1.5,
            duration: 500,
            onComplete: () => explosion.destroy(),
        });

        helmetMan.destroy();

        score += 10;
        updateScoreText();
    });

    this.physics.add.collider(bullets, hasina, (bullet, hasinaSprite) => {
        // Increment hit count
        hasinaHitCount++;
        console.log(hasinaSprite);

        // Adjust any behavior for hasinaSprite
        // hasinaSprite.setVelocityX(200); // Apply velocity or other logic if needed
        //
        // // Hide the bullet and deactivate it
        hasinaSprite.setVisible(true);
        hasinaSprite.setActive(true);
        bullet.setVisible(false);
        bullet.setActive(false);
    });

    // this.physics.add.collider(bullets, hasina, (bullet, hasina) => {
    //     console.log("Called for hasina");
    //     bullet.destroy();
    //     // // Increment hit count
    //     // hasinaHitCount++;
    //     // hasina.setVisible(true);
    //     // console.log(hasina);
    //     // //hasina.setVisible(true);
    //     // //hasina.setAlpha(1);
    //     //
    //     // hasina.setVelocityX(200);
    //
    // });


    this.earth = earth;
    backgroundMusic = this.sound.add('backgroundMusic');
}


function updateScoreText() {
    if (!gameOverFlag) {
        scoreText.setText(`Score: ${score}`);
    }
}


function spawnAsteroids(earth) {
    const { width, height } = this.scale;

    // Repeatedly spawn asteroids
    this.time.addEvent({
        delay: 3000,
        callback: () => {
            let x, y, edge;
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
            const sizeCategory = Phaser.Math.Between(1, 3); // Randomly choose 1, 2, or 3 for small, medium, or large

            let scale;
            let originalSize;

            if (sizeCategory === 1) {
                scale = SMALL_ASTEROID_SIZE;
                originalSize = 'small';
            } else if (sizeCategory === 2) {
                scale = MEDIUM_ASTEROID_SIZE;
                originalSize = 'medium';
            } else {
                scale = LARGE_ASTEROID_SIZE;
                originalSize = 'large';
            }


            const asteroid = asteroids.create(x, y, 'asteroid');
            asteroid.setScale(scale * (Math.min(width, height) / 500));
            asteroid.originalScale = originalSize; // Store the original size category

            const speed = 20 + Phaser.Math.Between(0, 10) * (Math.min(width, height) / 500);
            const angle = Phaser.Math.Angle.Between(asteroid.x, asteroid.y, earth.x, earth.y);

            asteroid.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            asteroid.setAngularVelocity(10);

        },
        loop: true,
    });
}


function spawnHelmetMen(earth) {
    const { width, height } = this.scale;

    // Repeatedly spawn helmet man
    this.time.addEvent({
        delay: 3000,
        callback: () => {
            let x, y, edge;
            let spawnSuccessful = false;

            while (!spawnSuccessful) {
                edge = Phaser.Math.Between(0, 3);  // 4 edges (top, bottom, left, right)
                switch (edge) {
                    case 0: // Top edge
                        x = Phaser.Math.Between(0, width);
                        y = -50;
                        break;
                    case 1: // Bottom edge
                        x = Phaser.Math.Between(0, width);
                        y = height + 50;
                        break;
                    case 2: // Left edge
                        x = -50;
                        y = Phaser.Math.Between(0, height);
                        break;
                    case 3: // Right edge
                        x = width + 50;
                        y = Phaser.Math.Between(0, height);
                        break;
                }

                // Check if there's enough space to spawn
                spawnSuccessful = !helmetMen.getChildren().some((helmet) => {
                    const distance = Phaser.Math.Distance.Between(x, y, helmet.x, helmet.y);
                    return distance < Math.min(width, height) / 20;  // Prevent spawn too close to others
                });
            }

            // Set the medium size for all helmet men
            const scale = MEDIUM_ASTEROID_SIZE;
            const originalSize = 'medium';

            // Create the helmet man sprite and set its scale
            const helmetMan = helmetMen.create(x, y, 'helmet_man');
            helmetMan.setScale(scale * (Math.min(width, height) / 500));
            helmetMan.originalSize = originalSize;  // Store the original size category

            // Calculate the direction towards the Earth
            const angle = Phaser.Math.Angle.Between(helmetMan.x, helmetMan.y, earth.x, earth.y);
            const speed = 20 + Phaser.Math.Between(0, 10) * (Math.min(width, height) / 500);

            // Set the velocity straight toward the Earth
            helmetMan.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

            // No angular velocity (no rotation)
            helmetMan.setAngularVelocity(0);

        },
        loop: true,
    });
}

function spawnHasina(earth) {
    const { width, height } = this.scale;

    // Randomly choose an edge (top, bottom, left, or right)
    let x, y, edge = Phaser.Math.Between(0, 3);

    switch (edge) {
        case 0: // Top edge
            x = Phaser.Math.Between(0, width);
            y = -50;
            break;
        case 1: // Bottom edge
            x = Phaser.Math.Between(0, width);
            y = height + 50;
            break;
        case 2: // Left edge
            x = -50;
            y = Phaser.Math.Between(0, height);
            break;
        case 3: // Right edge
            x = width + 50;
            y = Phaser.Math.Between(0, height);
            break;
    }

    // Place Hasina at the chosen location
    hasina.setPosition(x, y);

    // Calculate direction towards the Earth
    const angle = Phaser.Math.Angle.Between(x, y, earth.x, earth.y);
    const speed = 5;

    // Move Hasina toward the Earth
    hasina.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
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

    // Ensure there are asteroids to check
    if (asteroids && asteroids.getChildren().length > 0) {
        // Loop through all asteroids
        asteroids.getChildren().forEach((asteroid) => {
            const distance = Phaser.Math.Distance.Between(this.earth.x, this.earth.y, asteroid.x, asteroid.y);

            // If the asteroid is within the Earth's radius, trigger the game over for medium and large asteroids
            if (distance < this.earth.displayWidth / 2) {
                const asteroidSize = asteroid.originalScale; // Use originalScale to determine size
                // Call gameOver only for medium and large asteroids
                if (asteroidSize == 'medium' || asteroidSize == 'large') {  // Medium or large asteroids
                    gameOver.call(this);  // Trigger the game over function
                }

                // Check if the asteroid is small (originalScale <= 0.075) and if it collides with the earth's glow
                if (asteroidSize == 'small') {
                    const glowDistance = Phaser.Math.Distance.Between(this.glow.x, this.glow.y, asteroid.x, asteroid.y);
                    if (glowDistance < this.glow.displayWidth / 2) {
                        createDestructionEffect.call(this, asteroid, asteroid.scale);  // Pass scale for asteroid
                        asteroid.destroy();
                        score -= 1;
                        updateScoreText.call(this);
                    }
                }
            }
        });
    }

    // Ensure there are helmetMen to check
    if (helmetMen && helmetMen.getChildren().length > 0) {
        helmetMen.getChildren().forEach((helmetMan) => {
            const distance = Phaser.Math.Distance.Between(this.earth.x, this.earth.y, helmetMan.x, helmetMan.y);
            if (distance < this.earth.displayWidth / 2) {
                const helmetManSize = helmetMan.scale;
                if (helmetManSize <= 0.105) {
                    createDestructionEffect.call(this, helmetMan, helmetManSize);  // Pass scale for helmet man
                    helmetMan.destroy();
                    score -= 10;
                    updateScoreText.call(this);
                }
            }
        });
    }

    hasinaHitProcessed = false;
    if (hasina) {
        const distance = Phaser.Math.Distance.Between(this.earth.x, this.earth.y, hasina.x, hasina.y);

        // Trigger game over if Hasina reaches the Earth
        if (distance < this.earth.displayWidth / 2) {
            gameOver.call(this);
        }
    }
}

// Generalized function to create destruction effect for both asteroids and helmet men
function createDestructionEffect(target, size) {
    // Create the destruction image at the target's position
    const destructionImage = this.add.image(target.x, target.y, 'destroyed');

    // Set the scale of the destruction image based on the target's size
    destructionImage.setScale(size);  // The scale is proportional to the target's size

    // Optionally, set the opacity to full
    destructionImage.setAlpha(1);  // Full opacity

    // Fade out the destruction image over time
    this.tweens.add({
        targets: destructionImage,
        alpha: 0,
        duration: 500, // Time for the image to fade out
        onComplete: () => {
            destructionImage.destroy();  // Destroy the image after fading out
        }
    });
}



function gameOver() {
    if (gameOverFlag) return; // Prevent multiple triggers
    gameOverFlag = true; // Set the flag to true once game over has started

    const { width, height } = this.scale;
    const gameOverImage = this.add.image(width / 2, height / 2, 'game_over');
    gameOverImage.setScale(Math.min(width, height) / 1000);
    gameOverImage.setDepth(2);

    // Hide the spaceship (player) after collision
    spaceship.setVisible(false);

    // Stop all sounds and play collision sound
    this.sound.stopAll();  // Stop all sounds
    if (!this.sound.get('gameOverMusic')) { // Check if gameOverMusic is not already playing
        const gameOverSound = this.sound.add('gameOverMusic');
        gameOverSound.play({
            volume: 0.8,
        });
    }
    // Reset the score to 0
    score = 0;
    updateScoreText();

    // Restart the game after a delay
    this.time.delayedCall(6000, () => {
        gameOverFlag = false; // Reset the game over flag
        gameOverImage.destroy(); // Remove the game over image
        this.scene.restart();
    }, [], this); // Pass `this` as the context
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
        startButton.setScale(Math.min(width, height) / 3000);
    }
}
