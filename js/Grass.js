
import * as THREE from 'three';

export class Grass {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;

        this.createGrass();
    }

    createGrass() {
        const numberOfTufts = 35000;

        const positions = [];
        const indices = [];
        const colors = [];

        const bladeCount = 8;
        const segments = 3;

        // Lag en gresstust med smale, buede blader
        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2;
            const dx = Math.cos(angle);
            const dz = Math.sin(angle);

            const bladeHeight = 0.65 + Math.random() * 0.35;
            const bladeWidth = 0.018 + Math.random() * 0.018;
            const bend = 0.12 + Math.random() * 0.18;

            const startIndex = positions.length / 3;

            for (let j = 0; j <= segments; j++) {
                const t = j / segments;

                const y = t * bladeHeight;

                // Bladet bøyer seg gradvis utover
                const offset = bend * t * t;

                const centerX = dx * offset;
                const centerZ = dz * offset;

                const width = bladeWidth * (1 - t);

                positions.push(
                    centerX - dz * width,
                    y,
                    centerZ + dx * width
                );

                positions.push(
                    centerX + dz * width,
                    y,
                    centerZ - dx * width
                );

                // Litt mørkere nederst, lysere øverst
                const shade = 0.55 + t * 0.35;

                for (let side = 0; side < 2; side++) {
                    colors.push(shade, shade, shade);
                }
            }

            // Koble sammen punktene til trekanter
            for (let j = 0; j < segments; j++) {
                const a = startIndex + j * 2;
                const b = a + 1;
                const c = a + 2;
                const d = a + 3;

                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
        );

        geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colors, 3)
        );

        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            vertexColors: true,
            side: THREE.DoubleSide,
            roughness: 1,
            metalness: 0
        });

        const grass = new THREE.InstancedMesh(
            geometry,
            material,
            numberOfTufts
        );

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        const grassColors = [
            0x3b6735,
            0x456d39,
            0x527642,
            0x355d31,
            0x5b7944,
            0x42683a
        ];

        let placed = 0;
        let attempts = 0;

        // Lag ujevne områder med tettere gress
        const patches = [];

        for (let i = 0; i < 350; i++) {
            patches.push({
                x: (Math.random() - 0.5) * 110,
                z: (Math.random() - 0.5) * 110,
                radius: 2 + Math.random() * 5
            });
        }

        while (placed < numberOfTufts && attempts < 100000) {
            attempts++;

            // Velg en tilfeldig gressklynge
            const patch = patches[
                Math.floor(Math.random() * patches.length)
            ];

            // Fordel gresset rundt midten av klyngen
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * patch.radius;

            const x = patch.x + Math.cos(angle) * distance;
            const z = patch.z + Math.sin(angle) * distance;

            // Hold gresset innenfor terrenget
            if (Math.abs(x) > 98 || Math.abs(z) > 98) {
                continue;
            }

            // Unngå gress på stien
            if (this.terrain.getPathFactor(x, z) > 0.05) {
                continue;
            }

            const y = this.terrain.getHeight(x, z);

            const height = 0.15 + Math.random() * 0.3;
            const width = 0.65 + Math.random() * 0.45;

            dummy.position.set(x, y - 0.025, z);
            dummy.rotation.set(
                0,
                Math.random() * Math.PI * 2,
                0
            );

            dummy.scale.set(width, height, width);
            dummy.updateMatrix();

            grass.setMatrixAt(placed, dummy.matrix);

            color.setHex(
                grassColors[
                Math.floor(Math.random() * grassColors.length)
                ]
            );

            grass.setColorAt(placed, color);

            placed++;
        }

        grass.count = placed;
        grass.instanceMatrix.needsUpdate = true;

        if (grass.instanceColor) {
            grass.instanceColor.needsUpdate = true;
        }

        grass.castShadow = false;
        grass.receiveShadow = true;

        grass.computeBoundingSphere();

        this.scene.add(grass);

        console.log(`${placed} realistiske gresstuster er plassert!`);
    }
}
