import { fs } from "./fileSystem.js";

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
        this.driverName = "centeraudio.sys";
        this.noiseBuffer = null;

        // Default Volume (0.0 to 1.0)
        // UI 100% = Gain 0.5
        this.volume = 0.5;
    }

    init() {
        if (this.initialized) return;

        const drivers = fs.sys.find("drivers");
        if (!drivers || !drivers.find(this.driverName)) {
            console.warn("[AudioManager] Driver missing. Audio disabled.");
            return;
        }

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();

        // Apply stored volume
        this.masterGain.gain.value = this.volume;

        this.masterGain.connect(this.ctx.destination);

        // 1s White Noise Buffer
        const bufferSize = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.initialized = true;
    }

    // Volume Control
    setMasterVolume(val) {
        // Clamp between 0 and 1
        this.volume = Math.max(0, Math.min(1, val));

        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
        }
    }

    getVolume() {
        return this.volume;
    }

    canPlay() {
        if (!this.initialized) this.init();
        if (!this.ctx) return false;
        const drivers = fs.sys.find("drivers");
        if (!drivers || !drivers.find(this.driverName)) return false;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
    }

    playTone({ type = "sine", freq, duration, startTime = 0, vol = 1.0, filterFreq = null, slideTo = null }) {
        if (!this.canPlay()) return;

        const t = this.ctx.currentTime + startTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
        }

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        filter.type = "lowpass";
        filter.frequency.value = filterFreq || (freq * 3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + duration);
    }

    playNoise({ duration, vol = 0.5, filterFreq = 1000, filterType = "highpass" }) {
        if (!this.canPlay()) return;

        const t = this.ctx.currentTime;
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = filterType;
        filter.frequency.value = filterFreq;

        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(t);
        source.stop(t + duration);
    }

    playBoot() {
        const d = 3.5;
        this.playTone({ type: "sine", freq: 261.63, duration: d, vol: 0.15, startTime: 0 });
        this.playTone({ type: "sine", freq: 329.63, duration: d, vol: 0.15, startTime: 0.1 });
        this.playTone({ type: "sine", freq: 392.00, duration: d, vol: 0.15, startTime: 0.2 });
        this.playTone({ type: "sine", freq: 493.88, duration: d, vol: 0.15, startTime: 0.3 });
        this.playTone({ type: "sine", freq: 100, duration: 3.0, vol: 0.05, slideTo: 1000 });
    }

    playHddSeek() {
        const pitch = 600 + Math.random() * 400;
        this.playNoise({ duration: 0.01, vol: 0.04, filterFreq: pitch, filterType: "bandpass" });
    }

    playKeystroke() {
        const rand = Math.random() * 0.05;
        this.playNoise({ duration: 0.02, vol: 0.05 + rand, filterFreq: 2000, filterType: "highpass" });
        this.playTone({ type: "triangle", freq: 200 - (rand*100), duration: 0.05, vol: 0.1, slideTo: 50 });
    }

    playLogin() {
        this.playTone({ type: "sine", freq: 660, duration: 0.4, vol: 0.1 });
        this.playTone({ type: "sine", freq: 880, duration: 0.6, vol: 0.1, startTime: 0.1 });
    }

    playError() {
        this.playTone({ type: "sine", freq: 150, duration: 0.2, vol: 0.3, slideTo: 100 });
    }

    playClick() {
        this.playTone({ type: "sine", freq: 800, duration: 0.03, vol: 0.05 });
    }

    playNotification() {
        this.playTone({ type: "sine", freq: 1200, duration: 0.5, vol: 0.1 });
    }

    playSnap() {
        this.playNoise({ duration: 0.01, vol: 0.05, filterFreq: 1000, filterType: "bandpass" });
    }
}

export const audioManager = new AudioManager();