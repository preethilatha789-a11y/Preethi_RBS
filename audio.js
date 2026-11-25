/**
 * Web Audio API sound & music synthesizer for
 * Angry Birds: Happy Birthday Ruchitha Edition
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastStretchTime = 0;
    this.lastImpactTime = 0;
    this.songTimers = [];
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    // Play a tiny silent buffer so iOS/Chrome unlock audio cleanly
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch (_) {}
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      this.stopSong();
    }
  }

  isMuted() {
    return this.muted;
  }

  playStretch(ratio = 0.5) {
    if (this.muted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastStretchTime < 110) return;
    this.lastStretchTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const baseFreq = 130 + ratio * 150;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, t + 0.06);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.075);
  }

  playLaunch(birdType = "red") {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Slingshot twang
    const twang = ctx.createOscillator();
    const twangGain = ctx.createGain();
    twang.type = "sine";
    twang.frequency.setValueAtTime(160, t);
    twang.frequency.exponentialRampToValueAtTime(75, t + 0.14);
    twangGain.gain.setValueAtTime(0.22, t);
    twangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    twang.connect(twangGain);
    twangGain.connect(ctx.destination);
    twang.start(t);
    twang.stop(t + 0.16);

    // Expressive bird launch cry ("Wheee!")
    const cry = ctx.createOscillator();
    const cryGain = ctx.createGain();
    cry.type = "sine";
    const pitchOffset =
      birdType === "yellow" ? 1.25 : birdType === "black" ? 0.75 : birdType === "pink" ? 1.35 : 1.0;

    cry.frequency.setValueAtTime(420 * pitchOffset, t + 0.02);
    cry.frequency.exponentialRampToValueAtTime(980 * pitchOffset, t + 0.2);
    cry.frequency.exponentialRampToValueAtTime(640 * pitchOffset, t + 0.36);

    cryGain.gain.setValueAtTime(0.001, t);
    cryGain.gain.linearRampToValueAtTime(0.18, t + 0.05);
    cryGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    cry.connect(cryGain);
    cryGain.connect(ctx.destination);
    cry.start(t);
    cry.stop(t + 0.4);
  }

  playBirdChirp(pitchScale = 1.0) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const chirps = [0, 0.11];
    chirps.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const startF = (idx === 0 ? 1150 : 1380) * pitchScale;
      osc.frequency.setValueAtTime(startF, t + offset);
      osc.frequency.exponentialRampToValueAtTime(startF * 1.45, t + offset + 0.05);
      osc.frequency.exponentialRampToValueAtTime(startF * 0.9, t + offset + 0.09);

      gain.gain.setValueAtTime(0.001, t + offset);
      gain.gain.linearRampToValueAtTime(0.13, t + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.095);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.1);
    });
  }

  playAbility(birdType) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    if (birdType === "black") {
      this.playExplosion();
      return;
    }

    if (birdType === "yellow") {
      // Speed dash whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
      return;
    }

    if (birdType === "pink") {
      // Sparkly heart split chimes
      [660, 880, 1175].forEach((freq, i) => {
        this.playTone(freq, t + i * 0.055, 0.22, "triangle", 0.14);
      });
      return;
    }

    // Red shock chirp
    this.playBirdChirp(1.25);
  }

  playExplosion() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Sub bass punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(150, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.42);
    subGain.gain.setValueAtTime(0.38, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(t);
    sub.stop(t + 0.46);

    // Filtered noise burst
    this.playNoiseBurst(t, 0.38, 900, 0.28);
  }

  playImpact(material = "wood", intensity = 0.5) {
    if (this.muted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastImpactTime < 45) return;
    this.lastImpactTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = Math.min(0.24, Math.max(0.03, intensity * 0.22));

    if (material === "glass") {
      [1550, 2180, 2890].forEach((freq, i) => {
        this.playTone(freq + Math.random() * 180, t + i * 0.015, 0.12, "sine", vol * 0.7);
      });
      this.playNoiseBurst(t, 0.08, 3600, vol * 0.45);
    } else if (material === "stone") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(115, t);
      osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    } else {
      // wood / gift
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240 + Math.random() * 60, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.09);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    }
  }

  playPigPop() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Comical squeal + pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.22);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);

    this.playTone(988, t + 0.08, 0.16, "triangle", 0.12);
    this.playTone(1319, t + 0.14, 0.2, "triangle", 0.12);
  }

  playHeartPop() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    const base = notes[Math.floor(Math.random() * notes.length)];
    this.playTone(base, t, 0.18, "sine", 0.12);
    this.playTone(base * 1.5, t + 0.05, 0.18, "triangle", 0.08);
  }

  playStar(index) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const chords = [
      [523.25, 659.25],
      [587.33, 783.99],
      [659.25, 987.77, 1318.51]
    ];
    const chord = chords[Math.min(2, index)];
    chord.forEach((f, i) => {
      this.playTone(f, t + i * 0.03, 0.35, "triangle", 0.15);
    });
  }

  playFirework() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Rising whistle
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(1250, t + 0.18);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);

    // Sparkle pop
    this.playNoiseBurst(t + 0.18, 0.22, 2400, 0.12);
    this.playTone(1046.5, t + 0.19, 0.2, "sine", 0.09);
  }

  playLose() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [392, 369.99, 349.23, 293.66];
    notes.forEach((f, i) => {
      this.playTone(f, t + i * 0.18, 0.22, "sawtooth", 0.09);
    });
  }

  playHappyBirthdaySong() {
    this.stopSong();
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // "Happy Birthday to You" in C major (frequencies in Hz)
    // [freq, beats, bassFreq]
    const beatSec = 0.38;
    const melody = [
      // Happy Birth-day to you
      [261.63, 0.75, 130.81],
      [261.63, 0.25, 0],
      [293.66, 1.0, 196.0],
      [261.63, 1.0, 130.81],
      [349.23, 1.0, 174.61],
      [329.63, 2.0, 130.81],

      // Happy Birth-day to you
      [261.63, 0.75, 196.0],
      [261.63, 0.25, 0],
      [293.66, 1.0, 196.0],
      [261.63, 1.0, 130.81],
      [392.0, 1.0, 196.0],
      [349.23, 2.0, 174.61],

      // Happy Birth-day dear Ru-chi-tha!
      [261.63, 0.75, 130.81],
      [261.63, 0.25, 0],
      [523.25, 1.0, 261.63],
      [440.0, 1.0, 220.0],
      [349.23, 1.0, 174.61],
      [329.63, 1.0, 164.81],
      [293.66, 2.0, 196.0],

      // Happy Birth-day to you!
      [466.16, 0.75, 174.61],
      [466.16, 0.25, 0],
      [440.0, 1.0, 174.61],
      [349.23, 1.0, 130.81],
      [392.0, 1.0, 196.0],
      [349.23, 2.5, 174.61]
    ];

    let elapsed = 0.25;
    melody.forEach(([freq, beats, bass], idx) => {
      const dur = beats * beatSec;
      const delayMs = elapsed * 1000;
      const id = setTimeout(() => {
        if (this.muted) return;
        const c = this.ensureContext();
        if (!c) return;
        const now = c.currentTime;
        // Bright bell / chime lead
        this.playTone(freq, now, dur * 0.95, "triangle", 0.18);
        this.playTone(freq * 2, now, dur * 0.6, "sine", 0.07);
        if (bass > 0) {
          this.playTone(bass, now, dur * 1.1, "sine", 0.11);
        }
        // Cheerful bird chirps at phrase endings
        if (idx === 5 || idx === 11 || idx === 18 || idx === 24) {
          setTimeout(() => this.playBirdChirp(1.1 + Math.random() * 0.25), 140);
        }
      }, delayMs);
      this.songTimers.push(id);
      elapsed += dur;
    });

    // Final sparkle chord after song finishes
    const endId = setTimeout(() => {
      if (this.muted) return;
      const c = this.ensureContext();
      if (!c) return;
      const now = c.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this.playTone(f, now + i * 0.06, 0.85, "triangle", 0.14);
      });
      this.playBirdChirp(1.3);
    }, (elapsed + 0.15) * 1000);
    this.songTimers.push(endId);
  }

  stopSong() {
    this.songTimers.forEach((id) => clearTimeout(id));
    this.songTimers = [];
  }

  playTone(freq, startTime, duration, type = "sine", volume = 0.12) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  playNoiseBurst(startTime, duration, filterFreq, volume = 0.15) {
    const ctx = this.ctx;
    if (!ctx) return;
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }
}

window.soundFX = new SoundManager();
