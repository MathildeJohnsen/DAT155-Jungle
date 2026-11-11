
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Vegetation {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;

        this.loadTrees();
        this.loadBushes();
        this.loadElephantEarPlants();
        this.loadAdditionalVegetation();
    }

    loadTrees() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/jungle_tree.glb',

            (gltf) => {
                const originalTree = gltf.scene;

                // Aktiver skygger på tremodellen
                originalTree.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const numberOfTrees = 50;
                let placedTrees = 0;
                let attempts = 0;

                while (placedTrees < numberOfTrees && attempts < 1000) {
                    attempts++;

                    // Tilfeldig plassering på terrenget
                    const x = (Math.random() - 0.5) * 180;
                    const z = (Math.random() - 0.5) * 180;

                    // Unngå trær midt i stien
                    const pathFactor = this.terrain.getPathFactor(x, z);

                    if (pathFactor > 0.05) {
                        continue;
                    }

                    // Lag en kopi av treet
                    const tree = originalTree.clone();

                    // Plasser treet på bakken
                    const y = this.terrain.getHeight(x, z);
                    tree.position.set(x, y, z);

                    // Tilfeldig størrelse
                    const scale = 0.7 + Math.random() * 0.6;
                    tree.scale.setScalar(scale);

                    // Tilfeldig rotasjon
                    tree.rotation.y = Math.random() * Math.PI * 2;

                    this.scene.add(tree);
                    placedTrees++;
                }

                console.log(`${placedTrees} jungeltrær er plassert!`);
            },

            undefined,

            (error) => {
                console.error('Kunne ikke laste jungeltrær:', error);
            }
        );
    }

    loadBushes() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/plant_bush.glb',

            (gltf) => {
                const originalBush = gltf.scene;

                originalBush.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const numberOfBushes = 320;
                let placedBushes = 0;
                let attempts = 0;

                while (placedBushes < numberOfBushes && attempts < 2000) {
                    attempts++;

                    const x = (Math.random() - 0.5) * 180;
                    const z = (Math.random() - 0.5) * 180;

                    // Unngå busker midt på stien
                    const pathFactor = this.terrain.getPathFactor(x, z);

                    if (pathFactor > 0.05) {
                        continue;
                    }

                    const bush = originalBush.clone();

                    const y = this.terrain.getHeight(x, z);
                    bush.position.set(x, y, z);

                    // Varier størrelsen og rotasjonen

                    // Finn buskens opprinnelige størrelse
                    const box = new THREE.Box3().setFromObject(bush);
                    const size = new THREE.Vector3();
                    box.getSize(size);

                    // Velg en tilfeldig høyde mellom 0.5 og 1.2 meter
                    const desiredHeight = 0.5 + Math.random() * 0.7;

                    // Beregn riktig skaleringsfaktor
                    if (size.y > 0) {
                        const scale = desiredHeight / size.y;
                        bush.scale.setScalar(scale);
                    }


                    bush.rotation.y = Math.random() * Math.PI * 2;

                    this.scene.add(bush);
                    placedBushes++;
                }

                console.log(`${placedBushes} busker er plassert!`);
            },

            undefined,

            (error) => {
                console.error('Kunne ikke laste buskene:', error);
            }
        );
    }

    loadElephantEarPlants() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/elephant_ear_bush.glb',

            (gltf) => {
                const originalPlant = gltf.scene;

                originalPlant.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const numberOfPlants = 750;
                let placedPlants = 0;
                let attempts = 0;

                while (placedPlants < numberOfPlants && attempts < 3000) {
                    attempts++;

                    const x = (Math.random() - 0.5) * 180;
                    const z = (Math.random() - 0.5) * 180;

                    // Hold selve stien fri for planter
                    const pathFactor = this.terrain.getPathFactor(x, z);

                    if (pathFactor > 0.05) {
                        continue;
                    }

                    const plant = originalPlant.clone();

                    // Finn modellens opprinnelige høyde
                    const box = new THREE.Box3().setFromObject(plant);
                    const size = new THREE.Vector3();
                    box.getSize(size);

                    // Gi plantene høyder mellom 0.7 og 1.8 meter
                    const desiredHeight = 0.7 + Math.random() * 1.1;

                    if (size.y > 0) {
                        plant.scale.setScalar(desiredHeight / size.y);
                    }

                    // Tilfeldig rotasjon
                    plant.rotation.y = Math.random() * Math.PI * 2;

                    // Finn bunnen av den skalerte modellen
                    const scaledBox = new THREE.Box3().setFromObject(plant);

                    // Plasser planten på terrenget
                    const groundY = this.terrain.getHeight(x, z);

                    plant.position.set(
                        x,
                        groundY - scaledBox.min.y,
                        z
                    );

                    this.scene.add(plant);
                    placedPlants++;
                }

                console.log(`${placedPlants} elephant ear-planter er plassert!`);
            },

            undefined,

            (error) => {
                console.error('Kunne ikke laste elephant ear-planter:', error);
            }
        );
    }

    loadAdditionalVegetation() {
        const models = [
            {
                file: 'palm_trees.glb',
                count: 50,
                minHeight: 8,
                maxHeight: 54
            },
            {
                file: 'monstera_tree.glb',
                count: 30,
                minHeight: 1,
                maxHeight: 5.5
            },
            {
                file: 'banana_plant.glb',
                count: 45,
                minHeight: 12,
                maxHeight: 18
            }

        ];

    const loader = new GLTFLoader();

        models.forEach((model) => {
    loader.load(
        `./models/jungle-tree/source/${model.file}`,

        (gltf) => {
            const original = gltf.scene;

            original.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Finn modellens størrelse én gang
            const originalBox =
                new THREE.Box3().setFromObject(original);

            const size = new THREE.Vector3();
            originalBox.getSize(size);

            if (size.y <= 0) {
                console.warn(
                    `Ugyldig modellhøyde: ${model.file}`
                );
                return;
            }

            let placed = 0;
            let attempts = 0;

            while (placed < model.count && attempts < 3000) {
                attempts++;

                const x = (Math.random() - 0.5) * 180;
                const z = (Math.random() - 0.5) * 180;

                // Hold stien fri for vegetasjon
                const pathFactor =
                    this.terrain.getPathFactor(x, z);

                if (pathFactor > 0.05) {
                    continue;
                }

                const plant = original.clone();

                // Tilfeldig ønsket høyde
                const desiredHeight =
                    model.minHeight +
                    Math.random() *
                    (model.maxHeight - model.minHeight);

                const scale = desiredHeight / size.y;
                plant.scale.setScalar(scale);

                plant.rotation.y =
                    Math.random() * Math.PI * 2;

                // Finn modellens bunn etter skalering

                // Finn modellens bunn etter skalering
                const box = new THREE.Box3().setFromObject(plant);

                const groundY = this.terrain.getHeight(x, z);

                // Plasser modellen på bakken
                let y = groundY - box.min.y;

                // Senk palmene litt ned i bakken
                if (model.file === 'palm_trees.glb') {
                    y -= desiredHeight * 0.08;
                }

                plant.position.set(x, y, z);



                plant.position.set(x, y, z);

                this.scene.add(plant);
                placed++;
            }

            console.log(
                `${placed} objekter fra ${model.file} er plassert!`
            );
        },

        undefined,

        (error) => {
            console.error(
                `Kunne ikke laste ${model.file}:`,
                error
            );
        }
    );
});
    }


}
