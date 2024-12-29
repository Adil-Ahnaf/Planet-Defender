export class AlienSoldierBuilder {
    constructor(scene) {
        this.scene = scene;  // Store the scene object
        this.reset();
    }

    reset() {
        // Initialize default properties for the alien soldier
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.speed = 100;
        this.health = 100;
    }

    // Set position
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    // Set scale (size)
    setScale(scale) {
        this.scale = scale;
        return this;
    }

    // Set speed of movement
    setSpeed(speed) {
        this.speed = speed;
        return this;
    }

    // Set health
    setHealth(health) {
        this.health = health;
        return this;
    }

    // Build the final Alien Soldier object
    build() {
        const alienSoldier = {
            x: this.x,
            y: this.y,
            scale: this.scale,
            speed: this.speed,
            health: this.health,
            sprite: null,  // Placeholder for sprite or physics body
        };

        // Create the actual sprite or physics body
        alienSoldier.sprite = this.createSprite(alienSoldier);

        return alienSoldier;
    }

    // Create the sprite for the alien soldier
    createSprite(alienSoldier) {
        // Check if the scene exists and has the physics system
        if (!this.scene || !this.scene.physics) {
            throw new Error('Scene is not properly initialized or does not have physics.');
        }

        const sprite = this.scene.physics.add.sprite(alienSoldier.x, alienSoldier.y, 'alienSoldier');
        sprite.setScale(alienSoldier.scale);
        sprite.setVelocity(Phaser.Math.Between(-alienSoldier.speed, alienSoldier.speed), Phaser.Math.Between(-alienSoldier.speed, alienSoldier.speed));
        sprite.health = alienSoldier.health;

        return sprite;
    }
}
