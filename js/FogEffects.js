
import * as THREE from 'three';

export class FogEffects {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.fogClouds = [];
        this.time = 0;
        this.daylight = 1;

        this.createAtmosphere();
        this.createGroundFog();
    }

    createAtmosphere() {
        // Lett tåke i bakgrunnen
        this.scene.fog = new THREE.FogExp2(
            0xa9c6c1,
            0.015
        );
    }


    createGroundFog() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;

        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(
            128, 128, 0,
            128, 128, 128
        );

        // Myk overgang uten synlig ytterkant
        gradient.addColorStop(0, 'rgba(220,240,235,0.35)');
        gradient.addColorStop(0.25, 'rgba(220,240,235,0.25)');
        gradient.addColorStop(0.55, 'rgba(220,240,235,0.10)');
        gradient.addColorStop(0.8, 'rgba(220,240,235,0.02)');
        gradient.addColorStop(1, 'rgba(220,240,235,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        const texture = new THREE.CanvasTexture(canvas);

        for (let i = 0; i < 65; i++) {
            const x = (Math.random() - 0.5) * 100;
            const z = (Math.random() - 0.5) * 100;

            const groundY = this.terrain.getHeight(x, z);

            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.4 + Math.random() * 0.8,
                depthWrite: false,
                fog: true
            });

            const cloud = new THREE.Sprite(material);

            const width = 5 + Math.random() * 6;
            const height = 1.5 + Math.random() * 1.5;

            cloud.scale.set(width, height, 1);

            cloud.position.set(
                x,
                groundY + 0.6,
                z
            );

            this.scene.add(cloud);

            this.fogClouds.push({
                mesh: cloud,
                startX: x,
                startZ: z,
                speed: 0.05 + Math.random() * 0.08,
                phase: Math.random() * Math.PI * 2,
                opacity: material.opacity
            });
        }
    }


    update(deltaTime) {
        this.time += deltaTime;

        for (const fog of this.fogClouds) {
            const t = this.time * fog.speed + fog.phase;

            // Langsom bevegelse
            const x = fog.startX + Math.sin(t) * 2;
            const z = fog.startZ + Math.cos(t * 0.7) * 2;

            const groundY = this.terrain.getHeight(x, z);

            fog.mesh.position.x = x;
            fog.mesh.position.z = z;
            fog.mesh.position.y = groundY + 0.6;

            const nightBrightness = THREE.MathUtils.lerp(
                0.08,
                1.0,
                this.daylight
            );

            fog.mesh.material.opacity =
                fog.opacity *
                (0.75 + Math.sin(t * 2) * 0.25) *
                nightBrightness;
        }
    }
    updateLighting(daylight) {
        this.daylight = THREE.MathUtils.clamp(
            daylight, 0, 1
        );
    }
}
