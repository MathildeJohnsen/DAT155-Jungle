import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

export class Bird {
    constructor(scene, camera, birdCount = 5) {
        this.scene = scene;
        this.birds = [];

        // Fast flyområde, uavhengig av spilleren
        this.center = new THREE.Vector3(0, 0, 0);
        this.areaRadius = 65;

        this.minHeight = 12;
        this.maxHeight = 20;

        new GLTFLoader().load(
            './models/jungle-tree/source/seagull.glb',
            (gltf) => this.createBirds(gltf, birdCount),
            undefined,
            (error) => console.error('Kunne ikke laste fugl:', error)
        );
    }

    randomPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * this.areaRadius;

        return new THREE.Vector3(
            this.center.x + Math.cos(angle) * radius,
            this.minHeight +
            Math.random() * (this.maxHeight - this.minHeight),
            this.center.z + Math.sin(angle) * radius
        );
    }

    createBirds(gltf, birdCount) {
        const bounds = new THREE.Box3().setFromObject(gltf.scene);
        const size = bounds.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        const modelScale = maxDimension > 0 ? 3.0 / maxDimension : 1;

        for (let i = 0; i < birdCount; i++) {
            const group = new THREE.Group();
            const model = clone(gltf.scene);

            model.scale.setScalar(modelScale);
            group.add(model);

            group.position.copy(this.randomPosition());
            this.scene.add(group);

            const bird = {
                group,
                target: this.randomPosition(),
                speed: 3 + Math.random() * 2,
                turnSpeed: 0.8 + Math.random() * 0.4,
                mixer: null
            };

            // Start med riktig flyretning
            const direction = new THREE.Vector3()
                .subVectors(bird.target, group.position);

            group.rotation.y = Math.atan2(
                direction.x,
                direction.z
            );

            // Spill av flakseanimasjonen
            if (gltf.animations.length > 0) {
                bird.mixer = new THREE.AnimationMixer(model);

                const action = bird.mixer.clipAction(
                    gltf.animations[0]
                );

                action.play();
            }

            this.birds.push(bird);
        }
    }

    update(deltaTime) {
        for (const bird of this.birds) {
            bird.mixer?.update(deltaTime);

            const direction = new THREE.Vector3()
                .subVectors(bird.target, bird.group.position);

            const distance = direction.length();

            // Velg ny destinasjon når fuglen nærmer seg målet
            if (distance < 5) {
                bird.target.copy(this.randomPosition());
                continue;
            }

            direction.normalize();

            // Finn ønsket rotasjon
            const targetAngle = Math.atan2(
                direction.x,
                direction.z
            );

            // Beregn korteste rotasjon mellom vinklene
            const angleDifference = Math.atan2(
                Math.sin(targetAngle - bird.group.rotation.y),
                Math.cos(targetAngle - bird.group.rotation.y)
            );

            // Sving gradvis, ikke momentant
            const maxTurn = bird.turnSpeed * deltaTime;

            bird.group.rotation.y += THREE.MathUtils.clamp(
                angleDifference,
                -maxTurn,
                maxTurn
            );

            // Fly fremover i retningen fuglen peker
            const forward = new THREE.Vector3(
                Math.sin(bird.group.rotation.y),
                0,
                Math.cos(bird.group.rotation.y)
            );

            bird.group.position.addScaledVector(
                forward,
                bird.speed * deltaTime
            );

            // Gradvis høydeendring mot destinasjonen
            const heightDifference =
                bird.target.y - bird.group.position.y;

            bird.group.position.y += THREE.MathUtils.clamp(
                heightDifference,
                -bird.speed * 0.25 * deltaTime,
                bird.speed * 0.25 * deltaTime
            );
        }
    }
}

