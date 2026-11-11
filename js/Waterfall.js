import * as THREE from 'three';

export class Waterfall {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;

        // Plassering av fossen
        this.x = 28;
        this.z = -35;

        this.createCliffs();
        this.createWaterfall();
    }


    createCliffs() {
        const cliffGroup = new THREE.Group();

        // Naturlige steinfarger
        const rockColors = [
            0x555e52,
            0x626b5d,
            0x485347,
            0x70776a,
            0x3e4940
        ];

        const rockMaterials = rockColors.map(color =>
            new THREE.MeshStandardMaterial({
                color: color,
                roughness: 1,
                metalness: 0,
                flatShading: true
            })
        );

        // Høyde på fjellveggen
        const cliffHeight = 10;

        // Lag to fjellsider med en åpning i midten
        for (let side of [-1, 1]) {
            for (let i = 0; i < 35; i++) {

                const geometry = new THREE.IcosahedronGeometry(1, 1);

                const material = rockMaterials[
                    Math.floor(Math.random() * rockMaterials.length)
                ];

                const rock = new THREE.Mesh(geometry, material);

                // Plasser steinene på hver side av fossen
                const x =
                    side * (4 + Math.random() * 4);

                const y =
                    Math.random() * cliffHeight;

                const z =
                    (Math.random() - 0.5) * 4;

                rock.position.set(x, y, z);

                // Varier størrelsen
                rock.scale.set(
                    1.8 + Math.random() * 1.5,
                    1.5 + Math.random() * 2,
                    1.5 + Math.random() * 1.5
                );

                rock.rotation.set(
                    Math.random() * 0.3,
                    Math.random() * Math.PI,
                    Math.random() * 0.3
                );

                rock.castShadow = true;
                rock.receiveShadow = true;

                cliffGroup.add(rock);
            }
        }

        // Lag en fjellkant over fossen
        for (let i = 0; i < 12; i++) {
            const geometry = new THREE.IcosahedronGeometry(1, 1);

            const rock = new THREE.Mesh(
                geometry,
                rockMaterials[
                Math.floor(Math.random() * rockMaterials.length)
                ]
            );

            rock.position.set(
                (Math.random() - 0.5) * 12,
                cliffHeight + Math.random() * 1.5,
                (Math.random() - 0.5) * 3
            );

            rock.scale.set(
                1.5 + Math.random(),
                1 + Math.random(),
                1.5 + Math.random()
            );

            rock.castShadow = true;
            rock.receiveShadow = true;

            cliffGroup.add(rock);
        }

        // Plasser fjellveggen på terrenget
        const groundY = this.terrain.getHeight(
            this.x,
            this.z
        );

        // Senk fjellet litt ned i bakken
        cliffGroup.position.set(
            this.x,
            groundY - 1,
            this.z
        );

        this.scene.add(cliffGroup);
        this.cliffGroup = cliffGroup;

        console.log('Ny fjellvegg til fossen er opprettet!');
    }

    createWaterfall() {
        // Størrelsen på vannfallet
        const waterfallWidth = 4.5;
        const waterfallHeight = 10;

        // Flere punkter gjør at vannflaten kan få litt form
        const geometry = new THREE.PlaneGeometry(
            waterfallWidth,
            waterfallHeight,
            30,
            80
        );


        // Gjør vannfallet smalere nederst og ujevnt langs kantene
        const positions = geometry.attributes.position;
        const uv = geometry.attributes.uv;

        for (let i = 0; i < positions.count; i++) {
            const originalX = positions.getX(i);
            const originalY = positions.getY(i);

            // 0 nederst, 1 øverst
            const t = uv.getY(i);

            // Varier bredden nedover fossen
            const widthFactor =
                0.78 +
                0.22 * t +
                Math.sin(t * 17) * 0.035 +
                Math.sin(t * 41) * 0.015;

            const x = originalX * widthFactor;

            // Svak bøy utover fra fjellet
            const z =
                Math.sin(t * Math.PI) * 0.35 +
                Math.sin(x * 2.5 + t * 15) * 0.06;

            positions.setXYZ(i, x, originalY, z);
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();


        // Shader som animerer vannet
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 }
            },

            vertexShader: `
            varying vec2 vUv;

            void main() {
                vUv = uv;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,


            fragmentShader: `
uniform float uTime;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // Lange, smale vannstrømmer
    float stream1 = sin(
        uv.x * 85.0 +
        sin(uv.y * 12.0 - uTime * 3.0) * 1.5
    );

    float stream2 = sin(
        uv.x * 145.0 -
        uv.y * 8.0 +
        uTime * 4.0
    );

    // Små detaljer som beveger seg nedover
    float ripples = sin(
        uv.y * 95.0 + uTime * 9.0 +
        sin(uv.x * 40.0) * 2.0
    );

    float streams =
        stream1 * 0.35 +
        stream2 * 0.25 +
        ripples * 0.15;

    streams = smoothstep(
        0.05,
        0.55,
        streams
    );

    // Farger
    vec3 deepWater = vec3(0.12, 0.36, 0.42);
    vec3 lightWater = vec3(0.48, 0.78, 0.83);
    vec3 foamColor = vec3(0.88, 0.96, 0.98);

    vec3 color = mix(
        deepWater,
        lightWater,
        0.65
    );

    color = mix(
        color,
        foamColor,
        streams * 0.75
    );

    // Gjør kantene mykere
    float edgeFade =
        smoothstep(0.0, 0.1, uv.x) *
        smoothstep(0.0, 0.1, 1.0 - uv.x);

    float alpha = 0.75 * edgeFade;

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`,


            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const water = new THREE.Mesh(
            geometry,
            material
        );

        // Samme høydegrunnlag som fjellformasjonen
        const groundY = this.terrain.getHeight(
            this.x,
            this.z
        );

        // Plasser vannet foran åpningen i fjellet
        water.position.set(
            this.x,
            groundY + 4.5,
            this.z + 2.5
        );

        water.renderOrder = 1;

        this.scene.add(water);

        this.water = water;
        this.waterMaterial = material;

        console.log('Animert vannfall er opprettet!');
    }

    // Oppdaterer vannets animasjon
    update(deltaTime) {
        if (this.waterMaterial) {
            this.waterMaterial.uniforms.uTime.value += deltaTime;
        }
    }

}