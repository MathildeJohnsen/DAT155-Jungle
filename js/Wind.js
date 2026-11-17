
import * as THREE from 'three';

export class Wind {
    constructor() {
        this.time = 0;
        this.materials = new Set();
    }

    addToMaterial(material, strength = 0.08) {
        if (!material || !material.isMeshStandardMaterial) {
            return material;
        }

        // Lag et eget materiale slik at andre objekter
        // som bruker originalmaterialet ikke påvirkes.
        const windMaterial = material.clone();


        windMaterial.onBeforeCompile = (shader) => {
            console.log("Wind shader compiled!");

            shader.uniforms.uWindTime = { value: 0 };
            shader.uniforms.uWindStrength = { value: strength };

            windMaterial.userData.windShader = shader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
        #include <common>

        uniform float uWindTime;
        uniform float uWindStrength;
        `
            );


            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
    #include <begin_vertex>

    // Finn høyden til hvert punkt på planten
    float heightFactor = smoothstep(
        0.0,
        1.0,
        position.y
    );

    // Myk vindbevegelse
    float windWave = sin(
        uWindTime * 1.2 +
        position.x * 1.5 +
        position.z * 0.8
    );

    // Svak bevegelse sideveis
    transformed.x +=
        windWave * uWindStrength * heightFactor;

    // Litt bevegelse i dybderetningen
    transformed.z +=
        cos(uWindTime * 0.9 + position.x)
        * uWindStrength * 0.4 * heightFactor;
    `
            );

        };


        windMaterial.customProgramCacheKey = () =>
            `jungle-wind-${strength}`;

        this.materials.add(windMaterial);

        return windMaterial;
    }

    update(deltaTime) {
        this.time += deltaTime;

        for (const material of this.materials) {
            const shader = material.userData.windShader;

            if (shader) {
                shader.uniforms.uWindTime.value = this.time;

                if (Math.floor(this.time) % 3 === 0 &&
                    Math.floor(this.time) !== this.lastShaderLog) {

                    console.log(
                        "Shader wind time:",
                        shader.uniforms.uWindTime.value
                    );

                    this.lastShaderLog = Math.floor(this.time);
                }
            }
        }

       

    }
}
