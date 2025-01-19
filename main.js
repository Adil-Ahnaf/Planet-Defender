import { AsteroidBuilder } from "./builders/AsteroidBuilder.js";

// Phaser Game Configuration
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  parent: "gameContainer",
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
    resize: resize,
  },
};

// Initialize the Phaser Game
const game = new Phaser.Game(config);

let startButton, spaceship, bullets, asteroids, alienSoldiers, alienBoss;
let angle = 0;
let explosionSound;
let gameStarted = false;
let backgroundMusic;
let gameOverFlag = false;
let score = 0;
let scoreText;

function preload() {
  // Load assets
  this.load.image("space", "images/space.png");
  this.load.image("glow", "images/glow.png");
  this.load.image("spaceship", "images/spaceship_player.png");
  this.load.image("bullet", "images/bullet.png");
  this.load.image("earth", "images/earth.png");
  this.load.image("start", "images/start.png");
  this.load.image("game_over", "images/game_over.png");
  this.load.audio("backgroundMusic", "audios/background-music.mp3");
  this.load.audio("explosionMusic", "audios/explosion-music.mp3");
  this.load.audio("gameOverMusic", "audios/game_over_music.mp3");
  this.load.image("asteroid", "images/asteroid.png");
  this.load.image("alienSoldier", "images/alien-soldier.png");
  this.load.image("alienBoss", "images/big-boss.png");
  this.load.image("destroyed", "images/destroyed.png");
}

