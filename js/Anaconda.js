
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

export class Anaconda {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.snakes = [];
        this.time = 0;

        this.loadAnacondas();
    }

    loadAnacondas() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/anaconda.glb',
            (gltf) => {
                const original = gltf.scene;

                // Plasseringer rundt i jungelen
                const positions = [
                    [20, -29],
                    [14, -24],
                    [5, -12],
                    [-12, -18],
                    [10, 8]
                ];

                for (const [x, z] of positions) {
                    const snake = new THREE.Group();
                    const model = clone(original);

                    // Beregn størrelsen på modellen
                    model.updateMatrixWorld(true);

                    const box = new THREE.Box3().setFromObject(model);
                    const size = new THREE.Vector3();
                    const center = new THREE.Vector3();

                    box.getSize(size);
                    box.getCenter(center);

                    const longestSide = Math.max(
                        size.x, size.y, size.z
                    );

                    if (longestSide <= 0) continue;

                    // Skaler til ca. 2 enheter
                    const scale = 2 / longestSide;

                    const modelGroup = new THREE.Group();
                    model.position.sub(center);
                    modelGroup.scale.setScalar(scale);
                    modelGroup.add(model);

                    // Finn modellens bunn etter skalering
                    modelGroup.updateMatrixWorld(true);
                    const scaledBox = new THREE.Box3().setFromObject(modelGroup);
                    modelGroup.position.y -= scaledBox.min.y;

                    snake.add(modelGroup);

                    const groundY = this.terrain.getHeight(x, z);
                    snake.position.set(x, groundY - 0.15, z);

                    snake.rotation.y = Math.random() * Math.PI * 2;



                    this.scene.add(snake);

                    // Bruk modellens innebygde idle-animasjon
                    const mixer = new THREE.AnimationMixer(model);

                    const idle = gltf.animations.find(
                        clip => clip.name.toLowerCase().includes('idle')
                    );

                    if (idle) {
                        mixer.clipAction(idle).play();
                    }

                    this.snakes.push({
                        group: snake,
                        mixer,
                        startX: x,
                        startZ: z,
                        speed: 0.1 + Math.random() * 0.08,
                        phase: Math.random() * Math.PI * 2
                    });
                }

                console.log(
                    `${this.snakes.length} anakondaer lagt til!`
                );
            },
            undefined,
            (error) => {
                console.error('Feil ved lasting av anakonda:', error);
            }
        );
    }

    update(deltaTime) {
        this.time += deltaTime;

        for (const snake of this.snakes) {
            snake.mixer.update(deltaTime);

            const t = this.time * snake.speed + snake.phase;

            // Små, langsomme bevegelser
            const x = snake.startX + Math.sin(t) * 1.0;
            const z = snake.startZ + Math.sin(t * 0.7) * 1.0;

            const y = this.terrain.getHeight(x, z);

            snake.group.position.set(x, y - 0.15, z);
            this.alignToTerrain(snake.group, x, z);
        }
    }

    alignToTerrain(snake, x, z) {
        const distance = 1.5;

        // Mål terrenghøyden rundt slangen
        const heightLeft = this.terrain.getHeight(x - distance, z);
        const heightRight = this.terrain.getHeight(x + distance, z);

        const heightFront = this.terrain.getHeight(x, z + distance);
        const heightBack = this.terrain.getHeight(x, z - distance);

        // Beregn helningen
        const slopeX = (heightRight - heightLeft) / (2 * distance);
        const slopeZ = (heightFront - heightBack) / (2 * distance);

        // Finn normalvektoren til bakken
        const normal = new THREE.Vector3(
            -slopeX,
            1,
            -slopeZ
        ).normalize();

        // Behold slangens retning, men tilpass den til bakken
        const heading = snake.rotation.y;

        const forward = new THREE.Vector3(
            Math.sin(heading),
            0,
            Math.cos(heading)
        );

        forward.addScaledVector(
            normal,
            -forward.dot(normal)
        ).normalize();

        const right = new THREE.Vector3()
            .crossVectors(normal, forward)
            .normalize();

        const adjustedForward = new THREE.Vector3()
            .crossVectors(right, normal)
            .normalize();

        const rotationMatrix = new THREE.Matrix4().makeBasis(
            right,
            normal,
            adjustedForward
        );

        snake.quaternion.setFromRotationMatrix(rotationMatrix);
    }

}



