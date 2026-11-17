
import * as THREE from 'three';

export class Rocks {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;

        this.createRocks();
    }

    createRocks() {
        const numberOfRocks = 180;

        // Ujevn geometri som passer til naturstein
        const geometry = new THREE.IcosahedronGeometry(1, 1);

        // Last inn steinteksturen
        const textureLoader = new THREE.TextureLoader();

        const rockTexture = textureLoader.load(
            './textures/rock.png'
        );

        // Color mapping bruker sRGB
        rockTexture.colorSpace = THREE.SRGBColorSpace;

        rockTexture.wrapS = THREE.RepeatWrapping;
        rockTexture.wrapT = THREE.RepeatWrapping;
        rockTexture.repeat.set(2, 2);
        rockTexture.anisotropy = 8;

        // Bruk samme bilde til bump mapping
        const rockBump = rockTexture.clone();

        // Bump mapping skal bruke lineære dataverdier
        rockBump.colorSpace = THREE.NoColorSpace;
        rockBump.needsUpdate = true;

        // Materiale med color mapping og bump mapping
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: rockTexture,
            bumpMap: rockBump,
            bumpScale: 0.20,
            roughness: 1,
            metalness: 0,
            flatShading: false
        });

        // Alle steinene deler samme geometri og materiale
        const rocks = new THREE.InstancedMesh(
            geometry,
            material,
            numberOfRocks
        );

        rocks.castShadow = true;
        rocks.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        const rockColors = [
            0x555b50, // Grågrønn
            0x6a7064, // Mosegrå
            0x464b43, // Mørk grå
            0x777568, // Varm steingrå
            0x495b42  // Mørk mosegrønn
        ];

        let placed = 0;
        let attempts = 0;

        while (placed < numberOfRocks && attempts < 5000) {
            attempts++;

            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;

            // Unngå steiner midt i stien
            if (this.terrain.getPathFactor(x, z) > 0.05) {
                continue;
            }

            const groundY = this.terrain.getHeight(x, z);

            // Varier steinenes størrelse
            const size = 0.2 + Math.random() * 0.9;

            dummy.position.set(
                x,
                groundY + size * 0.15,
                z
            );

            // Uregelmessig form
            dummy.scale.set(
                size * (0.8 + Math.random() * 0.6),
                size * (0.4 + Math.random() * 0.5),
                size * (0.8 + Math.random() * 0.6)
            );

            // Tilfeldig rotasjon
            dummy.rotation.set(
                Math.random() * 0.3,
                Math.random() * Math.PI * 2,
                Math.random() * 0.3
            );

            dummy.updateMatrix();

            rocks.setMatrixAt(placed, dummy.matrix);

            // Varier fargen mellom grå og mosegrønn
            const randomColor =
                rockColors[Math.floor(Math.random() * rockColors.length)];

            color.setHex(randomColor);
            rocks.setColorAt(placed, color);

            placed++;
        }

        rocks.count = placed;
        rocks.instanceMatrix.needsUpdate = true;

        if (rocks.instanceColor) {
            rocks.instanceColor.needsUpdate = true;
        }

        rocks.computeBoundingSphere();

        this.scene.add(rocks);

        console.log(
            `${placed} steiner med color mapping og bump mapping er plassert!`
        );
    }
}