function create() {
  const { width, height } = this.scale;

  // Add background
  const background = this.add.image(0, 0, "space").setOrigin(0, 0);
  background.setDisplaySize(width, height);

  // Add glow image behind Earth with significantly reduced scale
  this.glow = this.physics.add.staticImage(width / 2, height / 2, "glow");
  this.glow.setScale(Math.min(width, height) / 750);
  this.glow.setAlpha(0.18);

  // Add Earth image with a much smaller size
  const earth = this.physics.add.staticImage(width / 2, height / 2, "earth");
  earth.setScale(Math.min(width, height) / 2000);
  earth.setCircle(earth.displayWidth / 2);
  earth.setOrigin(0.5, 0.5);

  // Add spaceship image inside the glow, initially hidden
  spaceship = this.add.image(width / 2, height / 2 - 100, "spaceship");
  spaceship.setScale(0.2);
  spaceship.setDepth(1);
  spaceship.setVisible(false);

  // Handle mouse movement for spaceship rotation
  this.input.on("pointermove", (pointer) => {
    if (!gameStarted) return;

    // Calculate the angle between the Earth and the pointer
    angle = Phaser.Math.Angle.Between(earth.x, earth.y, pointer.x, pointer.y);

    // Define the orbit radius for the spaceship to move around the Earth
    const orbitRadius = 100;

    // Calculate the target position based on the angle and orbit radius
    const targetX = earth.x + Math.cos(angle) * orbitRadius;
    const targetY = earth.y + Math.sin(angle) * orbitRadius;

    // Interpolate the spaceship's position for smoother and slower movement
    const lerpFactor = 0.05;
    spaceship.x = Phaser.Math.Linear(spaceship.x, targetX, lerpFactor);
    spaceship.y = Phaser.Math.Linear(spaceship.y, targetY, lerpFactor);

    // Rotate the spaceship to face the pointer
    spaceship.setRotation(angle + Math.PI / 2);
  });

  // Add game object
  bullets = this.physics.add.group({
    defaultKey: "bullet",
    maxSize: 10,
  });
  asteroids = this.physics.add.group();
  alienSoldiers = this.physics.add.group();
  alienBoss = this.physics.add.group();

  scoreText = this.add.text(10, 10, `Score: ${score}`, {
    fontSize: "20px",
    fill: "#ffffff",
  });

  // Add Start button
  startButton = this.add.image(earth.x, earth.y, "start").setInteractive();
  startButton.setScale(Math.min(width, height) / 4000);

  // Add button interactions
  startButton.on("pointerdown", () => {
    const music = this.sound.add("backgroundMusic");
    music.play({ loop: true, volume: 0.5 });

    startButton.destroy();
    spaceship.setVisible(true);
    gameStarted = true;

    spawnAsteroids.call(this, earth);
    //spawnalienSoldiers.call(this, earth);
    //spawnAlienBoss.call(this, earth);
  });

  startButton.on("pointerover", () => {
    startButton.setScale(Math.min(width, height) / 3500);
  });

  startButton.on("pointerout", () => {
    startButton.setScale(Math.min(width, height) / 4000);
  });

  // Fire bullets on mouse click
  this.input.on("pointerdown", () => {
    if (!gameStarted || gameOverFlag) return;
    fireBullet.call(this);
  });

  // Handle collision between bullets and asteroids
  this.physics.add.collider(bullets, asteroids, (bullet, asteroid) => {
    console.log("Called for asteroid");
    // Destroy bullet
    bullet.destroy();

    // Play explosion sound effect
    explosionSound = this.sound.add("explosionMusic");
    explosionSound.play({ volume: 0.5 }); // Adjust volume as needed

    // Replace the asteroid with an explosion effect
    const explosion = this.add.sprite(asteroid.x, asteroid.y, "destroyed");
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
    if (asteroidSize === "small") {
      score += 1; // Small asteroid gives 1 point
    } else if (asteroidSize === "medium") {
      score += 3; // Medium asteroid gives 3 points
    } else {
      score += 5; // Large asteroid gives 5 points
    }
    updateScoreText();
  });

  // Handle collision between bullets and alienSoldier
  this.physics.add.collider(bullets, alienSoldiers, (bullet, alienSoldier) => {
    console.log("Called for helmet man");

    // Destroy bullet
    bullet.destroy();

    // Play explosion sound
    explosionSound = this.sound.add("explosionMusic");
    explosionSound.play({ volume: 0.5 });

    // Replace alienSoldier with an explosion effect
    const explosion = this.add.sprite(
      alienSoldier.x,
      alienSoldier.y,
      "destroyed"
    );
    explosion.setScale(alienSoldier.scaleX);
    explosion.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scaleX: alienSoldier.scaleX * 1.5,
      scaleY: alienSoldier.scaleY * 1.5,
      duration: 500,
      onComplete: () => explosion.destroy(),
    });

    alienSoldier.destroy();

    score += 10;
    updateScoreText();
  });

  // Handle overlap between bullets and alienBoss
  this.physics.add.overlap(bullets, alienBoss, (bullet, boss) => {
    console.log("Collision detected with asteroid");

    // Destroy the bullet
    bullet.destroy();

    // Play explosion sound effect
    explosionSound = this.sound.add("explosionMusic");
    explosionSound.play({ volume: 0.5 }); // Adjust volume as needed

    // Check or initialize the asteroid's hit count
    if (!boss.hitCount) {
      boss.hitCount = 0; // Initialize if not already set
    }

    // Increment the asteroid's hit count
    boss.hitCount++;

    // If the asteroid has been hit twice, destroy it
    if (boss.hitCount >= 3) {
      // Replace the asteroid with an explosion effect
      const explosion = this.add.sprite(boss.x, boss.y, "destroyed");
      explosion.setScale(boss.scaleX); // Match the asteroid's size
      explosion.setOrigin(0.5, 0.5);

      // Add an animation for the explosion (fade out and destroy)
      this.tweens.add({
        targets: explosion,
        alpha: 0,
        scaleX: boss.scaleX * 1.5, // Slightly enlarge the explosion
        scaleY: boss.scaleY * 1.5,
        duration: 500, // Animation duration (ms)
        onComplete: () => explosion.destroy(), // Destroy sprite after animation
      });

      // Destroy the asteroid
      boss.destroy();
      score += 20;
      updateScoreText();
    } else {
      // If not destroyed, provide feedback (e.g., change asteroid color briefly)
      boss.setTint(0xff0000); // Red tint for hit feedback
      this.time.delayedCall(200, () => boss.clearTint());
    }
  });

  this.earth = earth;
  backgroundMusic = this.sound.add("backgroundMusic");
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
          case 0:
            x = Phaser.Math.Between(0, width);
            y = -50;
            break;
          case 1:
            x = Phaser.Math.Between(0, width);
            y = height + 50;
            break;
          case 2:
            x = -50;
            y = Phaser.Math.Between(0, height);
            break;
          case 3:
            x = width + 50;
            y = Phaser.Math.Between(0, height);
            break;
          default:
            x = Phaser.Math.Between(0, width);
            y = -50;
        }

        spawnSuccessful = !asteroids.getChildren().some((asteroid) => {
          const distance = Phaser.Math.Distance.Between(
            x,
            y,
            asteroid.x,
            asteroid.y
          );
          return distance < Math.min(width, height) / 20;
        });
      }

      // Randomly choose a size category for the asteroid
      const sizeCategory = Phaser.Math.Between(1, 3);

      // Use the builder to create the asteroid
      const asteroidBuilder = new AsteroidBuilder();
      const asteroid = asteroidBuilder
        .setSize(sizeCategory)
        .setPosition(x, y)
        .setVelocity(
          20 + Phaser.Math.Between(0, 10) * (Math.min(width, height) / 500),
          Phaser.Math.Angle.Between(x, y, earth.x, earth.y)
        )
        .setAngularVelocity(10)
        .build();

      // Create the asteroid in the game world
      const asteroidSprite = asteroids.create(
        asteroid.x,
        asteroid.y,
        "asteroid"
      );
      asteroidSprite.setScale(asteroid.scale * (Math.min(width, height) / 500));
      asteroidSprite.originalScale = asteroid.originalSize; // Store the original size category

      // Set the asteroid's velocity and angular velocity
      asteroidSprite.setVelocity(asteroid.velocity.x, asteroid.velocity.y);
      asteroidSprite.setAngularVelocity(asteroid.angularVelocity);
    },
    loop: true,
  });
}

