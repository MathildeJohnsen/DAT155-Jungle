import Stats from 'three/addons/libs/stats.module.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Terrain } from './Terrain.js';
import { PlayerController } from './PlayerController.js';
import { Vegetation } from './Vegetation.js';
import { Rocks } from './Rocks.js';
import { Grass } from './Grass.js';
import { Waterfall } from './Waterfall.js';
import { Bird } from './Bird.js';
import { Butterflies } from './Butterflies.js';
import { Anaconda } from './Anaconda.js';
import { FogEffects } from './FogEffects.js';
import { Sun } from './Sun.js';
import { SunRays } from './SunRays.js';
import { Undergrowth } from './Undergrowth.js';
import { JungleSounds } from './JungleSounds.js';
import { Wind } from './Wind.js';
import { CollisionManager } from './CollisionManager.js';
import { VRController } from './VRController.js';

// Scene
const scene = new THREE.Scene();
const wind = new Wind();
scene.background = new THREE.Color(0x87b9c7);
scene.fog = new THREE.Fog(0x87b9c7, 20, 100);

// Kamera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);


camera.position.set(0, 1.7, 40);

const jungleSounds = new JungleSounds(camera);
scene.add(jungleSounds.waterfallSound);
function startJungleAudio() {
    jungleSounds.start();

    window.removeEventListener('pointerdown', startJungleAudio);
    window.removeEventListener('keydown', startJungleAudio);
}

window.addEventListener('pointerdown', startJungleAudio);
window.addEventListener('keydown', startJungleAudio);

// Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.setPixelRatio(1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
const stats = new Stats();
document.body.appendChild(stats.dom);

// Vis antall trekanter og draw calls
const performanceDisplay = document.createElement('div');

performanceDisplay.style.cssText = `
    position: fixed;
    top: 60px;
    left: 0;
    padding: 10px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font: 12px monospace;
    z-index: 1000;
    pointer-events: none;
`;

document.body.appendChild(performanceDisplay);

let lastPerformanceUpdate = 0;

document.body.appendChild(VRButton.createButton(renderer));

// Lys
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);


const sunlight = new THREE.DirectionalLight(0xfff2d6, 2);
sunlight.position.set(20, 40, 20);
sunlight.castShadow = true;

// Oppløsning på skyggene
sunlight.shadow.mapSize.width = 2048;
sunlight.shadow.mapSize.height = 2048;

// Området som skal få skygger
sunlight.shadow.camera.left = -80;
sunlight.shadow.camera.right = 80;
sunlight.shadow.camera.top = 80;
sunlight.shadow.camera.bottom = -80;

sunlight.shadow.camera.near = 0.5;
sunlight.shadow.camera.far = 200;

// Reduserer skyggeartefakter
sunlight.shadow.bias = -0.0001;
sunlight.shadow.normalBias = 0.02;

// Mykere skygger
sunlight.shadow.radius = 3;

sunlight.shadow.camera.updateProjectionMatrix();

scene.add(sunlight);


const sun = new Sun(scene, sunlight, camera, ambientLight);

// Solstråler
const sunRays = new SunRays(scene, sunlight, camera);


// Opprett jungelterreng
const terrain = new Terrain(scene);

const collisionManager = new CollisionManager(scene);

// Opprett vegetasjon
const vegetation = new Vegetation(
    scene,
    terrain,
    wind,
    collisionManager
);


const undergrowth = new Undergrowth(scene, terrain);

const butterflies = new Butterflies(scene, terrain);

const anaconda = new Anaconda(scene, terrain);

const fogEffects = new FogEffects(scene, terrain);

//Oppretter steiner i terrenget
const rocks = new Rocks(scene, terrain);


//Oppretter gress-terreng
const grass = new Grass(scene, terrain);

// Oppretter foss
const waterfall = new Waterfall(
    scene,
    terrain,
    collisionManager
);

const birds = new Bird(scene, camera, 5);



// Opprett spillerkontroller


const player = new PlayerController(
    camera,
    terrain,
    renderer.domElement,
    collisionManager
);

const vrController = new VRController(
    renderer,
    scene,
    camera,
    terrain,
    collisionManager
);


// Håndter endring av vindusstørrelse
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
});

// Animasjonsløkke

const timer = new THREE.Timer();


renderer.setAnimationLoop(() => {
    timer.update();

    const frameDelta = timer.getDelta();
    const deltaTime = Math.min(frameDelta, 0.05);

    // Oppdater spilleren
    if (renderer.xr.isPresenting) {
        vrController.update(deltaTime);
    } else {
        player.update(deltaTime);
    }

    // Oppdater solens posisjon og lys
    sun.update(frameDelta);
    
    const daylight = sun.sunlight.intensity / 2;

    // Oppdater terrengets grunnbelysning
    terrain.material.uniforms.ambientStrength.value =
        THREE.MathUtils.lerp(0.025, 0.35, daylight);

    // Oppdater solretningen
    terrain.material.uniforms.sunDirection.value
        .copy(sun.direction);

    // Oppdater dagslys
    terrain.material.uniforms.daylight.value = daylight;


    // Oppdater andre animasjoner

    // Oppdater belysningen
    fogEffects.updateLighting(daylight);
    waterfall.updateLighting(daylight);
    jungleSounds.update(daylight);

    // Oppdater animasjonene
    sunRays.update(deltaTime, sun.direction, daylight);
    waterfall.update(deltaTime);
    butterflies.update(deltaTime * 2.5);
    anaconda.update(deltaTime);
    birds.update(deltaTime);
    fogEffects.update(deltaTime);
    wind.update(deltaTime);
    


    // Tegn scenen
    // Tegn scenen
renderer.render(scene, camera);
stats.update();

// Oppdater ytelsesinformasjon hvert sekund
const now = performance.now();

if (now - lastPerformanceUpdate >= 1000) {
    const triangles = renderer.info.render.triangles;
    const drawCalls = renderer.info.render.calls;

    performanceDisplay.innerHTML = `
        Triangles: ${triangles.toLocaleString()}<br>
        Draw calls: ${drawCalls}
    `;

    lastPerformanceUpdate = now;
}
});


