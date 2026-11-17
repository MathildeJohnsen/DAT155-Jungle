
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Undergrowth {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;

        this.loadFerns();
    }

    loadFerns() {
        const loader = new GLTFLoader();

        loader.load(
            './models/jungle-tree/source/ferns.glb',

            (gltf) => {
                const original = gltf.scene;

                // Aktiver skygger på modellen

                original.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false;
                        child.receiveShadow = false;

                        // Behold eventuell tekstur fra modellen
                        const oldMaterial = Array.isArray(child.material)
                            ? child.material[0]
                            : child.material;

                        const texture = oldMaterial?.map || null;

                        // Opprett et nytt materiale som støttes av Three.js
                        child.material = new THREE.MeshStandardMaterial({
                            color: texture ? 0xffffff : 0x4f8a3c,
                            map: texture,
                            side: THREE.DoubleSide,
                            roughness: 0.9,
                            metalness: 0,
                            transparent: true,
                            alphaTest: 0.5
                        });

                        child.material.needsUpdate = true;
                    }
                });

                // Finn modellens opprinnelige størrelse
                const box = new THREE.Box3().setFromObject(original);
                const size = new THREE.Vector3();
                const center = new THREE.Vector3();

                box.getSize(size);
                box.getCenter(center);

                // Normaliser modellen til omtrent 1 meter høy
                const baseScale = 1 / Math.max(size.y, 0.001);

                // Plasser modellens bunn ved lokal y = 0
                original.position.sub(center);
                original.position.y += size.y / 2;


                const fernCount = 280;
                const groupCount = 30;
                const fernsPerGroup = fernCount / groupCount;

                // Opprett grupper av bregner
                for (let group = 0; group < groupCount; group++) {

                    // Finn et tilfeldig sentrum for gruppen
                    const centerX = (Math.random() - 0.5) * 90;
                    const centerZ = (Math.random() - 0.5) * 90;

                    // Noen grupper er tette, andre mer spredte
                    const groupRadius = 1.5 + Math.random() * 3;

                    for (let i = 0; i < fernsPerGroup; i++) {

                        const fern = original.clone(true);

                        // Fordel bregnene rundt gruppens sentrum
                        const angle = Math.random() * Math.PI * 2;

                        // Flere planter nær midten av gruppen
                        const distance = Math.sqrt(Math.random()) * groupRadius;

                        const x = centerX + Math.cos(angle) * distance;
                        const z = centerZ + Math.sin(angle) * distance;

                        // Finn høyden på terrenget
                        const groundY = this.terrain.getHeight(x, z);

                        // Varier størrelsen
                        const variation = 0.5 + Math.random() * 0.6;
                        const scale = baseScale * variation;

                        fern.scale.setScalar(scale);

                        // Tilfeldig rotasjon
                        fern.rotation.y = Math.random() * Math.PI * 2;

                        // Plasser bregnen på bakken
                        fern.position.set(
                            x,
                            groundY + 0.02,
                            z
                        );

                        this.scene.add(fern);
                    
                }

                console.log('Bregner plassert i naturlige grupper!');

                const fern = original.clone(true);

                const x = (Math.random() - 0.5) * 100;
                const z = (Math.random() - 0.5) * 100;

                const groundY = this.terrain.getHeight(x, z);

                // Ulik størrelse på plantene
                const variation = 0.5 + Math.random() * 0.6;
                const scale = baseScale * variation;

                fern.scale.setScalar(scale);

                fern.rotation.y = Math.random() * Math.PI * 2;

                fern.position.set(
                    x,
                    groundY + 0.02,
                    z
                );

                this.scene.add(fern);
            }

                console.log('180 bregner er lagt til i jungelen!');
    },

            undefined,

    (error) => {
        console.error('Kunne ikke laste ferns.glb:', error);
    }
        );
    }
}
