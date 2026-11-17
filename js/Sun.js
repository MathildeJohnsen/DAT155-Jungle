import * as THREE from 'three';

export class Sun {
    constructor(scene, sunlight, camera, ambientLight) {
        this.scene = scene;
        this.camera = camera;
        this.sunlight = sunlight;
        this.ambientLight = ambientLight;


        // En hel dag og natt varer 5 minutter
        this.cycleDuration = 300;

        // Tid som har gått i syklusen
        // Starter på formiddagen
        this.time = 60;

        // Avstand til den synlige solen
        this.distance = 180;

        // Retningen til solen
        this.direction = new THREE.Vector3();

        // Solens retning, basert på eksisterende lys
        this.direction = sunlight.position.clone().normalize();

        // Solen skal se ut til å være langt unna
        this.distance = 180;

        // Samle solens visuelle elementer
        this.group = new THREE.Group();

        // Synlig sol
        const geometry = new THREE.SphereGeometry(9, 32, 32);

        const material = new THREE.MeshBasicMaterial({
            color: 0xffedaa,
            fog: false,
            toneMapped: false,
            depthWrite: false
        });

        this.sunMesh = new THREE.Mesh(geometry, material);
        this.group.add(this.sunMesh);

        // Myk glød rundt solen
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 128;
        glowCanvas.height = 128;

        const ctx = glowCanvas.getContext('2d');
        const gradient = ctx.createRadialGradient(
            64, 64, 10,
            64, 64, 64
        );

        gradient.addColorStop(0, 'rgba(255,235,170,0.65)');
        gradient.addColorStop(0.3, 'rgba(255,210,110,0.25)');
        gradient.addColorStop(1, 'rgba(255,200,100,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        const glowTexture = new THREE.CanvasTexture(glowCanvas);

        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
            toneMapped: false
        });

        const glow = new THREE.Sprite(glowMaterial);
        glow.scale.set(55, 55, 1);
        glow.position.z = -1;

        this.group.add(glow);
        scene.add(this.group);

        this.update();
    }


    update(deltaTime = 0) {

        // Oppdater tiden
        this.time = (
            this.time + deltaTime
        ) % this.cycleDuration;

        // En full rotasjon på 300 sekunder
        const angle =
            (this.time / this.cycleDuration) *
            Math.PI * 2;

        // Solen beveger seg i en bue over himmelen
        this.direction.set(
            Math.cos(angle),
            Math.sin(angle),
            0.35 * Math.cos(angle)
        ).normalize();

        // Flytt den synlige solen
        this.group.position.copy(this.camera.position)
            .addScaledVector(this.direction, this.distance);

        // Oppdater directional light
        const lightDistance = 80;

        this.sunlight.position.copy(this.direction)
            .multiplyScalar(lightDistance);

        // Solen lyser bare når den er over horisonten
        const sunHeight = this.direction.y;


        const daylight = THREE.MathUtils.smoothstep(
            sunHeight,
            -0.08,
            0.2
        );

        // Sollyset forsvinner om natten
        this.sunlight.intensity = 2 * daylight;

        // Svakt omgivelseslys om natten
        this.ambientLight.intensity =
            THREE.MathUtils.lerp(0.025, 0.5, daylight);

        // Deaktiver solskygger om natten
        this.sunlight.castShadow = daylight > 0.01;

        // Mørkere himmel om natten
        const nightSky = new THREE.Color(0x080e20);
        const daySky = new THREE.Color(0x87b9c7);

        this.scene.background.copy(nightSky).lerp(
            daySky,
            daylight
        );

        // Tåken følger himmelfargen
        this.scene.fog.color.copy(this.scene.background);


        this.sunlight.intensity = 2 * daylight;

        // Skjul den synlige solen under horisonten
        this.group.visible = sunHeight > 0;
    }

}