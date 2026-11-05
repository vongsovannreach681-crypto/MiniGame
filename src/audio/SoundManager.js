// Web Audio API Procedural Sound Synthesizer
// Zero external audio files required - 100% reliable in any browser environment

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.windGain = null;
    this.windFilter = null;
    this.windNode = null;
    this.isMuted = false;
    this.masterVolume = 0.8;
    this.sfxVolume = 0.9;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.initEngineAudio();
      this.initWindAudio();
      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext init failed:", e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(master, sfx) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
  }

  // --- ENGINE HUM FOR VEHICLES ---
  initEngineAudio() {
    if (!this.ctx) return;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = "sawtooth";
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = "triangle";
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(speedFraction, active) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    if (!active) {
      this.engineGain.gain.setTargetAtTime(0.0001, t, 0.1);
      return;
    }
    const targetGain = 0.15 + speedFraction * 0.22;
    const baseFreq = 40 + speedFraction * 85;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.05, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(300 + speedFraction * 900, t, 0.05);
  }

  // --- WIND RUSH FOR FREEFALL / PARACHUTE ---
  initWindAudio() {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    whiteNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);
    whiteNoise.start();
    this.windNode = whiteNoise;
  }

  updateWind(intensity) {
    if (!this.ctx || !this.windGain) return;
    const t = this.ctx.currentTime;
    const gain = Math.max(0.0001, Math.min(0.4, intensity * 0.35));
    const freq = 300 + intensity * 900;
    this.windGain.gain.setTargetAtTime(gain, t, 0.08);
    this.windFilter.frequency.setTargetAtTime(freq, t, 0.08);
  }

  // --- PROCEDURAL WEAPON SOUNDS ---
  playShoot(weaponId = "m4a1") {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    if (weaponId === "fists") {
      // Punch whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.14);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.15);
      return;
    }

    if (weaponId === "shotgun") {
      // Heavy shotgun blast
      this.playNoiseBlast(t, 0.32, 2800, 180, 0.85);
      this.playBassThump(t, 120, 35, 0.28, 0.9);
      return;
    }

    if (weaponId === "awm") {
      // Heavy sniper rifle crack and long bass tail
      this.playNoiseBlast(t, 0.55, 4500, 220, 0.95);
      this.playBassThump(t, 160, 25, 0.45, 1.0);
      return;
    }

    if (weaponId === "thompson") {
      // Rapid SMG pop
      this.playNoiseBlast(t, 0.12, 3200, 450, 0.55);
      this.playBassThump(t, 190, 75, 0.1, 0.45);
      return;
    }

    // Default: M4A1 rifle
    this.playNoiseBlast(t, 0.19, 3600, 300, 0.7);
    this.playBassThump(t, 180, 50, 0.18, 0.65);
  }

  playNoiseBlast(t, duration, highFreq, lowFreq, volume = 0.7) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-4 * (i / bufferSize));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(highFreq, t);
    filter.frequency.exponentialRampToValueAtTime(lowFreq, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
  }

  playBassThump(t, startFreq, endFreq, duration, volume = 0.5) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  // Spatial distant gunshot for bots
  playSpatialShoot(weaponId, distance, panX = 0) {
    if (!this.ctx || distance > 220) return;
    this.resume();
    const t = this.ctx.currentTime;
    const distFactor = Math.max(0.04, 1 - distance / 220);
    const volume = distFactor * 0.45;

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panX)), t);
    }

    const duration = 0.18;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-6 * (i / bufferSize));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    const cutoff = Math.max(400, 2400 * distFactor);
    filter.frequency.setValueAtTime(cutoff, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    source.start(t);
  }

  // --- HITMARKER & COMBAT FEEDBACK ---
  playHit(isHeadshot = false) {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    if (isHeadshot) {
      // High metallic chime / double ping
      [2200, 3100].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.4, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.19);
      });
    } else {
      // Crisp click / tick hitmarker
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  playHurt() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  playReload() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Click 1: Mag out
    this.playClick(t + 0.1, 750, 0.05);
    // Click 2: Mag in
    this.playClick(t + 0.8, 900, 0.06);
    // Click 3: Bolt cock
    this.playClick(t + 1.25, 1200, 0.07);
  }

  playClick(time, freq, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  playFootstep(surface = "grass") {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const duration = 0.07;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = surface === "road" ? "highpass" : "lowpass";
    filter.frequency.setValueAtTime(surface === "road" ? 800 : 380, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
  }

  playJump() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(290, t + 0.15);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playParachuteOpen() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Canopy snap sound
    this.playNoiseBlast(t, 0.45, 1800, 150, 0.6);
  }

  playPickup() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.06); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.12); // G5
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playHeal() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.35);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playZoneWarning() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.setValueAtTime(500, t + 0.25);
    osc.frequency.setValueAtTime(700, t + 0.5);
    osc.frequency.setValueAtTime(500, t + 0.75);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1100, t);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.15);
  }

  playAirdropHorn() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.setValueAtTime(220, t + 0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.45);
  }

  playVictory() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0.35, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.65);
    });
  }

  playDefeat() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [392.00, 369.99, 329.63, 293.66, 261.63];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t + idx * 0.2);
      gain.gain.setValueAtTime(0.28, t + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.2 + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.2);
      osc.stop(t + idx * 0.2 + 0.5);
    });
  }
}

export const sounds = new SoundManager();
