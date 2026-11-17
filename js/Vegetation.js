
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Vegetation {
    constructor(scene, terrain, wind, collisionManager) {
        this.scene = scene;
        this.terrain = terrain;
        this.wind = wind;
        this.collisionManager = collisionManager;

        this.loadTrees();
        this.loadBushes();
        this.loadElephantEarPlants();
        this.loadAdditionalVegetation();
    }

    // Beregner kollisjon fra geometrien nær trestammen.

    addTrunkCollision(object, meshName, groundY) {
        object.updateMatrixWorld(true);

        const vertices = [];
        const vertex = new THREE.Vector3();

        object.traverse((child) => {
            if (!child.isMesh || !child.name.includes(meshName)) {
                return;
            }

            const positions = child.geometry.attributes.position;

            if (!positions) return;

            for (let i = 0; i < positions.count; i++) {
                vertex.fromBufferAttribute(positions, i);
                vertex.applyMatrix4(child.matrixWorld);

                vertices.push({
                    x: vertex.x,
                    y: vertex.y,
                    z: vertex.z
                });
            }
        });

        if (vertices.length === 0) {
            console.warn(`Fant ikke mesh: ${meshName}`);
            return;
        }

        // Prøv først punkter nær bakken.
        const heightRanges = [
            [0.4, 1.2],
            [0, 3],
            [-1, 4],
            [-3, 6]
        ];

        let points = [];

        for (const [minHeight, maxHeight] of heightRanges) {
            points = vertices.filter((point) => {
                const relativeY = point.y - groundY;

                return (
                    relativeY >= minHeight &&
                    relativeY <= maxHeight
                );
            });

            if (points.length >= 3) {
                break;
            }
        }

        if (points.length < 3) {
            console.warn(
                `Fant for få kollisjonspunkter for ${meshName}`
            );
            return;
        }

        let centerX = 0;
        let centerZ = 0;

        for (const point of points) {
            centerX += point.x;
            centerZ += point.z;
        }

        centerX /= points.length;
        centerZ /= points.length;

        let radius = 0;

        for (const point of points) {
            const distance = Math.hypot(
                point.x - centerX,
                point.z - centerZ
            );

            radius = Math.max(radius, distance);
        }

        radius *= 0.9;

        this.collisionManager.addCircle(
            centerX,
            centerZ,
            radius,
            this.terrain.getHeight(centerX, centerZ)
        );
    }


    // Hindrer vegetasjon i dammen og fossefallet.
    isNearPool(x, z) {
        const poolX = 28;
        const poolZ = -31;
        const poolRadius = 8;

        const distance = Math.sqrt(
            (x - poolX) ** 2 +
            (z - poolZ) ** 2
        );

        const nearPool = distance < poolRadius;

        const nearWaterfall =
            Math.abs(x - 28) < 9 &&
            z > -40 &&
            z < -32;

        return nearPool || nearWaterfall;
    }

    // Store jungeltrær med lianer.
    loadTrees() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/jungle_tree.glb',

            (gltf) => {
                const originalTree = gltf.scene;

                originalTree.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false;
                        child.receiveShadow = false;
                    }
                });

                const numberOfTrees = 150;
                let placedTrees = 0;
                let attempts = 0;

                while (
                    placedTrees < numberOfTrees &&
                    attempts < 1000
                ) {
                    attempts++;

                    const x = (Math.random() - 0.5) * 180;
                    const z = (Math.random() - 0.5) * 180;

                    if (this.terrain.getPathFactor(x, z) > 0.05) {
                        continue;
                    }

                    if (this.isNearPool(x, z)) {
                        continue;
                    }

                    const tree = originalTree.clone();

                    const y = this.terrain.getHeight(x, z);
                    tree.position.set(x, y, z);

                    const scale = 0.7 + Math.random() * 0.6;
                    tree.scale.setScalar(scale);

                    tree.rotation.y = Math.random() * Math.PI * 2;

                    this.scene.add(tree);

                    // Kollisjon rundt stammen.
                    this.addTrunkCollision(
                        tree,
                        'cypreschauve_bark_D',
                        y
                    );

                    placedTrees++;
                }

                console.log(
                    `${placedTrees} jungeltrær er plassert!`
                );
            },

            undefined,

            (error) => {
                console.error(
                    'Kunne ikke laste jungeltrær:',
                    error
                );
            }
        );
    }

    // Busker med InstancedMesh og vind.
    loadBushes() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/plant_bush.glb',

            (gltf) => {
                const original = gltf.scene;
                original.updateMatrixWorld(true);

                const meshes = [];
                let hasSkinnedMesh = false;

                original.traverse((child) => {
                    if (child.isSkinnedMesh) {
                        hasSkinnedMesh = true;
                    } else if (child.isMesh) {
                        meshes.push(child);
                    }
                });

                if (hasSkinnedMesh || meshes.length === 0) {
                    console.warn(
                        'Buskmodellen kan ikke instances med denne metoden.'
                    );
                    return;
                }

                const numberOfBushes = 520;

                const originalBox =
                    new THREE.Box3().setFromObject(original);

                const originalSize = new THREE.Vector3();
                originalBox.getSize(originalSize);

                if (originalSize.y <= 0) {
                    console.warn(
                        'Ugyldig høyde på buskmodellen.'
                    );
                    return;
                }

                const placements = [];
                let attempts = 0;

                while (
                    placements.length < numberOfBushes &&
                    attempts < 2000
                ) {
                    attempts++;

                    const x = (Math.random() - 0.5) * 180;
                    const z = (Math.random() - 0.5) * 180;

                    if (this.terrain.getPathFactor(x, z) > 0.05) {
                        continue;
                    }

                    if (this.isNearPool(x, z)) {
                        continue;
                    }

                    const desiredHeight =
                        0.5 + Math.random() * 0.7;

                    const scale =
                        desiredHeight / originalSize.y;

                    const rotation =
                        Math.random() * Math.PI * 2;

                    const groundY =
                        this.terrain.getHeight(x, z);

                    const rootMatrix =
                        new THREE.Matrix4().compose(
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Quaternion()
                                .setFromAxisAngle(
                                    new THREE.Vector3(0, 1, 0),
                                    rotation
                                ),
                            new THREE.Vector3(
                                scale,
                                scale,
                                scale
                            )
                        );

                    const transformedBox = originalBox
                        .clone()
                        .applyMatrix4(rootMatrix);

                    const y = groundY - transformedBox.min.y;

                    rootMatrix.setPosition(x, y, z);
                    placements.push(rootMatrix);
                }

                const rootInverse = new THREE.Matrix4()
                    .copy(original.matrixWorld)
                    .invert();

                const localMatrix = new THREE.Matrix4();
                const instanceMatrix = new THREE.Matrix4();

                for (const mesh of meshes) {
                    const windMaterial =
                        Array.isArray(mesh.material)
                            ? mesh.material.map(
                                mat => this.wind.addToMaterial(
                                    mat,
                                    0.06
                                )
                            )
                            : this.wind.addToMaterial(
                                mesh.material,
                                0.06
                            );

                    const instanced = new THREE.InstancedMesh(
                        mesh.geometry,
                        windMaterial,
                        placements.length
                    );

                    localMatrix.multiplyMatrices(
                        rootInverse,
                        mesh.matrixWorld
                    );

                    for (let i = 0; i < placements.length; i++) {
                        instanceMatrix.multiplyMatrices(
                            placements[i],
                            localMatrix
                        );

                        instanced.setMatrixAt(
                            i,
                            instanceMatrix
                        );
                    }

                    instanced.instanceMatrix.needsUpdate = true;

                    instanced.castShadow = false;
                    instanced.receiveShadow = true;

                    instanced.computeBoundingSphere();

                    this.scene.add(instanced);
                }

                console.log(
                    `${placements.length} busker plassert med InstancedMesh!`
                );
            },

            undefined,

            (error) => {
                console.error(
                    'Kunne ikke laste buskene:',
                    error
                );
            }
        );
    }

    // Elephant ear-planter med InstancedMesh og vind.
    loadElephantEarPlants() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/elephant_ear_bush.glb',

            (gltf) => {
                const original = gltf.scene;
                original.updateMatrixWorld(true);

                const meshes = [];

                original.traverse((child) => {
                    if (child.isMesh && !child.isSkinnedMesh) {
                        meshes.push(child);
                    }
                });

                if (meshes.length === 0) {
                    console.warn(
                        'Fant ingen vanlige meshes i elephant ear-modellen.'
                    );
                    return;
                }

                let hasSkinnedMesh = false;

                original.traverse((child) => {
                    if (child.isSkinnedMesh) {
                        hasSkinnedMesh = true;
                    }
                });

                if (hasSkinnedMesh) {
                    console.warn(
                        'Elephant ear-modellen inneholder skinned meshes.'
                    );
                    return;
                }

                const numberOfPlants = 950;

                const originalBox =
                    new THREE.Box3().setFromObject(original);

                const originalSize = new THREE.Vector3();
                originalBox.getSize(originalSize);

                if (originalSize.y <= 0) {
                    console.warn(
                        'Ugyldig høyde på elephant ear-modellen.'
                    );
                    return;
                }

                const placements = [];
                let attempts = 0;

                while (
                    placements.length < numberOfPlants &&
                    attempts < 3000
                ) {
                    attempts++;

                    const x = (Math.random() - 0.5) * 180;
                    const z = (Math.random() - 0.5) * 180;

                    if (this.terrain.getPathFactor(x, z) > 0.05) {
                        continue;
                    }

                    if (this.isNearPool(x, z)) {
                        continue;
                    }

                    const desiredHeight =
                        0.7 + Math.random() * 1.1;

                    const scale =
                        desiredHeight / originalSize.y;

                    const rotation =
                        Math.random() * Math.PI * 2;

                    const groundY =
                        this.terrain.getHeight(x, z);

                    const rootMatrix =
                        new THREE.Matrix4().compose(
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Quaternion()
                                .setFromAxisAngle(
                                    new THREE.Vector3(0, 1, 0),
                                    rotation
                                ),
                            new THREE.Vector3(
                                scale,
                                scale,
                                scale
                            )
                        );

                    const transformedBox = originalBox
                        .clone()
                        .applyMatrix4(rootMatrix);

                    const y = groundY - transformedBox.min.y;

                    rootMatrix.setPosition(x, y, z);
                    placements.push(rootMatrix);
                }

                const rootInverse = new THREE.Matrix4()
                    .copy(original.matrixWorld)
                    .invert();

                const localMatrix = new THREE.Matrix4();
                const instanceMatrix = new THREE.Matrix4();

                for (const mesh of meshes) {
                    const windMaterial =
                        Array.isArray(mesh.material)
                            ? mesh.material.map(
                                mat => this.wind.addToMaterial(
                                    mat,
                                    0.06
                                )
                            )
                            : this.wind.addToMaterial(
                                mesh.material,
                                0.06
                            );

                    const instanced = new THREE.InstancedMesh(
                        mesh.geometry,
                        windMaterial,
                        placements.length
                    );

                    localMatrix.multiplyMatrices(
                        rootInverse,
                        mesh.matrixWorld
                    );

                    for (let i = 0; i < placements.length; i++) {
                        instanceMatrix.multiplyMatrices(
                            placements[i],
                            localMatrix
                        );

                        instanced.setMatrixAt(
                            i,
                            instanceMatrix
                        );
                    }

                    instanced.instanceMatrix.needsUpdate = true;

                    instanced.castShadow = false;
                    instanced.receiveShadow = true;

                    instanced.computeBoundingSphere();

                    this.scene.add(instanced);
                }

                console.log(
                    `${placements.length} elephant ear-planter plassert med InstancedMesh!`
                );
            },

            undefined,

            (error) => {
                console.error(
                    'Kunne ikke laste elephant ear-planter:',
                    error
                );
            }
        );
    }

    // Palmer, monstera og bananplanter.
    loadAdditionalVegetation() {
        const models = [
            {
                file: 'palm_trees.glb',
                count: 150,
                minHeight: 8,
                maxHeight: 54
            },
            {
                file: 'monstera_tree.glb',
                count: 130,
                minHeight: 1,
                maxHeight: 5.5
            },
            {
                file: 'banana_plant.glb',
                count: 145,
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

                            if (model.file === 'monstera_tree.glb') {
                                const fixMaterial = (material) => {
                                    const mat = material.clone();

                                    if (mat.emissive) {
                                        mat.emissive.set(0x000000);
                                        mat.emissiveIntensity = 0;
                                    }

                                    return mat;
                                };

                                if (Array.isArray(child.material)) {
                                    child.material =
                                        child.material.map(fixMaterial);
                                } else if (child.material) {
                                    child.material =
                                        fixMaterial(child.material);
                                }
                            }
                        }
                    });

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

                    while (
                        placed < model.count &&
                        attempts < 3000
                    ) {
                        attempts++;

                        const x = (Math.random() - 0.5) * 180;
                        const z = (Math.random() - 0.5) * 180;

                        if (this.terrain.getPathFactor(x, z) > 0.05) {
                            continue;
                        }

                        if (this.isNearPool(x, z)) {
                            continue;
                        }

                        const plant = original.clone();

                        const desiredHeight =
                            model.minHeight +
                            Math.random() *
                            (model.maxHeight - model.minHeight);

                        const scale = desiredHeight / size.y;
                        plant.scale.setScalar(scale);

                        plant.rotation.y =
                            Math.random() * Math.PI * 2;

                        // Finn modellens bunn etter skalering.
                        const box =
                            new THREE.Box3().setFromObject(plant);

                        const groundY =
                            this.terrain.getHeight(x, z);

                        let y = groundY - box.min.y;

                        // Senk palmene litt ned i bakken.
                        if (model.file === 'palm_trees.glb') {
                            y -= desiredHeight * 0.08;
                        }

                        plant.position.set(x, y, z);

                        this.scene.add(plant);

                        // Kollisjon fra geometrien nær palmens stamme.
                        if (model.file === 'palm_trees.glb') {
                            this.addTrunkCollision(
                                plant,
                                'palm001_Palm_Hamza_0',
                                groundY
                            );
                        }
                        if (model.file === 'banana_plant.glb') {
                            this.addTrunkCollision(
                                plant,
                                '',
                                groundY
                            );
                        }

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
