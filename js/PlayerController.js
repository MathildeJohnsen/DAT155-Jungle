
import * as THREE from 'three';

export class PlayerController {
    constructor(camera, terrain, domElement) {
        this.camera = camera;
        this.terrain = terrain;
        this.domElement = domElement;

        this.moveSpeed = 8;
        this.playerHeight = 1.7;

        this.keys = {};
        this.yaw = 0;
        this.pitch = 0;

        // Tastatur
        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        // Klikk for å aktivere musestyring
        domElement.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                domElement.requestPointerLock();
            }
        });

        // Musestyring
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement !== domElement) {
                return;
            }

            const sensitivity = 0.002;

            this.yaw -= event.movementX * sensitivity;
            this.pitch -= event.movementY * sensitivity;

            this.pitch = THREE.MathUtils.clamp(
                this.pitch,
                -Math.PI / 2 + 0.1,
                Math.PI / 2 - 0.1
            );

            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
        });
    }

    update(deltaTime) {
        const direction = new THREE.Vector3();

        // Fremover og bakover
        if (this.keys['KeyW']) direction.z -= 1;
        if (this.keys['KeyS']) direction.z += 1;

        // Sideveis
        if (this.keys['KeyA']) direction.x -= 1;
        if (this.keys['KeyD']) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();

            // Roter bevegelsen etter kameraets retning
            direction.applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                this.yaw
            );

            this.camera.position.addScaledVector(
                direction,
                this.moveSpeed * deltaTime
            );
        }

        // Hold spilleren innenfor terrenget
        const margin = 2;

        this.camera.position.x = THREE.MathUtils.clamp(
            this.camera.position.x,
            -this.terrain.width / 2 + margin,
            this.terrain.width / 2 - margin
        );

        this.camera.position.z = THREE.MathUtils.clamp(
            this.camera.position.z,
            -this.terrain.depth / 2 + margin,
            this.terrain.depth / 2 - margin
        );

        // Følg terrenghøyden
        const groundHeight = this.terrain.getHeight(
            this.camera.position.x,
            this.camera.position.z
        );

        this.camera.position.y =
            groundHeight + this.playerHeight;
    }
}
