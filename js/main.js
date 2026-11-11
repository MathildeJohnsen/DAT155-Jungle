import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Terrain } from './Terrain.js';
import { PlayerController } from './PlayerController.js';
import { Vegetation } from './Vegetation.js';
import { Rocks } from './Rocks.js';
import { Grass } from './Grass.js';
import { Waterfall} from './Waterfall.js';
// Scene
const scene = new THREE.Scene();
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

// Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Lys
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(20, 40, 20);
sunlight.castShadow = true;
scene.add(sunlight);



 // Opprett jungelterreng
 const terrain = new Terrain(scene);

 // Opprett vegetasjon
 const vegetation = new Vegetation(scene, terrain);

 //Oppretter steiner i terrenget
 const rocks = new Rocks(scene, terrain);

console.log('Tester innlasting av gress');

 //Oppretter gress-terreng
 const grass = new Grass(scene, terrain);

 // Oppretter foss
 const waterfall = new Waterfall(scene, terrain);
 
 // Opprett spillerkontroller
 const player = new PlayerController(
     camera,
     terrain,
     renderer.domElement
 );
 


// Midlertidig testobjekt
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
);

cube.position.set(0, 1, 0);
cube.castShadow = true;
scene.add(cube);

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

    const deltaTime = Math.min(timer.getDelta(), 0.05);

    player.update(deltaTime);
    waterfall.update(deltaTime);

    renderer.render(scene, camera);

});

