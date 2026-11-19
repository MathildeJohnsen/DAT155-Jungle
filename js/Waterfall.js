import * as THREE from 'three';

export class Waterfall {
    constructor(scene, terrain, collisionManager) {
        this.scene = scene;
        this.terrain = terrain;
        this.collisionManager = collisionManager;

        // Plassering av fossen
        this.x = 28;
        this.z = -35;

        this.createCliffs();
        this.createWaterfall();
        this.createPool();
        this.createPoolRocks();
        this.createWaterfallFoam();
        this.createWaterSpray();
        this.createPoolRipples();

    }


    createRockMaterials() {
        const loader = new THREE.TextureLoader();

        const rockTexture = loader.load('./textures/Rock.png');
        const mossTexture = loader.load('./textures/moss.png');

        rockTexture.colorSpace = THREE.SRGBColorSpace;
        mossTexture.colorSpace = THREE.SRGBColorSpace;

        for (const texture of [rockTexture, mossTexture]) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            texture.anisotropy = 8;
        }

        const rockBump = rockTexture.clone();
        rockBump.colorSpace = THREE.NoColorSpace;
        rockBump.needsUpdate = true;

        const mossBump = mossTexture.clone();
        mossBump.colorSpace = THREE.NoColorSpace;
        mossBump.needsUpdate = true;

