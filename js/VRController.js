
import * as THREE from 'three';

export class VRController {
    constructor(renderer, scene, camera, terrain, collisionManager) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.terrain = terrain;
        this.collisionManager = collisionManager;

        this.moveSpeed = 3;
        this.turnSpeed = 1.5;
        this.playerHeight = 1.7;

        this.rig = new THREE.Group();
        this.scene.add(this.rig);

        this.controllers = [
            renderer.xr.getController(0),
            renderer.xr.getController(1)
        ];

        for (const controller of this.controllers) {
            this.rig.add(controller);
        }

        this.savedPosition = new THREE.Vector3();
        this.savedQuaternion = new THREE.Quaternion();

        renderer.xr.addEventListener('sessionstart', () => {
            this.start();
        });

        renderer.xr.addEventListener('sessionend', () => {
            this.stop();
        });
    }

    start() {
        // Husk posisjonen fra PC-modus
        this.savedPosition.copy(this.camera.position);
        this.savedQuaternion.copy(this.camera.quaternion);

        // Bruk egen gruppe for VR-bevegelse
        this.rig.position.set(
            this.camera.position.x,
            this.terrain.getHeight(
                this.camera.position.x,
                this.camera.position.z
            ),
            this.camera.position.z
        );

        this.rig.rotation.set(0, 0, 0);

        this.rig.add(this.camera);

        // WebXR styrer hodebevegelsene
        this.camera.position.set(0, this.playerHeight, 0);
        this.camera.rotation.set(0, 0, 0);
    }

    stop() {
        // Tilbake til vanlig PC-modus
        this.scene.add(this.camera);
        this.camera.position.copy(this.savedPosition);
        this.camera.quaternion.copy(this.savedQuaternion);
    }

    getAxes(index) {
        const session = this.renderer.xr.getSession();

        if (!session) return null;

        const source = session.inputSources[index];

        if (!source || !source.gamepad) return null;

        const axes = source.gamepad.axes;

        // Vanlige WebXR-kontrollere bruker 2/3,
        // men enkelte bruker 0/1.
        if (axes.length >= 4) {
            return [axes[2], axes[3]];
        }

        if (axes.length >= 2) {
            return [axes[0], axes[1]];
        }

        return null;
    }

    update(deltaTime) {
        if (!this.renderer.xr.isPresenting) return;

        const session = this.renderer.xr.getSession();
        if (!session) return;

        // Finn håndkontrollerne etter handedness
        let leftAxes = null;
        let rightAxes = null;

        for (const source of session.inputSources) {
            if (!source.gamepad) continue;

            const axes = source.gamepad.axes;
            const pair = axes.length >= 4
                ? [axes[2], axes[3]]
                : axes.length >= 2
                    ? [axes[0], axes[1]]
                    : null;

            if (source.handedness === 'left') {
                leftAxes = pair;
            } else if (source.handedness === 'right') {
                rightAxes = pair;
            }
        }

        // Høyre joystick: roter spilleren
        if (rightAxes && Math.abs(rightAxes[0]) > 0.15) {
            this.rig.rotation.y -=
                rightAxes[0] * this.turnSpeed * deltaTime;
        }

        if (!leftAxes) return;

        const inputX = Math.abs(leftAxes[0]) > 0.15
            ? leftAxes[0] : 0;

        const inputZ = Math.abs(leftAxes[1]) > 0.15
            ? leftAxes[1] : 0;

        if (inputX === 0 && inputZ === 0) return;

        const direction = new THREE.Vector3(
            inputX, 0, inputZ
        );

        direction.normalize();

        // Bevegelse relativt til spillerens retning
        direction.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.rig.rotation.y
        );

        direction.multiplyScalar(this.moveSpeed * deltaTime);

        // Hold spilleren innenfor terrenget
        const margin = 2;

        const currentX = this.rig.position.x;
        const currentZ = this.rig.position.z;

        const nextX = THREE.MathUtils.clamp(
            currentX + direction.x,
            -this.terrain.width / 2 + margin,
            this.terrain.width / 2 - margin
        );

        if (this.collisionManager.canMove(
            currentX, currentZ, nextX, currentZ
        )) {
            this.rig.position.x = nextX;
        }

        const nextZ = THREE.MathUtils.clamp(
            this.rig.position.z + direction.z,
            -this.terrain.depth / 2 + margin,
            this.terrain.depth / 2 - margin
        );

        if (this.collisionManager.canMove(
            this.rig.position.x,
            currentZ,
            this.rig.position.x,
            nextZ
        )) {
            this.rig.position.z = nextZ;
        }

        // Følg terrenghøyden
        this.rig.position.y = this.terrain.getHeight(
            this.rig.position.x,
            this.rig.position.z
        );
    }
}
