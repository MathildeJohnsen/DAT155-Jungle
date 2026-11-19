
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

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

    // Teller meshes og triangles i en GLB-modell.
    logModelStats(name, object) {
        let meshes = 0;
        let triangles = 0;

        object.traverse((child) => {
            if (!child.isMesh) return;

            meshes++;

            const geometry = child.geometry;

            if (geometry.index) {
                triangles += geometry.index.count / 3;
            } else if (geometry.attributes.position) {
                triangles +=
                    geometry.attributes.position.count / 3;
            }
        });

        console.log(
            `${name}: ${meshes} meshes, ` +
            `${Math.round(triangles).toLocaleString('no-NO')} triangles`
        );
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
        const modifier = new SimplifyModifier();

        loader.load(
            './models/jungle-tree/source/jungle_tree.glb',

            (gltf) => {
                const originalTree = gltf.scene;

                this.logModelStats('Jungeltre', originalTree);

                originalTree.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false;
                        child.receiveShadow = false;
                    }
                });

                // Lag en forenklet versjon av tremodellen
                const lowDetailTree = originalTree.clone(true);

                lowDetailTree.traverse((child) => {
                    if (!child.isMesh) return;

                    const geometry = child.geometry;
                    const position = geometry.attributes.position;

                    if (!position || position.count < 100) return;

                    try {
                        const simplifiedGeometry = modifier.modify(
                            geometry.clone(),
                            Math.floor(position.count * 0.5)
                        );

                        child.geometry = simplifiedGeometry;
                    } catch (error) {
                        console.warn(
                            'Kunne ikke forenkle en del av treet:',
                            error
                        );
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

                    // Beregn avstand til midten av stien
                    const pathX = this.terrain.getPathX(z);
                    const distanceToPath = Math.abs(x - pathX);

                    // Hold trærne minst 6 enheter fra midten av stien
                    if (distanceToPath < 6) {
                        continue;
                    }

                    // Behold den opprinnelige stisjekken
                    if (this.terrain.getPathFactor(x, z) > 0.05) {
                        continue;
                    }

                    // Unngå trær rundt dammen
                    if (this.isNearPool(x, z)) {
                        continue;
                    }

                    const scale = 0.7 + Math.random() * 0.6;
                    const rotation = Math.random() * Math.PI * 2;
                    const y = this.terrain.getHeight(x, z);

                    // Opprett LOD-objekt
                    const lod = new THREE.LOD();

                    const highDetail = originalTree.clone(true);
                    const lowDetail = lowDetailTree.clone(true);

                    lod.addLevel(highDetail, 0);
                    lod.addLevel(lowDetail, 35);

                    lod.position.set(x, y, z);
                    lod.scale.setScalar(scale);
                    lod.rotation.y = rotation;

                    this.scene.add(lod);

                    // Kollisjon rundt stammen
                    this.collisionManager.addCircle(
                        x,
                        z,
                        0.8 * scale,
                        y
                    );

                    placedTrees++;
                }

                console.log(
                    `${placedTrees} jungeltrær er plassert med LOD!`
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
                this.logModelStats('Busk', original);
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
                this.logModelStats('Elephant ear', original);
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



    // Palmer, monstera og bananplanter med LOD.
    loadAdditionalVegetation() {
        const models = [
            {
                file: 'palm_trees.glb',
                count: 150,
                minHeight: 8,
                maxHeight: 54,
                lodDistance: 45
            },
            {
                file: 'monstera_tree.glb',
                count: 130,
                minHeight: 1,
                maxHeight: 5.5,
                lodDistance: 20
            },

            {
                file: 'banana_plant.glb',
                count: 145,
                minHeight: 12,
                maxHeight: 18,
                lodDistance: 35
            }
        ];

        const loader = new GLTFLoader();
        const modifier = new SimplifyModifier();

        models.forEach((model) => {
            loader.load(
                `./models/jungle-tree/source/${model.file}`,

                (gltf) => {
                    const original = gltf.scene;
                    this.logModelStats(model.file, original);

                    original.traverse((child) => {
                        if (!child.isMesh) return;

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
                    });

                    // Lag én forenklet modell som gjenbrukes.
                    const lowDetailOriginal = original.clone(true);

                    lowDetailOriginal.traverse((child) => {
                        if (!child.isMesh) return;

                        const geometry = child.geometry;
                        const position = geometry.attributes.position;

                        if (!position || position.count < 100) return;

                        try {
                            const simplified = modifier.modify(
                                geometry.clone(),
                                Math.floor(position.count * 0.5)
                            );

                            child.geometry = simplified;
                        } catch (error) {
                            console.warn(
                                `Kunne ikke forenkle ${model.file}:`,
                                error
                            );
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

                        const desiredHeight =
                            model.minHeight +
                            Math.random() *
                            (model.maxHeight - model.minHeight);

                        const scale = desiredHeight / size.y;
                        const rotation = Math.random() * Math.PI * 2;

                        // Opprett to detaljnivåer.
                        const highDetail = original.clone(true);
                        const lowDetail = lowDetailOriginal.clone(true);

                        const lod = new THREE.LOD();

                        lod.addLevel(highDetail, 0);
                        lod.addLevel(lowDetail, model.lodDistance);

                        lod.scale.setScalar(scale);
                        lod.rotation.y = rotation;

                        // Finn modellens bunn etter skalering.
                        const box =
                            new THREE.Box3().setFromObject(lod);

                        const groundY =
                            this.terrain.getHeight(x, z);

                        let y = groundY - box.min.y;

                        if (
                            model.file === 'palm_trees.glb' ||
                            model.file === 'monstera_tree.glb'
                        ) {
                            y -= desiredHeight * 0.08;
                        }

                        lod.position.set(x, y, z);

                        this.scene.add(lod);

                        // Kollisjon rundt stammene.
                        // Bruk LOD-objektet, som har riktig
                        // posisjon, rotasjon og skalering.
                        if (model.file === 'palm_trees.glb') {
                            this.addTrunkCollision(
                                lod,
                                'palm001_Palm_Hamza_0',
                                groundY
                            );
                        }

                        if (model.file === 'banana_plant.glb') {
                            this.collisionManager.addCircle(
                                x,
                                z,
                                0.1 * scale,
                                groundY
                            );
                        }

                        placed++;
                    }

                    console.log(
                        `${placed} objekter fra ${model.file} er plassert med LOD!`
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
