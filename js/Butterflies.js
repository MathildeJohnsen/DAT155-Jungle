
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Butterflies {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.butterflies = [];
        this.time = 0;

        this.loadButterflies();
    }

    loadButterflies() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/butterflies.glb',

            (gltf) => {
                const original = gltf.scene;

                // Finn modellens størrelse og sentrum
                original.updateMatrixWorld(true);

                const box = new THREE.Box3().setFromObject(original);
                const size = new THREE.Vector3();
                const center = new THREE.Vector3();

                box.getSize(size);
                box.getCenter(center);

                const maxSize = Math.max(
                    size.x, size.y, size.z
                );

                if (maxSize <= 0) {
                    console.warn('Ugyldig sommerfuglmodell');
                    return;
                }

                // Tilpass modellens størrelse til jungelen
                const scale = 0.9 / maxSize;

                const numberOfButterflies = 22;

                for (let i = 0; i < numberOfButterflies; i++) {
                    let x, z;
                    let attempts = 0;

                    // Finn et sted utenfor dammen og fossen
                    do {
                        x = (Math.random() - 0.5) * 100;
                        z = (Math.random() - 0.5) * 100;
                        attempts++;
                    } while (
                        (
                            Math.hypot(x - 28, z + 31) < 10 ||
                            (
                                Math.abs(x - 28) < 10 &&
                                z > -41 && z < -31
                            )
                        ) &&
                        attempts < 100
                    );

                    const groundY = this.terrain.getHeight(x, z);
                    const y = groundY + 2 + Math.random() * 2;

                    const butterfly = new THREE.Group();
                    const model = original.clone(true);

                    // Sentrer modellen og skaler den ned
                    model.position.sub(center);
                    model.scale.setScalar(scale);

                    // Bruk en ekstra gruppe for skalering
                    const modelGroup = new THREE.Group();
                    modelGroup.scale.setScalar(scale);

                    model.position.copy(center).multiplyScalar(-1);
                    model.scale.setScalar(1);

                    modelGroup.add(model);
                    butterfly.add(modelGroup);

                    butterfly.position.set(x, y, z);
                    this.scene.add(butterfly);

                    // Spill av modellens innebygde animasjon
                    const mixer = new THREE.AnimationMixer(model);

                    if (gltf.animations.length > 0) {
                        const action = mixer.clipAction(
                            gltf.animations[0]
                        );

                        action.play();

                        // Litt variasjon i animasjonen
                        mixer.update(Math.random() * 2);
                    }

                    this.butterflies.push({
                        group: butterfly,
                        mixer,
                        startX: x,
                        startY: y,
                        startZ: z,
                        speed: 0.4 + Math.random() * 0.8,
                        phase: Math.random() * Math.PI * 2,
                        radius: 0.5 + Math.random() * 1.2
                    });
                }

                console.log('Sommerfugler lastet inn!');
            },

            undefined,

            (error) => {
                console.error(
                    'Kunne ikke laste sommerfugler:',
                    error
                );
            }
        );
    }

    update(deltaTime) {
        this.time += deltaTime;

        for (const butterfly of this.butterflies) {
            butterfly.mixer.update(deltaTime);

            const t = this.time * butterfly.speed +
                butterfly.phase;

            // Bevegelse mellom plantene
            butterfly.group.position.x =
                butterfly.startX +
                Math.sin(t) * butterfly.radius;

            butterfly.group.position.z =
                butterfly.startZ +
                Math.cos(t * 0.7) * butterfly.radius;

            // Fly litt opp og ned
            butterfly.group.position.y =
                butterfly.startY +
                Math.sin(t * 1.8) * 0.3;

            // Snu sommerfuglene gradvis
            butterfly.group.rotation.y = -t * 0.4;
        }
    }
}