function spawnalienSoldiers(earth) {
  const { width, height } = this.scale;

  // Repeatedly spawn alien solider
  this.time.addEvent({
    delay: 5000,
    callback: () => {
      let x, y, edge;
      let spawnSuccessful = false;

      while (!spawnSuccessful) {
        edge = Phaser.Math.Between(0, 3);
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
        spawnSuccessful = !alienSoldiers.getChildren().some((alienSoldier) => {
          const distance = Phaser.Math.Distance.Between(
            x,
            y,
            alienSoldier.x,
            alienSoldier.y
          );
          // Prevent spawn too close to others
          return distance < Math.min(width, height) / 20;
        });
      }

      // Create the helmet man sprite and set its scale
      const alienSoldier = alienSoldiers.create(x, y, "alienSoldier");
      alienSoldier.setScale(0.1 * (Math.min(width, height) / 500));

      // Calculate the direction towards the Earth
      angle = Phaser.Math.Angle.Between(
        alienSoldier.x,
        alienSoldier.y,
        earth.x,
        earth.y
      );
      const speed =
        20 + Phaser.Math.Between(0, 10) * (Math.min(width, height) / 500);

      // Set the velocity straight toward the Earth
      alienSoldier.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );

      // No angular velocity (no rotation)
      alienSoldier.setAngularVelocity(0);
    },
    loop: true,
  });
}

