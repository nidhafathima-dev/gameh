// Web Audio API procedural sound engine for cinematic horror atmosphere
// Generates authentic wind, footsteps, creaks, door slams, bat swarms, planchette friction, and eerie drones

export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.windGain = null;
    this.windFilter = null;
    this.droneGain = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.lastStepTime = 0;
    this.stepAlternate = false;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Setup ambient layers
    this.setupWind();
    this.setupDrone();
    this.isInitialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupWind() {
    if (!this.ctx) return;
    // Generate pink noise buffer for realistic wind
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = buffer;
    windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windNoise.start(0);

    // Dynamic wind gust modulation
    this.modulateWind();
  }

  modulateWind() {
    if (!this.ctx || !this.windFilter || !this.windGain) return;
    const now = this.ctx.currentTime;
    const targetFreq = 220 + Math.random() * 500;
    const targetGain = 0.15 + Math.random() * 0.35;
    const duration = 2.5 + Math.random() * 3.5;

    this.windFilter.frequency.linearRampToValueAtTime(targetFreq, now + duration);
    this.windGain.gain.linearRampToValueAtTime(targetGain, now + duration);

    setTimeout(() => {
      this.modulateWind();
    }, duration * 1000);
  }

  setWindIntensity(intensity) { // 0.0 to 1.0
    if (!this.ctx || !this.windGain) return;
    const clamped = Math.max(0.05, Math.min(1.0, intensity));
    const now = this.ctx.currentTime;
    this.windGain.gain.linearRampToValueAtTime(0.1 + clamped * 0.45, now + 0.5);
    if (this.windFilter) {
      this.windFilter.frequency.linearRampToValueAtTime(250 + clamped * 700, now + 0.5);
    }
  }

  setupDrone() {
    if (!this.ctx) return;
    // Dark ominous horror drone
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.droneGain.connect(this.masterGain);

    const freqs = [55, 110, 116.5, 164.8]; // Low A, A, Bb (dissonant semitone), E
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140 + idx * 30, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.12 / (idx + 1), this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.droneGain);
      osc.start(0);
    });
  }

  playAwakeningBreath() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Filtered noise simulating slow deep inhalation as consciousness returns
    const bufferSize = Math.floor(this.ctx.sampleRate * 2.4);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.12;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 1.2);
    filter.frequency.exponentialRampToValueAtTime(260, now + 2.2);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  playHeartbeat() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Lub
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(75, now);
    osc1.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Dub
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.frequency.setValueAtTime(65, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(32, now + 0.32);
    gain2.gain.setValueAtTime(0.28, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.36);
  }

  playFootstep(surface = 'dirt') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastStepTime < 0.28) return;
    this.lastStepTime = now;
    this.stepAlternate = !this.stepAlternate;

    // Crunch noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = surface === 'wood' ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(surface === 'wood' ? (this.stepAlternate ? 480 : 540) : (this.stepAlternate ? 750 : 850), now);
    filter.Q.setValueAtTime(surface === 'wood' ? 4 : 1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(surface === 'wood' ? 0.22 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    // Low thump
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.frequency.setValueAtTime(surface === 'wood' ? 110 : 70, now);
    thump.frequency.exponentialRampToValueAtTime(35, now + 0.08);
    thumpGain.gain.setValueAtTime(0.18, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    thump.connect(thumpGain);
    thumpGain.connect(this.masterGain);

    noise.start(now);
    thump.start(now);
    thump.stop(now + 0.1);
  }

  playDoorCreakAndSlam() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // High ominous wood creak
    const creakOsc = this.ctx.createOscillator();
    const creakGain = this.ctx.createGain();
    creakOsc.type = 'sawtooth';
    creakOsc.frequency.setValueAtTime(180, now);
    creakOsc.frequency.linearRampToValueAtTime(420, now + 0.35);
    creakOsc.frequency.linearRampToValueAtTime(160, now + 0.6);

    const creakFilter = this.ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.setValueAtTime(550, now);
    creakFilter.Q.setValueAtTime(8, now);

    creakGain.gain.setValueAtTime(0.01, now);
    creakGain.gain.linearRampToValueAtTime(0.25, now + 0.3);
    creakGain.gain.linearRampToValueAtTime(0.001, now + 0.65);

    creakOsc.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(this.masterGain);
    creakOsc.start(now);
    creakOsc.stop(now + 0.7);

    // Violent door slam bang at +0.65s
    const slamTime = now + 0.65;
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(140, slamTime);
    boomOsc.frequency.exponentialRampToValueAtTime(25, slamTime + 0.45);

    boomGain.gain.setValueAtTime(0.9, slamTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, slamTime + 0.55);

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(slamTime);
    boomOsc.stop(slamTime + 0.6);

    // Wood impact snap
    const snapSize = Math.floor(this.ctx.sampleRate * 0.2);
    const snapBuf = this.ctx.createBuffer(1, snapSize, this.ctx.sampleRate);
    const snapData = snapBuf.getChannelData(0);
    for (let i = 0; i < snapSize; i++) {
      snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapSize * 0.15));
    }
    const snapSource = this.ctx.createBufferSource();
    snapSource.buffer = snapBuf;
    const snapFilter = this.ctx.createBiquadFilter();
    snapFilter.type = 'lowpass';
    snapFilter.frequency.setValueAtTime(1200, slamTime);
    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.8, slamTime);
    snapGain.gain.exponentialRampToValueAtTime(0.001, slamTime + 0.25);

    snapSource.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(this.masterGain);
    snapSource.start(slamTime);
  }

  playBatSwarm() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Fluttering wings noise bursts
    const numFlutters = 24;
    for (let i = 0; i < numFlutters; i++) {
      const startTime = now + 0.1 + Math.random() * 1.8;
      const duration = 0.08 + Math.random() * 0.05;

      const size = Math.floor(this.ctx.sampleRate * duration);
      const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < size; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / size);
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320 + Math.random() * 400, startTime);
      filter.Q.setValueAtTime(3.0, startTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18 + Math.random() * 0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start(startTime);
    }

    // High pitched echolocation screech chirps
    const numScreeches = 7;
    for (let s = 0; s < numScreeches; s++) {
      const chirpTime = now + 0.3 + Math.random() * 1.5;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freqStart = 3800 + Math.random() * 2500;
      const freqEnd = 2400 + Math.random() * 1500;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freqStart, chirpTime);
      osc.frequency.linearRampToValueAtTime(freqEnd, chirpTime + 0.09);

      gain.gain.setValueAtTime(0.12, chirpTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(chirpTime);
      osc.stop(chirpTime + 0.11);
    }
  }

  playPlanchetteSlide() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this._sliding) return;
    this._sliding = true;

    // Continuous subtle wood scraping
    const size = Math.floor(this.ctx.sampleRate * 0.35);
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.Q.setValueAtTime(4, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);

    setTimeout(() => {
      this._sliding = false;
    }, 280);
  }

  playLetterArrivalChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Resonant supernatural bell chime
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.setValueAtTime(659.25, now); // E5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.25);
    osc2.stop(now + 1.25);
  }

  playSpiritWhisper() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Low sinister whisper rumble
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(55, now + 1.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.7);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
