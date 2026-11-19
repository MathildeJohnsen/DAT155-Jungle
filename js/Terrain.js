
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

        const originalHeight = (hills + details) * blend;

        // Dammen ligger foran fossen
        const poolX = 28;
        const poolZ = -31;

        // Avstand fra midten av dammen
        const dx = x - poolX;
        const dz = z - poolZ;

        const distanceToPool = Math.sqrt(
            dx * dx + dz * dz
        );

        // Naturlig overgang mellom dam og terreng
        const poolFactor = 1 - THREE.MathUtils.smoothstep(
            distanceToPool,
            5.5,
            8.5
        );

        // Lag en flatere fordypning
        const poolBottom = this.getPoolWaterLevel() - 1.2;

        return THREE.MathUtils.lerp(
            originalHeight,
            poolBottom,
            poolFactor
        );
    }

    getPoolWaterLevel() {
        const x = 28;
        const z = -35;

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

        return (hills + details) * blend + 0.08;
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
        

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
        
            // Beregn høyden til hvert vertex
            const height = this.getHeight(x, z);
            positions.setY(i, height);
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();

        

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
            texture.repeat.set(1, 1);
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
            lights: true,

            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib.lights,
                {
                    grassTexture: { value: grassTexture },
                    dirtTexture: { value: dirtTexture },
                    ambientStrength: { value: 0.35 },
                    daylight: { value: 1.0 },
                    sunDirection: {
                        value: new THREE.Vector3(20, 40, 20).normalize()
                    }
                }
            ]),




            vertexShader: `
            #include <common>
            #include <shadowmap_pars_vertex>

            attribute float pathFactor;

            varying vec2 vUv;
            varying float vPathFactor;
            varying vec3 vNormal;

            void main() {
            vUv = uv;
            vPathFactor = pathFactor;

            vNormal = normalize(mat3(modelMatrix) * normal);

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            vec3 transformedNormal = normalize(normalMatrix * normal);
            vec3 transformed = position;

            #include <worldpos_vertex>
            #include <shadowmap_vertex>
           }
            
           `,


            fragmentShader: `
            #include <common>
            #include <packing>
            #include <shadowmap_pars_fragment>

            uniform sampler2D grassTexture;
            uniform sampler2D dirtTexture;
            uniform float ambientStrength;
            uniform vec3 sunDirection;
            uniform float daylight;

            varying vec2 vUv;
            varying float vPathFactor;
            varying vec3 vNormal;

            void main() {
             vec2 tiledUv = vUv * 40.0;

            vec3 grass = texture2D(grassTexture, tiledUv).rgb;
            grass *= vec3(0.42, 0.58, 0.38);

             vec3 dirt = texture2D(dirtTexture, tiledUv).rgb;

             vec3 groundColor = mix(grass, dirt, vPathFactor);

             // Diffus belysning
             float diffuse = max(
             dot(normalize(vNormal), normalize(sunDirection)),
                 0.0
                  );

    // Beregn skygge fra directional light
    float shadow = 1.0;

    #if NUM_DIR_LIGHT_SHADOWS > 0
        shadow = getShadow(
            directionalShadowMap[0],
            directionalLightShadows[0].shadowMapSize,
            directionalLightShadows[0].shadowIntensity,
            directionalLightShadows[0].shadowBias,
            directionalLightShadows[0].shadowRadius,
            vDirectionalShadowCoord[0]
        );
    #endif

    float lighting =
        ambientStrength + diffuse * 0.8 * shadow * daylight;

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
        this.material = material;
    }

}

