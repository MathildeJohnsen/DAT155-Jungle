
import * as THREE from 'three';

export class Terrain {
    constructor(scene) {
        this.scene = scene;

        this.width = 200;
        this.depth = 200;

        this.createTerrain();
    }

    getHeight(x, z) {
        const hills =
            Math.sin(x * 0.035) * 4 +
            Math.cos(z * 0.04) * 3;

        const details =
            Math.sin(x * 0.12) *
            Math.cos(z * 0.1) * 0.7;

        const distance = Math.sqrt(x * x + z * z);

        const blend = THREE.MathUtils.smoothstep(
            distance, 3, 15
        );

        return (hills + details) * blend;
    }

    // Bestemmer hvor stien går
    getPathX(z) {
        return (
            3 * Math.sin(z * 0.045) +
            1.5 * Math.sin(z * 0.11)
        );
    }

    // Beregner hvor nær et punkt er stien
    getPathFactor(x, z) {
        const pathX = this.getPathX(z);
        const distance = Math.abs(x - pathX);

        // Litt ujevn bredde
        const width =
            2.5 +
            0.3 * Math.sin(z * 0.2) +
            0.2 * Math.sin(z * 0.7);

        return 1 - THREE.MathUtils.smoothstep(
            distance,
            width - 0.6,
            width + 0.6
        );
    }

    
createTerrain() {
    const geometry = new THREE.PlaneGeometry(
        this.width,
        this.depth,
        200,
        200
    );

    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = [];

    // Flere naturlige farger til jungelbunnen
    const darkGreen = new THREE.Color(0x29472a);
    const mossGreen = new THREE.Color(0x3d6135);
    const lightGreen = new THREE.Color(0x527443);
    const earthyGreen = new THREE.Color(0x4b5732);

    // Jordfarger til stien
    const darkDirt = new THREE.Color(0x493827);
    const brownDirt = new THREE.Color(0x765239);
    const lightDirt = new THREE.Color(0x8a6849);

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Behold den eksisterende terrengformen
        const height = this.getHeight(x, z);
        positions.setY(i, height);

        // Store og små variasjoner i bakken
        const variation =
            Math.sin(x * 0.18) * Math.cos(z * 0.15) * 0.5 +
            Math.sin(x * 0.47 + z * 0.29) * 0.25 +
            Math.cos(z * 0.55 - x * 0.22) * 0.25;

        const blend = THREE.MathUtils.clamp(
            (variation + 1) / 2,
            0,
            1
        );

        // Bland forskjellige grønntoner
        const grassColor = darkGreen.clone();

        grassColor.lerp(mossGreen, blend);

        if (variation > 0.25) {
            grassColor.lerp(lightGreen, 0.35);
        }

        if (variation < -0.3) {
            grassColor.lerp(earthyGreen, 0.4);
        }

        // Variasjon i jordfargen på stien
        const dirtVariation =
            Math.sin(x * 0.8 + z * 0.4) * 0.5 +
            Math.cos(z * 0.65) * 0.5;

        const dirtBlend = THREE.MathUtils.clamp(
            (dirtVariation + 1) / 2,
            0,
            1
        );

        const dirtColor = darkDirt.clone();
        dirtColor.lerp(brownDirt, dirtBlend);

        if (dirtVariation > 0.4) {
            dirtColor.lerp(lightDirt, 0.3);
        }

        // Bland jord og vegetasjon langs stien
        const pathFactor = this.getPathFactor(x, z);

        grassColor.lerp(dirtColor, pathFactor);

        colors.push(
            grassColor.r,
            grassColor.g,
            grassColor.b
        );
    }

    positions.needsUpdate = true;

    geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
    );

    // Last inn teksturer
    const textureLoader = new THREE.TextureLoader();

    const grassTexture = textureLoader.load(
        './textures/jungle_ground1.jpg'
    );

    const dirtTexture = textureLoader.load(
        './textures/jungle_dirt.jpg'
    );

    // Gjenta teksturene for å unngå store, uklare detaljer
    for (const texture of [grassTexture, dirtTexture]) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
    }

    // Lag et eget attributt som forteller hvor stien går
    const pathValues = [];

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        pathValues.push(this.getPathFactor(x, z));
    }

    geometry.setAttribute(
        'pathFactor',
        new THREE.Float32BufferAttribute(pathValues, 1)
    );

    const material = new THREE.ShaderMaterial({
        uniforms: {
            grassTexture: { value: grassTexture },
            dirtTexture: { value: dirtTexture },
            ambientStrength: { value: 0.75 },
            sunDirection: {
                value: new THREE.Vector3(20, 40, 20).normalize()
            }
        },

        vertexShader: `
            attribute float pathFactor;

            varying vec2 vUv;
            varying float vPathFactor;
            varying vec3 vNormal;

            void main() {
                vUv = uv;
                vPathFactor = pathFactor;

                vNormal = normalize(
                    normalMatrix * normal
                );

                gl_Position = projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,

        fragmentShader: `
            uniform sampler2D grassTexture;
            uniform sampler2D dirtTexture;
            uniform float ambientStrength;
            uniform vec3 sunDirection;

            varying vec2 vUv;
            varying float vPathFactor;
            varying vec3 vNormal;

            void main() {
                vec2 tiledUv = vUv * 40.0;

                vec3 grass = texture2D(
                    grassTexture, tiledUv
                ).rgb;
                grass *= vec3(0.42, 0.58, 0.38);

                vec3 dirt = texture2D(
                    dirtTexture, tiledUv
                ).rgb;

                vec3 groundColor = mix(
                    grass,
                    dirt,
                    vPathFactor
                );

                // Enkel diffus belysning
                float diffuse = max(
                    dot(normalize(vNormal), normalize(sunDirection)),
                    0.0
                );

                float lighting =
                    ambientStrength + diffuse * 0.25;

                gl_FragColor = vec4(
                    groundColor * lighting,
                    1.0
                );

                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,

        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.receiveShadow = true;
    mesh.castShadow = true;

    this.scene.add(mesh);
    this.mesh = mesh;
}

}

