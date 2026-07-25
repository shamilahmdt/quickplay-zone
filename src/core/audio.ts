class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentBgm: string | null = null;
  private isMuted: boolean = false;
  private sequencerTimer: number | null = null;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AudioContext failed to initialize', e);
    }
  }

  playSnakeEat() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playSnakeGolden() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const now = this.ctx.currentTime;
    
    const playNote = (freq: number, delay: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.2);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    };

    playNote(600, 0);
    playNote(900, 0.08);
    playNote(1200, 0.16);
  }

  playBrickPaddle() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playBrickWall() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playBrickBreak() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playLaser() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  playExplosion() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }

  playPlayerHit() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }

  playGameOver() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const now = this.ctx.currentTime;
    
    const notes = [300, 260, 220, 180];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      
      gain.gain.setValueAtTime(0.18, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.25);
      
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.26);
    });
  }

  playLevelUp() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.ctx.resume();
    const now = this.ctx.currentTime;
    
    const notes = [330, 440, 550, 660];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      
      gain.gain.setValueAtTime(0.12, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.2);
      
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.22);
    });
  }

  startBgm(game: 'snake' | 'brick' | 'cosmic' | 'pong') {
    this.init();
    if (this.currentBgm === game) return;
    this.stopBgm();
    
    this.currentBgm = game;
    if (this.isMuted || !this.ctx) return;
    this.ctx.resume();

    let step = 0;
    const tempo = game === 'cosmic' ? 130 : game === 'snake' ? 160 : game === 'pong' ? 140 : 180; // ms per step

    const getSequence = () => {
      switch (game) {
        case 'snake':
          return [
            [261.63, 1, 'triangle'], [329.63, 1, 'triangle'], [392.00, 1, 'triangle'], [329.63, 1, 'triangle'],
            [293.66, 1, 'triangle'], [349.23, 1, 'triangle'], [440.00, 1, 'triangle'], [349.23, 1, 'triangle'],
            [329.63, 1, 'triangle'], [392.00, 1, 'triangle'], [493.88, 1, 'triangle'], [392.00, 1, 'triangle'],
            [349.23, 1, 'triangle'], [440.00, 1, 'triangle'], [523.25, 2, 'triangle'], [0, 1, 'triangle']
          ];
        case 'brick':
          return [
            [392.00, 0.5, 'sine'], [493.88, 0.5, 'sine'], [587.33, 0.5, 'sine'], [493.88, 0.5, 'sine'],
            [440.00, 0.5, 'sine'], [554.37, 0.5, 'sine'], [659.25, 0.5, 'sine'], [554.37, 0.5, 'sine'],
            [349.23, 0.5, 'sine'], [440.00, 0.5, 'sine'], [523.25, 0.5, 'sine'], [440.00, 0.5, 'sine'],
            [293.66, 0.5, 'sine'], [349.23, 0.5, 'sine'], [440.00, 0.5, 'sine'], [349.23, 0.5, 'sine']
          ];
        case 'pong':
          return [
            [110.00, 0.8, 'sawtooth'], [110.00, 0.8, 'sawtooth'], [220.00, 0.8, 'sawtooth'], [110.00, 0.8, 'sawtooth'],
            [98.00, 0.8, 'sawtooth'], [98.00, 0.8, 'sawtooth'], [196.00, 0.8, 'sawtooth'], [98.00, 0.8, 'sawtooth'],
            [87.31, 0.8, 'sawtooth'], [87.31, 0.8, 'sawtooth'], [174.61, 0.8, 'sawtooth'], [87.31, 0.8, 'sawtooth'],
            [82.41, 0.8, 'sawtooth'], [82.41, 0.8, 'sawtooth'], [164.81, 0.8, 'sawtooth'], [82.41, 0.8, 'sawtooth']
          ];
        case 'cosmic':
        default:
          return [
            [110.00, 0.8, 'sawtooth'], [110.00, 0.8, 'sawtooth'], [220.00, 0.8, 'sawtooth'], [110.00, 0.8, 'sawtooth'],
            [130.81, 0.8, 'sawtooth'], [130.81, 0.8, 'sawtooth'], [261.63, 0.8, 'sawtooth'], [130.81, 0.8, 'sawtooth'],
            [146.83, 0.8, 'sawtooth'], [146.83, 0.8, 'sawtooth'], [293.66, 0.8, 'sawtooth'], [146.83, 0.8, 'sawtooth'],
            [164.81, 0.8, 'sawtooth'], [164.81, 0.8, 'sawtooth'], [329.63, 0.8, 'sawtooth'], [164.81, 0.8, 'sawtooth']
          ];
      }
    };

    const seq = getSequence();
    
    const playTick = () => {
      if (!this.ctx || this.currentBgm !== game || this.isMuted) return;
      
      const item = seq[step % seq.length];
      const freq = item[0] as number;
      const durationMult = item[1] as number;
      const type = item[2] as 'sine' | 'square' | 'sawtooth' | 'triangle';

      if (freq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        const bgmVolume = game === 'cosmic' ? 0.012 : game === 'pong' ? 0.015 : 0.032;
        gain.gain.setValueAtTime(bgmVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (tempo / 1000) * durationMult);

        osc.start();
        osc.stop(this.ctx.currentTime + (tempo / 1000) * durationMult * 1.05);
      }
      
      step++;
      this.sequencerTimer = window.setTimeout(playTick, tempo);
    };

    playTick();
  }

  stopBgm() {
    this.currentBgm = null;
    if (this.sequencerTimer) {
      clearTimeout(this.sequencerTimer);
      this.sequencerTimer = null;
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    if (this.isMuted) {
      this.stopBgm();
    } else if (this.currentBgm) {
      const bgm = this.currentBgm as 'snake' | 'brick' | 'cosmic' | 'pong';
      this.currentBgm = null;
      this.startBgm(bgm);
    }
    return this.isMuted;
  }

  getMuted() {
    return this.isMuted;
  }
}

export const audio = new AudioManager();
export default audio;