function spawnAlienBoss(earth) {
  const { width, height } = this.scale;

  // Repeatedly spawn alien solider
  this.time.addEvent({
    delay: 9000,
    callback: () => {
      let x, y, edge;
      let spawnSuccessful = false;

      while (!spawnSuccessful) {
        edge = Phaser.Math.Between(0, 3);
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
        spawnSuccessful = !alienBoss.getChildren().some((boss) => {
          const distance = Phaser.Math.Distance.Between(x, y, boss.x, boss.y);
          // Prevent spawn too close to others
          return distance < Math.min(width, height) / 20;
        });
      }

      // Create the helmet man sprite and set its scale
      const boss = alienBoss.create(x, y, "alienBoss");
      boss.setScale(0.25 * (Math.min(width, height) / 700));

      // Calculate the direction towards the Earth
      angle = Phaser.Math.Angle.Between(boss.x, boss.y, earth.x, earth.y);
      const speed =
        20 + Phaser.Math.Between(0, 10) * (Math.min(width, height) / 500);

      // Set the velocity straight toward the Earth
      boss.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      // No angular velocity (no rotation)
      boss.setAngularVelocity(0);
    },
    loop: true,
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

    bullet.setPosition(
      spaceship.x + bulletOffsetX,
      spaceship.y + bulletOffsetY
    );
    bullet.setRotation(spaceship.rotation - Math.PI / 2);

    const bulletSpeed = 500;
    bullet.body.setVelocity(
      Math.cos(spaceship.rotation - Math.PI / 2) * bulletSpeed,
      Math.sin(spaceship.rotation - Math.PI / 2) * bulletSpeed
    );

    bullet.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
    bullet.body.world.on("worldbounds", (body) => {
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
      const asteroidSize = asteroid.originalScale; // Use originalScale to determine size

      // Only check small asteroids for destruction within the glow area
      if (asteroidSize == "small") {
        const glowDistance = Phaser.Math.Distance.Between(
          this.glow.x,
          this.glow.y,
          asteroid.x,
          asteroid.y
        );

        // Check if the asteroid's entire size is within the glow area
        if (
          glowDistance <
          this.glow.displayWidth / 2 - asteroid.displayWidth / 2
        ) {
          // Log "Hello" when a small asteroid fully enters the glow area
          console.log("Hello");
          createDestructionEffect.call(this, asteroid, asteroid.scale);
          asteroid.destroy();
          score -= 1;
          updateScoreText.call(this);
        }
      }

      // If the asteroid is within the Earth's radius, trigger the game over for medium and large asteroids
      const earthDistance = Phaser.Math.Distance.Between(
        this.earth.x,
        this.earth.y,
        asteroid.x,
        asteroid.y
      );

      if (earthDistance < this.earth.displayWidth / 2) {
        // Call gameOver only for medium and large asteroids
        if (asteroidSize == "medium" || asteroidSize == "large") {
          gameOver.call(this);
        }
      }
    });
  }

  // Ensure there are alienSoldiers to check
  if (alienSoldiers && alienSoldiers.getChildren().length > 0) {
    alienSoldiers.getChildren().forEach((alienSoldier) => {
      const distance = Phaser.Math.Distance.Between(
        this.earth.x,
        this.earth.y,
        alienSoldier.x,
        alienSoldier.y
      );
      if (distance < this.earth.displayWidth / 2) {
        gameOver.call(this);
      }
    });
  }

  // Ensure there are alienBoss to check
  if (alienBoss && alienBoss.getChildren().length > 0) {
    alienBoss.getChildren().forEach((boss) => {
      const distance = Phaser.Math.Distance.Between(
        this.earth.x,
        this.earth.y,
        boss.x,
        boss.y
      );
      if (distance < this.earth.displayWidth / 2) {
        gameOver.call(this);
      }
    });
  }
}

// Generalized function to create destruction effect for both asteroids and helmet men
function createDestructionEffect(target, size) {
  // Create the destruction image at the target's position
  const destructionImage = this.add.image(target.x, target.y, "destroyed");

  // Set the scale of the destruction image based on the target's size
  destructionImage.setScale(size); // The scale is proportional to the target's size

  // Optionally, set the opacity to full
  destructionImage.setAlpha(1); // Full opacity

  // Fade out the destruction image over time
  this.tweens.add({
    targets: destructionImage,
    alpha: 0,
    duration: 500, // Time for the image to fade out
    onComplete: () => {
      destructionImage.destroy(); // Destroy the image after fading out
    },
  });
}

function gameOver() {
  if (gameOverFlag) return; // Prevent multiple triggers
  gameOverFlag = true; // Set the flag to true once game over has started

  const { width, height } = this.scale;
  const gameOverImage = this.add.image(width / 2, height / 2, "game_over");
  gameOverImage.setScale(Math.min(width, height) / 1000);
  gameOverImage.setDepth(2);

  // Hide the spaceship (player) after collision
  spaceship.setVisible(false);

  // Stop all sounds and play collision sound
  this.sound.stopAll(); // Stop all sounds
  if (!this.sound.get("gameOverMusic")) {
    // Check if gameOverMusic is not already playing
    const gameOverSound = this.sound.add("gameOverMusic");
    gameOverSound.play({
      volume: 0.8,
    });
  }
  // Reset the score to 0
  score = 0;
  updateScoreText();

  // Restart the game after a delay
  this.time.delayedCall(
    6000,
    () => {
      gameOverFlag = false; // Reset the game over flag
      gameOverImage.destroy(); // Remove the game over image
      this.scene.restart();
    },
    [],
    this
  ); // Pass `this` as the context
}

function resize() {
  const { width, height } = this.scale;

  // Resize background
  const background = this.children.getByName("background");
  if (background) {
    background.setDisplaySize(width, height);
  }

  // Reposition and rescale Earth
  const earth = this.children.getByName("earth");
  if (earth) {
    earth.setPosition(width / 2, height / 2);
    earth.setScale(Math.min(width, height) / 1000);
  }

  // Reposition and rescale Start button
  const startButton = this.children.getByName("startButton");
  if (startButton) {
    startButton.setPosition(width / 2, height / 2);
    startButton.setScale(Math.min(width, height) / 3000);
  }
}