        return {
            rock: new THREE.MeshStandardMaterial({
                map: rockTexture,
                bumpMap: rockBump,
                bumpScale: 0.18,
                roughness: 0.95,
                metalness: 0,
                flatShading: false
            }),

            moss: new THREE.MeshStandardMaterial({
                map: mossTexture,
                bumpMap: mossBump,
                bumpScale: 0.10,
                roughness: 1,
                metalness: 0,
                flatShading: false
            })
        };
    }




    createCliffs() {
        const cliffGroup = new THREE.Group();

        // Last inn teksturer
        const loader = new THREE.TextureLoader();

        const rockTexture = loader.load('./textures/RockColor.jpg');
        const mossTexture = loader.load('./textures/moss.png');

        rockTexture.colorSpace = THREE.SRGBColorSpace;
        mossTexture.colorSpace = THREE.SRGBColorSpace;

        for (const texture of [rockTexture, mossTexture]) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            texture.anisotropy = 8;
        }

       

        // Shader som blander stein og mose
        const createMossMaterial = () => {
            const material = new THREE.MeshStandardMaterial({
                map: rockTexture,
                color: 0xb0b0b0,
                roughness: 1,
                metalness: 0,
                flatShading: false
            });

            material.onBeforeCompile = (shader) => {
                shader.uniforms.mossMap = { value: mossTexture };

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <common>',
                    `
                #include <common>
                varying vec3 vLocalPosition;
                varying vec3 vLocalNormal;
                `
                );

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <begin_vertex>',
                    `
                #include <begin_vertex>
                vLocalPosition = position;
                vLocalNormal = normal;
                `
                );

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `
                #include <common>
                uniform sampler2D mossMap;
                varying vec3 vLocalPosition;
                varying vec3 vLocalNormal;
                `
                );

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <map_fragment>',
                    `
                #include <map_fragment>

                vec3 rockNormal = normalize(vLocalNormal);

                // Mer mose på oppovervendte flater
                float upward = smoothstep(
                    0.05, 0.8, rockNormal.y
                );

                // Ujevn fordeling av mose
                float pattern =
                    sin(vLocalPosition.x * 8.0) *
                    sin(vLocalPosition.z * 7.0) *
                    0.25 +
                    sin(vLocalPosition.y * 11.0) * 0.15;

                float mossAmount = smoothstep(
                    0.25,
                    0.65,
                    upward * 0.75 + pattern
                );

                vec4 mossColor = texture2D(mossMap, vMapUv);

                diffuseColor.rgb = mix(
                    diffuseColor.rgb,
                    mossColor.rgb,
                    mossAmount * 0.85
                );
                `
                );
            };

            material.customProgramCacheKey = () => 'waterfall-moss-v1';

            return material;
        };

        const rockMaterial = createMossMaterial();
        this.cliffRockMaterial = rockMaterial;

        // Lag ujevn steingeometri
        const createRockGeometry = () => {
            const geometry = new THREE.IcosahedronGeometry(1, 3);
            const positions = geometry.attributes.position;

            const offsets = new Map();

            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const z = positions.getZ(i);

                const key =
                    `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;

                if (!offsets.has(key)) {
                    offsets.set(key, [
                        (Math.random() - 0.5) * 0.25,
                        (Math.random() - 0.5) * 0.30,
                        (Math.random() - 0.5) * 0.25
                    ]);
                }

                const offset = offsets.get(key);

                positions.setXYZ(
                    i,
                    x + offset[0],
                    y + offset[1],
                    z + offset[2]
                );
            }

            positions.needsUpdate = true;
            geometry.computeVertexNormals();

            return geometry;
        };

        const cliffHeight = 15;

        // Fjellsider på hver side av fossen
        for (const side of [-1, 1]) {
            for (let i = 0; i < 95; i++) {
                const rock = new THREE.Mesh(
                    createRockGeometry(),
                    rockMaterial
                );

                rock.position.set(
                    side * (3.0 + Math.random() * 5.0),
                    Math.random() * cliffHeight,
                    (Math.random() - 0.5) * 3.5
                );

                rock.scale.set(
                    2.0 + Math.random() * 1.5,
                    1.8 + Math.random() * 2.0,
                    1.8 + Math.random() * 1.3
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

        // Mindre steiner som fyller mellomrom
        for (const side of [-1, 1]) {
            for (let i = 0; i < 55; i++) {
                const rock = new THREE.Mesh(
                    createRockGeometry(),
                    rockMaterial
                );

                rock.position.set(
                    side * (2.4 + Math.random() * 2.2),
                    Math.random() * 11,
                    -0.5 + Math.random() * 1.2
                );

                rock.scale.set(
                    1.2 + Math.random(),
                    1.2 + Math.random() * 1.3,
                    1.2 + Math.random()
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

        // Fjellkant over fossen
        for (let i = 0; i < 25; i++) {
            const rock = new THREE.Mesh(
                createRockGeometry(),
                rockMaterial
            );

            rock.position.set(
                (Math.random() - 0.5) * 16,
                cliffHeight + Math.random() * 4,
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

        // Plasser fjellveggen
        const groundY = this.terrain.getHeight(
            this.x,
            this.z
        );

        cliffGroup.position.set(
            this.x,
            groundY - 1,
            this.z
        );

        this.scene.add(cliffGroup);
        this.cliffGroup = cliffGroup;

        // Behold kollisjonssystemet
        cliffGroup.updateMatrixWorld(true);

        const playerHeight = 1.7;

        cliffGroup.traverse((child) => {
            if (!child.isMesh) return;

            const box = new THREE.Box3().setFromObject(child);

            const center = new THREE.Vector3();
            box.getCenter(center);

            const terrainY = this.terrain.getHeight(
                center.x,
                center.z
            );

            const playerBottom = terrainY;
            const playerTop = terrainY + playerHeight;

            if (
                box.max.y < playerBottom ||
                box.min.y > playerTop
            ) {
                return;
            }

            this.collisionManager.addBox(
                box.min.x,
                box.max.x,
                box.min.z,
                box.max.z
            );
        });

        console.log(
            'Fjellvegg med steintekstur, mose og kollisjon er opprettet!'
        );
    }


    createWaterfall() {
        // Størrelsen på vannfallet
        const waterfallWidth = 4.5;
        const waterfallHeight = 14;

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
                uTime: { value: 0 },
                uDaylight: { value: 1.0 }
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
uniform float uDaylight;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // Vannet renner nedover
    float flow = uv.y + uTime * 0.65;

    // Ujevn forskyvning av vannstripene
    float distortion =
        sin(uv.y * 13.0 + uTime * 1.7) * 0.012 +
        sin(uv.y * 29.0 - uTime * 2.3) * 0.006 +
        sin(uv.x * 22.0 + flow * 9.0) * 0.004;

    float x = uv.x + distortion;

    // Brede og smale vannstrømmer
    float stream1 = sin(
        x * 65.0 +
        sin(flow * 8.0) * 1.2
    );

    float stream2 = sin(
        x * 125.0 -
        flow * 13.0
    );

    float stream3 = sin(
        x * 190.0 +
        sin(flow * 19.0) * 0.8
    );

    // Små turbulente detaljer
    float turbulence =
        sin(x * 37.0 + flow * 42.0) *
        sin(x * 81.0 - flow * 26.0);

    float streams =
        stream1 * 0.32 +
        stream2 * 0.22 +
        stream3 * 0.12 +
        turbulence * 0.18;

    float whiteWater = smoothstep(
        0.05,
        0.48,
        streams
    );

    // Mer skummende vann nederst
    float bottomFoam =
        1.0 - smoothstep(0.0, 0.28, uv.y);

    float foamDetails =
        sin(x * 48.0 + flow * 35.0) *
        sin(flow * 65.0);

    float foam =
        whiteWater * 0.65 +
        bottomFoam * max(foamDetails, 0.0) * 0.25;

    // Vannfarger
    vec3 deepWater = vec3(0.035, 0.20, 0.23);
    vec3 lightWater = vec3(0.12, 0.46, 0.48);
    vec3 foamColor = vec3(0.78, 0.94, 0.95);

    vec3 color = mix(
        deepWater,
        lightWater,
        0.65
    );

    color = mix(
        color,
        foamColor,
        clamp(foam, 0.0, 0.85)
    );

    // Myke, gjennomsiktige kanter
    float edgeFade =
        smoothstep(0.0, 0.08, uv.x) *
        smoothstep(0.0, 0.08, 1.0 - uv.x);

    float alpha = mix(
        0.25,
        0.94,
        edgeFade
    );
    // Svak blålig belysning om natten
    float brightness = mix(0.035, 1.0, uDaylight);
    color *= brightness;
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
            groundY + 6,
            this.z + 2.5
        );

        water.renderOrder = 1;

        this.scene.add(water);

        this.water = water;
        this.waterMaterial = material;


        // Ekstra lag med hvite vannstrømmer foran fossen
        const frontMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDaylight: { value: 1.0 }
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
                uniform float uDaylight;
                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;

                    // Ujevne strømmer som beveger seg nedover
                    float flow = uv.y + uTime * 0.9;

                    float distortion =
                        sin(flow * 17.0 + uv.x * 12.0) * 0.018 +
                        sin(flow * 31.0 - uv.x * 8.0) * 0.008;

                    float x = uv.x + distortion;

                    float stream1 = sin(
                        x * 52.0 + flow * 7.0
                    );

                    float stream2 = sin(
                        x * 108.0 - flow * 12.0
                    );

                    float stream3 = sin(
                        x * 175.0 + flow * 19.0
                    );

                    float pattern =
                        stream1 * 0.45 +
                        stream2 * 0.30 +
                        stream3 * 0.25;

                    // Bare deler av vannlaget blir synlige
                    float streams = smoothstep(
                        0.25,
                        0.65,
                        pattern
                    );

                    // Bryt opp de lange stripene
                    float breakup =
                        0.65 +
                        0.35 * sin(
                            flow * 24.0 +
                            x * 16.0
                        );

                    float edgeFade =
                        smoothstep(0.0, 0.08, uv.x) *
                        smoothstep(0.0, 0.08, 1.0 - uv.x);

                    float alpha =
                        streams *
                        breakup *
                        edgeFade *
                        0.55;

                    vec3 color = vec3(
                        0.88,
                        0.96,
                        1.0
                    );
                    // Svak blålig belysning om natten
                    float brightness = mix(0.035, 1.0, uDaylight);
                    color *= brightness;

                    gl_FragColor = vec4(color, alpha);

                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }
            `,

            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // Kopier formen til den eksisterende fossen
        const frontGeometry = geometry.clone();

        const frontWater = new THREE.Mesh(
            frontGeometry,
            frontMaterial
        );

        // Samme plassering som fossen
        frontWater.position.copy(water.position);

        // Flytt laget litt frem mot dammen
        frontWater.position.z += 0.08;

        frontWater.renderOrder = 2;

        this.scene.add(frontWater);

        this.frontWater = frontWater;
        this.frontWaterMaterial = frontMaterial;


        console.log('Animert vannfall er opprettet!');
    }

    createPool() {

        const poolRadius = 5.5;
        const segments = 64;

        // Lag en rund dam med ujevne kanter
        const geometry = new THREE.CircleGeometry(poolRadius, segments);
        const positions = geometry.attributes.position;

        for (let i = 1; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const angle = Math.atan2(y, x);

            const variation =
                1 +
                Math.sin(angle * 5) * 0.07 +
                Math.cos(angle * 9) * 0.04;

            positions.setXY(i, x * variation, y * variation);
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();

        // Materiale med animert vannoverflate
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDaylight: { value: 1.0 }
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
                    uniform float uDaylight;
                    varying vec2 vUv;
        
                    void main() {
                        vec2 uv = vUv;
        
                        float wave1 = sin(
                            uv.x * 35.0 + uTime * 0.8
                        );
        
                        float wave2 = sin(
                            uv.y * 40.0 - uTime * 0.6
                        );
        
                        float waves = wave1 * 0.5 + wave2 * 0.5;
        
                        vec3 deepWater = vec3(0.035, 0.16, 0.17);
                        vec3 lightWater = vec3(0.10, 0.32, 0.31);
        
                        float blend = 0.5 + waves * 0.15;
                        vec3 color = mix(deepWater, lightWater, blend);

                        // Svak blålig belysning om natten
                        float brightness = mix(0.035, 1.0, uDaylight);
                        color *= brightness;
        
                        gl_FragColor = vec4(color, 1.0);
        
                        #include <tonemapping_fragment>
                        #include <colorspace_fragment>
                    }
                `,

            transparent: false,
            depthWrite: true,
            side: THREE.DoubleSide
        });

        const pool = new THREE.Mesh(geometry, material);

        // Legg dammen horisontalt
        pool.rotation.x = -Math.PI / 2;

        // Plasser dammen nederst i fossen
        const waterLevel = this.terrain.getPoolWaterLevel();

        pool.position.set(
            this.x,
            waterLevel - 1.0,
            this.z + 4
        );

        pool.renderOrder = 2;

        this.scene.add(pool);

        this.pool = pool;
        this.poolMaterial = material;
    }



    createPoolRocks() {
        const poolX = this.x;
        const poolZ = this.z + 4;
    
        // Last inn steintekstur
        const rockTexture = new THREE.TextureLoader().load(
            './textures/RockColor.jpg'
        );
    
        rockTexture.colorSpace = THREE.SRGBColorSpace;
        rockTexture.wrapS = THREE.RepeatWrapping;
        rockTexture.wrapT = THREE.RepeatWrapping;
        rockTexture.anisotropy = 8;
    
        const rockMaterial = new THREE.MeshStandardMaterial({
            map: rockTexture,
            color: 0xffffff,
            roughness: 1,
            metalness: 0,
            flatShading: false
        });
    
        const rockGroup = new THREE.Group();
    
        // Generer steiner tilfeldig rundt dammen
        const numberOfRocks = 65;
    
        for (let i = 0; i < numberOfRocks; i++) {
    
            // Tilfeldig plassering rundt dammen
            const angle = Math.random() * Math.PI * 2;
            const radius = 4.5 + Math.random() * 2.0;
    
            const x = poolX + Math.cos(angle) * radius;
            const z = poolZ + Math.sin(angle) * radius;
    
            // Finn høyden på terrenget
            const groundY = this.terrain.getHeight(x, z);
    
            // Opprett stein
            const geometry = new THREE.IcosahedronGeometry(1, 1);
            const rock = new THREE.Mesh(geometry, rockMaterial);
    
            // Tilfeldig størrelse og form
            const size = 0.3 + Math.random() * 0.6;
    
            rock.scale.set(
                size * (1.2 + Math.random() * 0.5),
                size * (0.5 + Math.random() * 0.4),
                size * (0.9 + Math.random() * 0.5)
            );
    
            // Plasser steinen delvis ned i terrenget
            rock.position.set(
                x,
                groundY - size * 0.2,
                z
            );
    
            // Tilfeldig rotasjon
            rock.rotation.set(
                Math.random() * 0.3,
                Math.random() * Math.PI * 2,
                Math.random() * 0.3
            );
    
            // Skygger
            rock.castShadow = true;
            rock.receiveShadow = true;
    
            rockGroup.add(rock);
        }
    
        // Legg steinene til scenen
        this.scene.add(rockGroup);
        this.poolRocks = rockGroup;
    
        console.log('65 steiner rundt dammen er opprettet!');
    }



    createWaterfallFoam() {
        const foamGroup = new THREE.Group();

        const waterLevel =
            this.terrain.getPoolWaterLevel() - 1.0;

        const foamMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDaylight: { value: 1.0 }
            },

            vertexShader: `
            varying vec2 vUv;

            void main() {
                vUv = uv;
                gl_Position = projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,

            fragmentShader: `
            uniform float uTime;
            uniform float uDaylight;
            varying vec2 vUv;

            void main() {
                vec2 uv = vUv * 2.0 - 1.0;

                float distanceFromCenter = length(uv);

                // Ujevn, bevegelig skumstruktur
                float pattern =
                    sin(uv.x * 18.0 + uTime * 2.0) *
                    cos(uv.y * 15.0 - uTime * 1.5);

                pattern +=
                    sin(uv.x * 31.0 - uv.y * 24.0 + uTime * 2.5)
                    * 0.35;

                // Myk og ujevn ytterkant
                float edge =
                    0.72 + pattern * 0.12;

                float alpha =
                    1.0 - smoothstep(
                        edge - 0.25,
                        edge,
                        distanceFromCenter
                    );

                // Bryt opp skummet i lyse og mørke områder
                float foamPattern =
                    smoothstep(-0.1, 0.55, pattern);

                alpha *= 0.35 + foamPattern * 0.45;

                vec3 color = mix(
                    vec3(0.55, 0.82, 0.83),
                    vec3(0.94, 0.98, 1.0),
                    foamPattern
                );
                // Svak blålig belysning om natten
                float brightness = mix(0.035, 1.0, uDaylight);
                color *= brightness;

                gl_FragColor = vec4(color, alpha);

                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,

            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const geometry = new THREE.PlaneGeometry(4.5, 3.0);

        const foam = new THREE.Mesh(geometry, foamMaterial);

        foam.rotation.x = -Math.PI / 2;

        foam.position.set(
            this.x,
            waterLevel + 0.035,
            this.z + 2.5
        );

        foam.renderOrder = 3;

        foamGroup.add(foam);
        this.scene.add(foamGroup);

        this.waterfallFoam = foamGroup;
        this.foamMaterial = foamMaterial;
    }

    createWaterSpray() {
        const waterLevel = this.terrain.getPoolWaterLevel() - 1.0;

        const geometry = new THREE.SphereGeometry(0.045, 5, 4);

        const material = new THREE.MeshBasicMaterial({
            color: 0xd5f5f5,
            transparent: true,
            opacity: 0.65,
            depthWrite: false
        });

        this.sprayParticles = [];

        for (let i = 0; i < 120; i++) {
            const particle = new THREE.Mesh(geometry, material);

            const startX = this.x + (Math.random() - 0.5) * 4.2;
            const startZ = this.z + 2.5 + (Math.random() - 0.5) * 1.8;

            particle.position.set(
                startX,
                waterLevel + Math.random() * 1.2,
                startZ
            );

            particle.userData = {
                startX,
                startZ,
                speed: 0.7 + Math.random() * 0.8,
                height: 0.5 + Math.random() * 1.2,
                phase: Math.random() * Math.PI * 2
            };

            this.scene.add(particle);
            this.sprayParticles.push(particle);
        }

        this.sprayTime = 0;
    }


    createPoolRipples() {
        this.poolRipples = [];

        const groundY = this.terrain.getHeight(this.x, this.z);
        const waterY = groundY + 0.08;

        const geometry = new THREE.RingGeometry(0.82, 0.96, 48);

        for (let i = 0; i < 5; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: 0xd5ffff,
                transparent: true,
                opacity: 0.65,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            const ripple = new THREE.Mesh(geometry, material);

            // Legg ringen flatt på vannoverflaten
            ripple.rotation.x = -Math.PI / 2;

            // Plasser bølgene der fossen treffer dammen
            ripple.position.set(
                this.x,
                waterY,
                this.z + 2.5
            );

            ripple.userData.phase = i / 5;

            this.scene.add(ripple);
            this.poolRipples.push(ripple);
        }

        this.rippleTime = 0;
    }





    // Oppdaterer vannets animasjon
    update(deltaTime) {
        if (this.waterMaterial) {
            this.waterMaterial.uniforms.uTime.value += deltaTime * 0.7;
        }
        if (this.poolMaterial) {
            this.poolMaterial.uniforms.uTime.value += deltaTime;
        }

        if (this.foamMaterial) {
            this.foamMaterial.uniforms.uTime.value += deltaTime;
        }
        if (this.frontWaterMaterial) {
            this.frontWaterMaterial.uniforms.uTime.value += deltaTime * 0.7;
        }

        if (this.sprayParticles) {
            this.sprayTime += deltaTime;

            const waterLevel = this.terrain.getPoolWaterLevel() - 1.0;

            for (const particle of this.sprayParticles) {
                const data = particle.userData;

                const t = (
                    this.sprayTime * data.speed + data.phase
                ) % 1;

                particle.position.x =
                    data.startX + Math.sin(t * Math.PI * 2) * 0.25;

                particle.position.y =
                    waterLevel + Math.sin(t * Math.PI) * data.height;

                particle.position.z =
                    data.startZ + t * 0.6;

                particle.scale.setScalar(1 - t * 0.6);
            }
        }

        // Animer bølger som sprer seg utover dammen
        if (this.poolRipples) {
            this.rippleTime += deltaTime * 0.55;

            for (const ripple of this.poolRipples) {
                const t = (this.rippleTime + ripple.userData.phase) % 1;

                // Bølgene starter små og utvider seg
                const scale = 0.4 + t * 4.2;
                ripple.scale.set(scale, scale, 1);

                // Bølgene blir gradvis svakere
                ripple.material.opacity = (1 - t) * 0.65;
            }
        }



    }

    updateLighting(daylight) {
        daylight = THREE.MathUtils.clamp(daylight, 0, 1);

        // Oppdater alle vannshaderne
        const materials = [
            this.waterMaterial,
            this.frontWaterMaterial,
            this.poolMaterial,
            this.foamMaterial
        ];

        for (const material of materials) {
            if (material) {
                material.uniforms.uDaylight.value = daylight;
            }
        }

        // Gjør vannspruten mørkere om natten
        if (this.sprayParticles?.length > 0) {
            const sprayMaterial =
                this.sprayParticles[0].material;

            sprayMaterial.color.set(0xd5f5f5)
                .multiplyScalar(
                    THREE.MathUtils.lerp(0.04, 1, daylight)
                );
        }

        // Gjør ringene på vannoverflaten mørkere
        if (this.poolRipples) {
            for (const ripple of this.poolRipples) {
                ripple.material.color.set(0xd5ffff)
                    .multiplyScalar(
                        THREE.MathUtils.lerp(0.04, 1, daylight)
                    );
            }
        }
    }

}