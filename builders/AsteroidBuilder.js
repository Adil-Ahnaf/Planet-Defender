export class AsteroidBuilder {
    constructor() {
        this.asteroid = {};  // Initialize a new asteroid object
    }

    setSize(sizeCategory) {
        const SMALL_ASTEROID_SIZE = 0.03;
        const MEDIUM_ASTEROID_SIZE = 0.08;
        const LARGE_ASTEROID_SIZE = 0.12;

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

        this.asteroid.scale = scale;
        this.asteroid.originalSize = originalSize;
        return this;
    }

    // Set the position of the asteroid
    setPosition(x, y) {
        this.asteroid.x = x;
        this.asteroid.y = y;
        return this;
    }

    // Set the velocity of the asteroid
    setVelocity(speed, angle) {
        this.asteroid.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        return this;
    }

    // Set angular velocity
    setAngularVelocity(angularVelocity) {
        this.asteroid.angularVelocity = angularVelocity;
        return this;
    }

    build() {
        return this.asteroid;
    }
}
