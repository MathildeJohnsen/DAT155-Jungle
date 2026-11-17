

import * as THREE from 'three';

export class SunRays {
    constructor(scene, sunlight, camera) {
        this.group = new THREE.Group();
        this.sunlight = sunlight;
        this.baseOpacity = 0.25;
        this.rays = [];
        scene.add(this.group);

        // Samme retning som sollyset
        const direction = sunlight.position.clone()
            .sub(sunlight.target.position)
            .normalize()
            .negate();

        // Myk tekstur
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 256;

        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(128, 256);

        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 128; x++) {
                const nx = (x - 63.5) / 63.5;
                const ny = (y - 127.5) / 127.5;

                // Ekstra myke kanter
                const horizontal = Math.exp(-nx * nx * 4);

                // Gradvis overgang i lengderetningen
                const vertical = Math.pow(
                    Math.max(0, 1 - ny * ny),
                    3
                );

                const alpha = horizontal * vertical * 0.5;

                const index = (y * 128 + x) * 4;

                image.data[index] = 255;
                image.data[index + 1] = 230;
                image.data[index + 2] = 170;
                image.data[index + 3] = Math.round(alpha * 255);
            }
        }

        ctx.putImageData(image, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.08,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            fog: true
        });

        // Roter strålene slik at de følger solretningen
        const up = new THREE.Vector3(0, 1, 0);

        const orientation = new THREE.Quaternion()
            .setFromUnitVectors(up, direction);

        // Færre og mer naturlige stråler

        // Flere solstråler som er synlige fra ulike vinkler
        for (let i = 0; i < 35; i++) {

            const width = 2.5 + Math.random() * 2.5;
            const length = 25 + Math.random() * 15;

            const geometry = new THREE.PlaneGeometry(
                width,
                length
            );

            // Hver stråle får sitt eget materiale
            const rayMaterial = material.clone();

            const rayGroup = new THREE.Group();

            // Første flate
            const ray1 = new THREE.Mesh(
                geometry,
                rayMaterial
            );

            // Andre flate, rotert 90 grader
            const ray2 = new THREE.Mesh(
                geometry,
                rayMaterial
            );

            ray2.rotation.y = Math.PI / 2;

            rayGroup.add(ray1);
            rayGroup.add(ray2);

            // Spre strålene utover jungelen
            const x = (Math.random() - 0.5) * 65;
            const z = (Math.random() - 0.5) * 65;

            rayGroup.position.set(
                x,
                13 + Math.random() * 7,
                z
            );

            // Lagre individuell lysstyrke
            rayGroup.userData.baseOpacity =
                0.7 + Math.random() * 0.6;

            rayGroup.quaternion.copy(orientation);

            this.group.add(rayGroup);
            this.rays.push(rayGroup);
        }

    }


    update(deltaTime, sunDirection, daylight) {
        const direction = new THREE.Vector3(
            -sunDirection.x * 0.5,
            -Math.max(0.65, sunDirection.y),
            -sunDirection.z * 0.5
        ).normalize();

        // Solens høyde over horisonten
        const sunHeight = sunDirection.y;

        // Solstrålene blir tydeligere når solen står lavt
        const lowSunFactor = 1.0 - THREE.MathUtils.smoothstep(
            sunHeight,
            0.15,
            0.85
        );

        // Unngå brå overgang ved soloppgang og solnedgang
        const visibility = THREE.MathUtils.smoothstep(
            daylight,
            0.02,
            0.35
        );

        const opacity =
            this.baseOpacity *
            (0.4 + lowSunFactor * 0.8) *
            visibility;

        // Roter solstrålene i samme retning som sollyset
        const up = new THREE.Vector3(0, 1, 0);

        const quaternion = new THREE.Quaternion()
            .setFromUnitVectors(up, direction);

        
            for (const ray of this.rays) {

                // Oppdater retningen
                ray.quaternion.copy(quaternion);
    
                // Individuell lysstyrke
                const rayOpacity =
                    opacity * ray.userData.baseOpacity;
    
                // Oppdater begge flatene
                for (const mesh of ray.children) {
                    mesh.material.opacity = rayOpacity;
                }
            }
    

        this.group.visible = visibility > 0.01;
    }

}

