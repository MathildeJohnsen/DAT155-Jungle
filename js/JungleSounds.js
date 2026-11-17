
import * as THREE from 'three';

export class JungleSounds {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.daySound = new THREE.Audio(this.listener);
        this.nightSound = new THREE.Audio(this.listener);

        // 3D-lyd fra fossen
        this.waterfallSound = new THREE.PositionalAudio(this.listener);

        // Plasser lyden ved fossen
        this.waterfallSound.position.set(28, 3, -34);

        // Hvor raskt lyden avtar med avstand
        this.waterfallSound.setRefDistance(8);
        this.waterfallSound.setRolloffFactor(1.5);
        this.waterfallSound.setDistanceModel('inverse');
        this.waterfallSound.setMaxDistance(100);

        this.loader = new THREE.AudioLoader();
        this.started = false;
        this.daylight = 1;

        this.loadSound(
            this.daySound,
            './js/sounds/jungle_day.mp3'
        );

        this.loadSound(
            this.nightSound,
            './js/sounds/jungle_night.mp3'
        );
        this.loadSound(
            this.waterfallSound,
            './js/sounds/waterfall.mp3'
        );
    }

    loadSound(sound, path) {
        this.loader.load(
            path,
            (buffer) => {
                sound.setBuffer(buffer);
                sound.setLoop(true);
                sound.setVolume(0);
            },
            undefined,
            (error) => {
                console.error('Kunne ikke laste lyd:', path, error);
            }
        );
    }

    async start() {
        if (this.started) return;

        try {
            await this.listener.context.resume();

            this.started = true;

            if (this.daySound.buffer) {
                this.daySound.play();
            }

            if (this.nightSound.buffer) {
                this.nightSound.play();
            }
            if (this.waterfallSound.buffer) {
                this.waterfallSound.play();
            }

            this.update(this.daylight);
        } catch (error) {
            console.error('Kunne ikke starte lyd:', error);
        }
    }

    update(daylight) {
        this.daylight = THREE.MathUtils.clamp(
            daylight, 0, 1
        );

        if (!this.started) return;

        // Start lyd dersom filen ble lastet etter
        // at spilleren aktiverte lyd.
        for (const sound of [
            this.daySound,
            this.nightSound,
            this.waterfallSound
        ]) {
            if (sound.buffer && !sound.isPlaying) {
                sound.play();
            }
        }

        const dayVolume = this.daylight * 0.45;
        const nightVolume = (1 - this.daylight) * 0.45;

        this.daySound.setVolume(dayVolume);
        this.nightSound.setVolume(nightVolume);
        this.waterfallSound.setVolume(0.35);
        this.waterfallSound.setRefDistance(12);
        this.waterfallSound.setRolloffFactor(1.0);
        this.waterfallSound.setDistanceModel('inverse');
    }
}
