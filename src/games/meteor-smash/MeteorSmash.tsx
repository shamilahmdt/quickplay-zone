import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { audio } from '../../core/audio';
import { 
  Award, Play, Pause, RotateCcw, Volume2, VolumeX, 
  Sparkles 
} from 'lucide-react';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface MeteorVertex {
  angle: number;
  radius: number;
}

interface Meteor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  tier: 'large' | 'medium' | 'small';
  angle: number;
  rotSpeed: number;
  vertices: MeteorVertex[];
  points: number;
  color: string;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  isEnemy?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape: 'circle' | 'spark' | 'line';
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'triple' | 'shield' | 'emp';
  life: number;
  radius: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Ufo {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tier: 'large' | 'small';
  radius: number;
  shootTimer: number;
  soundTimer: number;
  dirTimer: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const CANVAS_SIZE = 600;

export const MeteorSmash: FC = () => {
  // Game UI state
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const stats = storage.getGameStats('meteor_smash_medium');
    return stats.highScore || storage.getGameStats('meteor_smash').highScore || 0;
  });
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [combo, setCombo] = useState(1);
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [powerUpDuration, setPowerUpDuration] = useState(0);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [muted, setMuted] = useState(audio.getMuted());
  const [leaderboard, setLeaderboard] = useState<ReturnType<typeof storage.getLeaderboard>>(() =>
    storage.getLeaderboard('meteor_smash_medium')
  );
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const handleDifficultyChange = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    const statsKey = `meteor_smash_${newDiff.toLowerCase()}`;
    const stats = storage.getGameStats(statsKey);
    const best = stats.highScore || storage.getGameStats('meteor_smash').highScore || 0;
    setHighScore(best);
    setLeaderboard(storage.getLeaderboard(statsKey));
  };

  // Canvas and animation refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // High-frequency mutable game engine state inside ref (prevents re-render lag)
  const engine = useRef({
    keys: {} as Record<string, boolean>,
    ship: {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 12,
      thrusting: false,
      invulnerableTime: 0,
      shieldActive: false,
      weapon: 'normal' as 'normal' | 'triple' | 'rapid',
      weaponTimer: 0,
      shootCooldown: 0,
      hyperspaceCooldown: 0,
    },
    meteors: [] as Meteor[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    powerups: [] as PowerUp[],
    floatingTexts: [] as FloatingText[],
    stars: [] as Star[],
    ufo: {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      tier: 'large' as 'large' | 'small',
      radius: 18,
      shootTimer: 0,
      soundTimer: 0,
      dirTimer: 0,
    } as Ufo,
    ufoSpawnTimer: 20,
    shakeIntensity: 0,
    comboMultiplier: 1,
    comboTimer: 0,
    waveNumber: 1,
    scoreVal: 0,
    livesVal: 3,
    nextLifeScore: 10000,
    shockwave: null as { x: number; y: number; radius: number; maxRadius: number; life: number } | null,
    nextMeteorId: 1,
    nextBulletId: 1,
  });

  useEffect(() => {
    storage.incrementPlayCount('meteor_smash');
  }, []);

  // Broadcast playing status for GamePage scroll suppression
  useEffect(() => {
    const isPlaying = gameStatus === 'PLAYING';
    window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying } }));
    return () => {
      window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying: false } }));
    };
  }, [gameStatus]);

  // Audio BGM management
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      audio.startBgm('meteor');
    } else {
      audio.stopBgm();
    }
    return () => {
      audio.stopBgm();
    };
  }, [gameStatus]);

  const toggleSound = () => {
    const isMuted = audio.toggleMute();
    setMuted(isMuted);
  };

  // Generate background stars
  const initStars = useCallback(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * CANVAS_SIZE,
        y: Math.random() * CANVAS_SIZE,
        size: Math.random() * 1.8 + 0.5,
        brightness: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    engine.current.stars = stars;
  }, []);

  // Procedural craggy meteor generator
  const createMeteor = useCallback((
    x: number,
    y: number,
    tier: 'large' | 'medium' | 'small',
    initVx?: number,
    initVy?: number
  ): Meteor => {
    let radius = 38;
    let points = 20;
    let speed = 1.2;
    let numVertices = 12;
    let color = '#fb923c'; // Neon orange

    if (tier === 'medium') {
      radius = 22;
      points = 50;
      speed = 1.9;
      numVertices = 10;
      color = '#f97316';
    } else if (tier === 'small') {
      radius = 12;
      points = 100;
      speed = 2.8;
      numVertices = 8;
      color = '#fdba74';
    }

    // Scale speed by difficulty
    if (difficulty === 'EASY') speed *= 0.8;
    if (difficulty === 'HARD') speed *= 1.35;

    // Generate irregular polygon vertices with randomized radial deviations
    const vertices: MeteorVertex[] = [];
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const deviation = (Math.random() * 0.45 - 0.22) * radius;
      vertices.push({
        angle,
        radius: radius + deviation,
      });
    }

    const angleDir = Math.random() * Math.PI * 2;
    const finalVx = initVx !== undefined ? initVx : Math.cos(angleDir) * (speed * (Math.random() * 0.5 + 0.75));
    const finalVy = initVy !== undefined ? initVy : Math.sin(angleDir) * (speed * (Math.random() * 0.5 + 0.75));

    return {
      id: engine.current.nextMeteorId++,
      x,
      y,
      vx: finalVx,
      vy: finalVy,
      radius,
      tier,
      angle: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      vertices,
      points,
      color,
    };
  }, [difficulty]);

  // Spawn initial wave of meteors away from player
  const spawnWave = useCallback((waveNum: number) => {
    const meteorCount = Math.min(3 + waveNum, 10);
    const newMeteors: Meteor[] = [];
    const shipX = engine.current.ship.x;
    const shipY = engine.current.ship.y;
    const safeDistance = 140;

    for (let i = 0; i < meteorCount; i++) {
      let x = 0;
      let y = 0;
      let attempts = 0;
      while (attempts < 100) {
        x = Math.random() * CANVAS_SIZE;
        y = Math.random() * CANVAS_SIZE;
        attempts++;
        if (Math.hypot(x - shipX, y - shipY) >= safeDistance) break;
      }

      newMeteors.push(createMeteor(x, y, 'large'));
    }

    engine.current.meteors = newMeteors;
    engine.current.floatingTexts.push({
      id: Math.random(),
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 3,
      text: `SECTOR WAVE ${waveNum}`,
      color: '#38bdf8',
      life: 2.2,
      maxLife: 2.2,
    });
  }, [createMeteor]);

  // Screen wrap logic
  const wrapPosition = (obj: { x: number; y: number }, padding = 15) => {
    if (obj.x < -padding) obj.x = CANVAS_SIZE + padding;
    else if (obj.x > CANVAS_SIZE + padding) obj.x = -padding;

    if (obj.y < -padding) obj.y = CANVAS_SIZE + padding;
    else if (obj.y > CANVAS_SIZE + padding) obj.y = -padding;
  };

  // Particle explosion helper
  const triggerExplosion = (x: number, y: number, color: string, count = 20, speedMult = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3.5 + 1) * speedMult;
      engine.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.6 + 0.4,
        maxLife: 1.0,
        color: Math.random() > 0.4 ? color : '#ffffff',
        size: Math.random() * 2.5 + 1,
        shape: Math.random() > 0.5 ? 'spark' : 'circle',
      });
    }
  };

  // Hyperspace emergency warp
  const triggerHyperspace = () => {
    const s = engine.current.ship;
    if (s.hyperspaceCooldown > 0 || gameStatus !== 'PLAYING') return;

    // Warp flash particles at current position
    triggerExplosion(s.x, s.y, '#c084fc', 28, 1.8);
    audio.playHyperspace();

    // Randomize position safely
    s.x = Math.random() * (CANVAS_SIZE - 80) + 40;
    s.y = Math.random() * (CANVAS_SIZE - 80) + 40;
    s.vx *= 0.2;
    s.vy *= 0.2;
    s.invulnerableTime = 1.2;
    s.hyperspaceCooldown = 4.0; // 4s cooldown

    // Warp in arrival particles
    triggerExplosion(s.x, s.y, '#38bdf8', 24, 1.5);
    engine.current.floatingTexts.push({
      id: Math.random(),
      x: s.x,
      y: s.y - 20,
      text: 'HYPERSPACE JUMP',
      color: '#c084fc',
      life: 1.2,
      maxLife: 1.2,
    });
  };

  // Shoot lasers
  const fireLaser = () => {
    const s = engine.current.ship;
    if (s.shootCooldown > 0 || gameStatus !== 'PLAYING') return;

    const cooldown = s.weapon === 'rapid' ? 0.09 : 0.16;
    s.shootCooldown = cooldown;

    const baseSpeed = 8.5;
    const noseX = s.x + Math.cos(s.angle) * (s.radius + 6);
    const noseY = s.y + Math.sin(s.angle) * (s.radius + 6);

    if (s.weapon === 'triple') {
      const angles = [s.angle - 0.22, s.angle, s.angle + 0.22];
      angles.forEach((ang) => {
        engine.current.bullets.push({
          id: engine.current.nextBulletId++,
          x: noseX,
          y: noseY,
          vx: Math.cos(ang) * baseSpeed + s.vx * 0.25,
          vy: Math.sin(ang) * baseSpeed + s.vy * 0.25,
          life: 1.1,
          maxLife: 1.1,
          color: '#38bdf8',
        });
      });
    } else {
      engine.current.bullets.push({
        id: engine.current.nextBulletId++,
        x: noseX,
        y: noseY,
        vx: Math.cos(s.angle) * baseSpeed + s.vx * 0.25,
        vy: Math.sin(s.angle) * baseSpeed + s.vy * 0.25,
        life: 1.15,
        maxLife: 1.15,
        color: s.weapon === 'rapid' ? '#facc15' : '#38bdf8',
      });
    }

    audio.playMeteorLaser();
  };

  // Reset Game
  const resetGame = () => {
    initStars();
    const initialLives = difficulty === 'EASY' ? 4 : difficulty === 'HARD' ? 2 : 3;
    setLives(initialLives);
    setScore(0);
    setWave(1);
    setCombo(1);
    setActivePowerUp(null);
    setShowNamePrompt(false);
    setName('');

    engine.current.livesVal = initialLives;
    engine.current.scoreVal = 0;
    engine.current.waveNumber = 1;
    engine.current.comboMultiplier = 1;
    engine.current.comboTimer = 0;
    engine.current.bullets = [];
    engine.current.particles = [];
    engine.current.powerups = [];
    engine.current.floatingTexts = [];
    engine.current.ufo.active = false;
    engine.current.ufoSpawnTimer = 22;
    engine.current.shakeIntensity = 0;
    engine.current.shockwave = null;
    engine.current.nextLifeScore = 10000;

    // Reset ship
    engine.current.ship = {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 12,
      thrusting: false,
      invulnerableTime: 3.0,
      shieldActive: false,
      weapon: 'normal',
      weaponTimer: 0,
      shootCooldown: 0,
      hyperspaceCooldown: 0,
    };

    spawnWave(1);
    setGameStatus('PLAYING');
    lastTimeRef.current = performance.now();
  };

  const quitGame = () => {
    setGameStatus('IDLE');
    setShowNamePrompt(false);
    setName('');
  };

  // Save leaderboard score
  const handleSaveScore = () => {
    const statsKey = `meteor_smash_${difficulty.toLowerCase()}`;
    const playerName = name.trim() || 'Ace Pilot';
    storage.addLeaderboardScore(statsKey, {
      playerName,
      score: engine.current.scoreVal,
    });
    storage.updateHighScore('meteor_smash', engine.current.scoreVal);
    setLeaderboard(storage.getLeaderboard(statsKey));
    setHighScore(storage.getGameStats(statsKey).highScore);
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    const statsKey = `meteor_smash_${difficulty.toLowerCase()}`;
    storage.addLeaderboardScore(statsKey, {
      playerName: 'Anonymous Pilot',
      score: engine.current.scoreVal,
    });
    storage.updateHighScore('meteor_smash', engine.current.scoreVal);
    setLeaderboard(storage.getLeaderboard(statsKey));
    setShowNamePrompt(false);
    setName('');
  };

  const actionsRef = useRef({ fireLaser, triggerHyperspace, resetGame, setGameStatus });
  useEffect(() => {
    actionsRef.current = { fireLaser, triggerHyperspace, resetGame, setGameStatus };
  }, [fireLaser, triggerHyperspace, resetGame]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;

      const keysToBlock = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
      if (keysToBlock.includes(e.code)) {
        e.preventDefault();
      }

      engine.current.keys[e.code] = true;

      // Single action hotkeys
      if (['Space'].includes(e.code)) {
        if (gameStatus === 'IDLE') {
          actionsRef.current.resetGame();
          return;
        } else if (gameStatus === 'PLAYING') {
          actionsRef.current.fireLaser();
        }
      }

      if (['ShiftLeft', 'ShiftRight', 'KeyS', 'ArrowDown'].includes(e.code) && gameStatus === 'PLAYING') {
        actionsRef.current.triggerHyperspace();
      }

      if (['KeyP', 'Escape'].includes(e.code)) {
        if (gameStatus === 'PLAYING') actionsRef.current.setGameStatus('PAUSED');
        else if (gameStatus === 'PAUSED') actionsRef.current.setGameStatus('PLAYING');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engine.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus, showNamePrompt]);

  // Main Canvas & Simulation Loop
  useEffect(() => {
    initStars();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const updateAndRender = (timestamp: number) => {
      if (!isSubscribed) return;

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const state = engine.current;
      const ship = state.ship;

      // ----------------------------------------------------
      // SIMULATION UPDATES (Only during PLAYING)
      // ----------------------------------------------------
      if (gameStatus === 'PLAYING') {
        // --- 1. Ship Steering & Physics ---
        const rotSpeed = 4.4; // Radians per second
        if (state.keys['ArrowLeft'] || state.keys['KeyA']) {
          ship.angle -= rotSpeed * dt;
        }
        if (state.keys['ArrowRight'] || state.keys['KeyD']) {
          ship.angle += rotSpeed * dt;
        }

        const isThrusting = Boolean(state.keys['ArrowUp'] || state.keys['KeyW']);
        ship.thrusting = isThrusting;

        if (isThrusting) {
          const thrustPower = 7.5;
          ship.vx += Math.cos(ship.angle) * thrustPower * dt;
          ship.vy += Math.sin(ship.angle) * thrustPower * dt;
          audio.playMeteorThrust();

          // Thruster exhaust particles
          const exhaustDist = ship.radius + 3;
          const exhaustAngle = ship.angle + Math.PI + (Math.random() * 0.4 - 0.2);
          state.particles.push({
            x: ship.x + Math.cos(ship.angle + Math.PI) * exhaustDist,
            y: ship.y + Math.sin(ship.angle + Math.PI) * exhaustDist,
            vx: Math.cos(exhaustAngle) * (Math.random() * 3 + 2) + ship.vx * 0.3,
            vy: Math.sin(exhaustAngle) * (Math.random() * 3 + 2) + ship.vy * 0.3,
            life: Math.random() * 0.25 + 0.15,
            maxLife: 0.4,
            color: Math.random() > 0.4 ? '#f97316' : '#38bdf8',
            size: Math.random() * 2.8 + 1,
            shape: 'circle',
          });
        }

        // Slight momentum drag
        const drag = 0.988;
        ship.vx *= Math.pow(drag, dt * 60);
        ship.vy *= Math.pow(drag, dt * 60);

        // Cap max speed
        const speed = Math.hypot(ship.vx, ship.vy);
        const maxSpeed = 6.8;
        if (speed > maxSpeed) {
          ship.vx = (ship.vx / speed) * maxSpeed;
          ship.vy = (ship.vy / speed) * maxSpeed;
        }

        ship.x += ship.vx;
        ship.y += ship.vy;
        wrapPosition(ship, ship.radius + 2);

        // Timers
        if (ship.invulnerableTime > 0) ship.invulnerableTime -= dt;
        if (ship.shootCooldown > 0) ship.shootCooldown -= dt;
        if (ship.hyperspaceCooldown > 0) ship.hyperspaceCooldown -= dt;

        if (ship.weaponTimer > 0) {
          ship.weaponTimer -= dt;
          setPowerUpDuration(Math.ceil(ship.weaponTimer));
          if (ship.weaponTimer <= 0) {
            ship.weapon = 'normal';
            setActivePowerUp(null);
          }
        }

        // Combo Multiplier decay
        if (state.comboTimer > 0) {
          state.comboTimer -= dt;
          if (state.comboTimer <= 0) {
            state.comboMultiplier = 1;
            setCombo(1);
          }
        }

        // Screen shake decay
        if (state.shakeIntensity > 0) {
          state.shakeIntensity = Math.max(0, state.shakeIntensity - dt * 25);
        }

        // Shockwave update
        if (state.shockwave) {
          state.shockwave.radius += dt * 380;
          state.shockwave.life -= dt;
          if (state.shockwave.radius >= state.shockwave.maxRadius || state.shockwave.life <= 0) {
            state.shockwave = null;
          }
        }

        // --- 2. Update Bullets ---
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          const b = state.bullets[i];
          b.x += b.vx;
          b.y += b.vy;
          b.life -= dt;
          wrapPosition(b, 4);

          if (b.life <= 0) {
            state.bullets.splice(i, 1);
            continue;
          }

          // Check bullet hit on UFO
          if (!b.isEnemy && state.ufo.active) {
            const distUfo = Math.hypot(b.x - state.ufo.x, b.y - state.ufo.y);
            if (distUfo < state.ufo.radius + 4) {
              // Destroy UFO
              triggerExplosion(state.ufo.x, state.ufo.y, '#ec4899', 30, 2);
              audio.playMeteorExplosion('large');
              state.shakeIntensity = 8;
              state.ufo.active = false;
              state.bullets.splice(i, 1);

              const ufoPts = (state.ufo.tier === 'small' ? 500 : 200) * state.comboMultiplier;
              state.scoreVal += ufoPts;
              setScore(state.scoreVal);
              state.floatingTexts.push({
                id: Math.random(),
                x: state.ufo.x,
                y: state.ufo.y,
                text: `+${ufoPts}`,
                color: '#ec4899',
                life: 1.2,
                maxLife: 1.2,
              });
              continue;
            }
          }

          // Check enemy bullet hit on player
          if (b.isEnemy) {
            if (ship.invulnerableTime <= 0) {
              const distShip = Math.hypot(b.x - ship.x, b.y - ship.y);
              if (distShip < ship.radius + 3) {
                state.bullets.splice(i, 1);
                handleShipHit();
                continue;
              }
            }
          }

          // Check bullet hit on Meteors
          if (!b.isEnemy) {
            let hitMeteor = false;
            for (let mIdx = state.meteors.length - 1; mIdx >= 0; mIdx--) {
              const m = state.meteors[mIdx];
              const dist = Math.hypot(b.x - m.x, b.y - m.y);
              if (dist < m.radius + 3) {
                hitMeteor = true;
                state.bullets.splice(i, 1);
                destroyMeteor(mIdx, b.vx * 0.2, b.vy * 0.2);
                break;
              }
            }
            if (hitMeteor) continue;
          }
        }

        // --- 3. Update Meteors ---
        for (let i = 0; i < state.meteors.length; i++) {
          const m = state.meteors[i];
          m.x += m.vx;
          m.y += m.vy;
          m.angle += m.rotSpeed;
          wrapPosition(m, m.radius + 6);

          // Check meteor collision with player
          if (ship.invulnerableTime <= 0) {
            const dist = Math.hypot(ship.x - m.x, ship.y - m.y);
            if (dist < ship.radius + m.radius - 3) {
              handleShipHit();
              break;
            }
          }

          // Check EMP shockwave hit
          if (state.shockwave) {
            const dist = Math.hypot(m.x - state.shockwave.x, m.y - state.shockwave.y);
            if (Math.abs(dist - state.shockwave.radius) < 25) {
              destroyMeteor(i, 0, 0);
            }
          }
        }

        // --- 4. UFO AI Encounter ---
        state.ufoSpawnTimer -= dt;
        if (state.ufoSpawnTimer <= 0 && !state.ufo.active) {
          state.ufo.active = true;
          state.ufo.tier = Math.random() > 0.6 ? 'small' : 'large';
          state.ufo.radius = state.ufo.tier === 'small' ? 12 : 18;
          state.ufo.x = Math.random() > 0.5 ? -20 : CANVAS_SIZE + 20;
          state.ufo.y = Math.random() * (CANVAS_SIZE * 0.6) + CANVAS_SIZE * 0.2;
          state.ufo.vx = (state.ufo.x < 0 ? 1 : -1) * (state.ufo.tier === 'small' ? 2.5 : 1.8);
          state.ufo.vy = (Math.random() - 0.5) * 1.5;
          state.ufo.shootTimer = 2.0;
          state.ufo.soundTimer = 0.5;
          state.ufo.dirTimer = 3.0;
          state.ufoSpawnTimer = 30; // Next check in 30s
        }

        if (state.ufo.active) {
          const ufo = state.ufo;
          ufo.x += ufo.vx;
          ufo.y += ufo.vy;

          // Eerie UFO beep
          ufo.soundTimer -= dt;
          if (ufo.soundTimer <= 0) {
            audio.playUfoBeep();
            ufo.soundTimer = 0.75;
          }

          // Periodic erratic directional shift
          ufo.dirTimer -= dt;
          if (ufo.dirTimer <= 0) {
            ufo.vy = (Math.random() - 0.5) * 2.2;
            ufo.dirTimer = Math.random() * 2.5 + 1.5;
          }

          // UFO shooting towards player
          ufo.shootTimer -= dt;
          if (ufo.shootTimer <= 0) {
            ufo.shootTimer = ufo.tier === 'small' ? 1.6 : 2.8;
            let aimAngle = Math.atan2(ship.y - ufo.y, ship.x - ufo.x);
            if (ufo.tier === 'large') {
              aimAngle += (Math.random() - 0.5) * 0.9; // Inaccurate
            } else {
              aimAngle += (Math.random() - 0.5) * 0.25; // Accurate
            }

            state.bullets.push({
              id: state.nextBulletId++,
              x: ufo.x,
              y: ufo.y,
              vx: Math.cos(aimAngle) * 4.5,
              vy: Math.sin(aimAngle) * 4.5,
              life: 1.8,
              maxLife: 1.8,
              color: '#ec4899',
              isEnemy: true,
            });
            audio.playLaser();
          }

          // Despawn UFO if out of bounds on horizontal exit
          if ((ufo.vx > 0 && ufo.x > CANVAS_SIZE + 40) || (ufo.vx < 0 && ufo.x < -40)) {
            ufo.active = false;
          }
        }

        // --- 5. Update PowerUps ---
        for (let i = state.powerups.length - 1; i >= 0; i--) {
          const p = state.powerups[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= dt;
          wrapPosition(p, p.radius);

          if (p.life <= 0) {
            state.powerups.splice(i, 1);
            continue;
          }

          // Player collection
          const dist = Math.hypot(ship.x - p.x, ship.y - p.y);
          if (dist < ship.radius + p.radius) {
            audio.playPowerupCollect();
            triggerExplosion(p.x, p.y, '#38bdf8', 20, 1.4);

            if (p.type === 'triple') {
              ship.weapon = 'triple';
              ship.weaponTimer = 12.0;
              setActivePowerUp('TRIPLE CANNONS');
              setPowerUpDuration(12);
            } else if (p.type === 'shield') {
              ship.shieldActive = true;
              setActivePowerUp('PLASMA SHIELD');
            } else if (p.type === 'emp') {
              state.shockwave = {
                x: p.x,
                y: p.y,
                radius: 10,
                maxRadius: 360,
                life: 1.2,
              };
              state.shakeIntensity = 14;
              audio.playMeteorExplosion('large');
              setActivePowerUp('EMP SHOCKWAVE');
              setTimeout(() => setActivePowerUp(null), 1500);
            }

            state.floatingTexts.push({
              id: Math.random(),
              x: p.x,
              y: p.y - 15,
              text: p.type.toUpperCase(),
              color: '#38bdf8',
              life: 1.2,
              maxLife: 1.2,
            });

            state.powerups.splice(i, 1);
          }
        }

        // --- 6. Next Wave Trigger ---
        if (state.meteors.length === 0) {
          state.waveNumber += 1;
          setWave(state.waveNumber);
          audio.playLevelUp();
          spawnWave(state.waveNumber);
        }

        // --- 7. Extra Life Milestone ---
        if (state.scoreVal >= state.nextLifeScore) {
          state.livesVal += 1;
          setLives(state.livesVal);
          state.nextLifeScore += 10000;
          audio.playPoint();
          state.floatingTexts.push({
            id: Math.random(),
            x: ship.x,
            y: ship.y - 30,
            text: 'EXTRA LIFE!',
            color: '#4ade80',
            life: 1.8,
            maxLife: 1.8,
          });
        }
      }

      // --- 8. Update Particles & Floating Text ---
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.98;
        pt.vy *= 0.98;
        pt.life -= dt;
        if (pt.life <= 0) {
          state.particles.splice(i, 1);
        }
      }

      for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y -= dt * 28;
        ft.life -= dt;
        if (ft.life <= 0) {
          state.floatingTexts.splice(i, 1);
        }
      }

      // ----------------------------------------------------
      // DRAWING & RENDERING (Full Neon Vector Aesthetic)
      // ----------------------------------------------------
      ctx.save();

      // Screen Shake offset
      if (state.shakeIntensity > 0) {
        const ox = (Math.random() - 0.5) * state.shakeIntensity;
        const oy = (Math.random() - 0.5) * state.shakeIntensity;
        ctx.translate(ox, oy);
      }

      // Deep space backdrop with subtle radial nebula
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const nebulaGrad = ctx.createRadialGradient(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        50,
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        CANVAS_SIZE * 0.75
      );
      nebulaGrad.addColorStop(0, 'rgba(30, 27, 75, 0.28)'); // deep indigo
      nebulaGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.2)');
      nebulaGrad.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Starfield with subtle twinkling
      state.stars.forEach((star) => {
        star.twinklePhase += star.twinkleSpeed * dt;
        const alpha = star.brightness * (0.65 + 0.35 * Math.sin(star.twinklePhase));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw EMP Shockwave
      if (state.shockwave) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#38bdf8';
        ctx.strokeStyle = `rgba(56, 189, 248, ${(state.shockwave.life / 1.2).toFixed(2)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(state.shockwave.x, state.shockwave.y, state.shockwave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Meteors
      state.meteors.forEach((m) => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle);

        ctx.shadowBlur = 8;
        ctx.shadowColor = m.color;
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1.8;
        ctx.fillStyle = 'rgba(24, 24, 27, 0.7)'; // subtle dark fill

        ctx.beginPath();
        m.vertices.forEach((v, idx) => {
          const vx = Math.cos(v.angle) * v.radius;
          const vy = Math.sin(v.angle) * v.radius;
          if (idx === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Internal craggy fracture lines for authentic retro detail
        if (m.tier === 'large' || m.tier === 'medium') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(m.vertices[0].radius * 0.4, 0);
          ctx.lineTo(-m.vertices[2].radius * 0.3, m.vertices[2].radius * 0.4);
          ctx.lineTo(m.vertices[4].radius * 0.3, -m.vertices[4].radius * 0.2);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Draw Power-Ups
      state.powerups.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#38bdf8';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;

        const pulse = 1 + Math.sin(timestamp * 0.008) * 0.15;
        ctx.scale(pulse, pulse);

        // Gem / Diamond boundary
        ctx.beginPath();
        ctx.moveTo(0, -p.radius);
        ctx.lineTo(p.radius, 0);
        ctx.lineTo(0, p.radius);
        ctx.lineTo(-p.radius, 0);
        ctx.closePath();
        ctx.stroke();

        // Symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = p.type === 'triple' ? '3X' : p.type === 'shield' ? 'SH' : 'EMP';
        ctx.fillText(label, 0, 0);

        ctx.restore();
      });

      // Draw UFO Saucer
      if (state.ufo.active) {
        const ufo = state.ufo;
        ctx.save();
        ctx.translate(ufo.x, ufo.y);
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ec4899';
        ctx.strokeStyle = '#ec4899';
        ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
        ctx.lineWidth = 1.8;

        // Saucer dome
        ctx.beginPath();
        ctx.arc(0, -3, ufo.radius * 0.5, Math.PI, 0);
        ctx.stroke();

        // Saucer rim ellipse
        ctx.beginPath();
        ctx.ellipse(0, 0, ufo.radius, ufo.radius * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Underbody lights
        ctx.fillStyle = '#fbbf24';
        [-0.5, 0, 0.5].forEach((pos) => {
          ctx.beginPath();
          ctx.arc(pos * ufo.radius, 1, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }

      // Draw Lasers / Bullets
      state.bullets.forEach((b) => {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = b.color;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 1.6, b.y - b.vy * 1.6);
        ctx.stroke();
        ctx.restore();
      });

      // Draw Particles
      state.particles.forEach((pt) => {
        ctx.save();
        const alpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = pt.color;

        ctx.beginPath();
        if (pt.shape === 'spark') {
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        } else {
          ctx.rect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        }
        ctx.fill();
        ctx.restore();
      });

      // Draw Player Ship
      if (gameStatus === 'PLAYING' || gameStatus === 'PAUSED') {
        const isBlinking = ship.invulnerableTime > 0 && Math.floor(timestamp * 0.015) % 2 === 0;

        if (!isBlinking) {
          ctx.save();
          ctx.translate(ship.x, ship.y);
          ctx.rotate(ship.angle);

          // Ship glow
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#38bdf8';
          ctx.strokeStyle = '#38bdf8';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.lineWidth = 1.8;

          // Sleek retro fighter triangle
          ctx.beginPath();
          ctx.moveTo(ship.radius + 6, 0); // Nose
          ctx.lineTo(-ship.radius, -ship.radius * 0.75); // Left fin
          ctx.lineTo(-ship.radius * 0.5, 0); // Engine indent
          ctx.lineTo(-ship.radius, ship.radius * 0.75); // Right fin
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cockpit center line
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(ship.radius * 0.2, 0);
          ctx.lineTo(-ship.radius * 0.3, 0);
          ctx.stroke();

          // Animated thruster flame when thrusting
          if (ship.thrusting) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#f97316';
            ctx.strokeStyle = '#f97316';
            ctx.fillStyle = '#fbbf24';
            ctx.lineWidth = 1.6;

            const flameLen = ship.radius * (1.2 + Math.random() * 0.6);
            ctx.beginPath();
            ctx.moveTo(-ship.radius * 0.5, -ship.radius * 0.35);
            ctx.lineTo(-ship.radius * 0.5 - flameLen, 0);
            ctx.lineTo(-ship.radius * 0.5, ship.radius * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          // Plasma Shield Barrier
          if (ship.shieldActive || ship.invulnerableTime > 0) {
            ctx.shadowBlur = 16;
            ctx.shadowColor = ship.shieldActive ? '#38bdf8' : '#a855f7';
            ctx.strokeStyle = ship.shieldActive ? 'rgba(56, 189, 248, 0.75)' : 'rgba(168, 85, 247, 0.65)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, ship.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.restore();
        }
      }

      // Draw Floating Scores & Text
      state.floatingTexts.forEach((ft) => {
        ctx.save();
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ft.color;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore(); // Restore shake

      animationFrameId.current = requestAnimationFrame(updateAndRender);
    };

    // Helper: Destroy meteor & split or vaporize
    const destroyMeteor = (index: number, hitVx: number, hitVy: number) => {
      const state = engine.current;
      const m = state.meteors[index];
      if (!m) return;

      // SFX & Shake
      audio.playMeteorExplosion(m.tier);
      triggerExplosion(m.x, m.y, m.color, m.tier === 'large' ? 24 : m.tier === 'medium' ? 16 : 10);
      state.shakeIntensity = m.tier === 'large' ? 7 : m.tier === 'medium' ? 4 : 2;

      // Score with combo multiplier
      const earned = m.points * state.comboMultiplier;
      state.scoreVal += earned;
      setScore(state.scoreVal);

      // Increment combo
      state.comboMultiplier = Math.min(state.comboMultiplier + 1, 5);
      state.comboTimer = 1.8;
      setCombo(state.comboMultiplier);

      // Floating score notification
      state.floatingTexts.push({
        id: Math.random(),
        x: m.x,
        y: m.y,
        text: state.comboMultiplier > 1 ? `+${earned} (x${state.comboMultiplier})` : `+${earned}`,
        color: m.color,
        life: 0.9,
        maxLife: 0.9,
      });

      // Split into smaller meteors
      if (m.tier === 'large') {
        state.meteors.push(createMeteor(m.x, m.y, 'medium', m.vx + hitVx + 1, m.vy + hitVy - 1));
        state.meteors.push(createMeteor(m.x, m.y, 'medium', m.vx + hitVx - 1, m.vy + hitVy + 1));
      } else if (m.tier === 'medium') {
        state.meteors.push(createMeteor(m.x, m.y, 'small', m.vx + hitVx + 1.6, m.vy + hitVy - 1.2));
        state.meteors.push(createMeteor(m.x, m.y, 'small', m.vx + hitVx - 1.6, m.vy + hitVy + 1.2));
      }

      // Rare Power-Up Drop (10% chance)
      if (Math.random() < 0.12 && state.powerups.length < 2) {
        const types: PowerUp['type'][] = ['triple', 'shield', 'emp'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        state.powerups.push({
          id: Math.random(),
          x: m.x,
          y: m.y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          type: chosen,
          life: 14.0,
          radius: 12,
        });
      }

      // Remove destroyed parent meteor
      state.meteors.splice(index, 1);
    };

    // Helper: Handle Ship Collision / Destruction
    const handleShipHit = () => {
      const state = engine.current;
      const ship = state.ship;

      // Shield absorb
      if (ship.shieldActive) {
        ship.shieldActive = false;
        ship.invulnerableTime = 1.5;
        audio.playPlayerHit();
        state.shakeIntensity = 10;
        triggerExplosion(ship.x, ship.y, '#38bdf8', 18, 1.5);
        setActivePowerUp(null);
        state.floatingTexts.push({
          id: Math.random(),
          x: ship.x,
          y: ship.y - 20,
          text: 'SHIELD ABSORBED HIT',
          color: '#38bdf8',
          life: 1.2,
          maxLife: 1.2,
        });
        return;
      }

      // Normal hit / loss of life
      audio.playExplosion();
      audio.playPlayerHit();
      state.shakeIntensity = 15;
      triggerExplosion(ship.x, ship.y, '#ef4444', 35, 2.2);

      state.livesVal -= 1;
      setLives(state.livesVal);

      if (state.livesVal <= 0) {
        audio.playGameOver();
        setGameStatus('GAME_OVER');
        const statsKey = `meteor_smash_${difficulty.toLowerCase()}`;
        const currentHigh = storage.getGameStats(statsKey).highScore;
        if (state.scoreVal > currentHigh) {
          setShowNamePrompt(true);
        }
      } else {
        // Respawn in center with invulnerability
        ship.x = CANVAS_SIZE / 2;
        ship.y = CANVAS_SIZE / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.angle = -Math.PI / 2;
        ship.invulnerableTime = 3.2;
        ship.weapon = 'normal';
        setActivePowerUp(null);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateAndRender);

    return () => {
      isSubscribed = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameStatus, difficulty, spawnWave, initStars, createMeteor]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* ----------------- LEFT COLUMN: GAME CANVAS & CONTROLS ----------------- */}
      <div className="flex-1 flex flex-col items-center">
        {/* HUD Top Bar */}
        <div className="flex justify-between items-center w-full max-w-[500px] mb-3 bg-[#1a1a1c] border border-slate-800 p-3 sm:p-4 rounded-[4px] shadow-sm">
          {/* Lives */}
          <div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1">
              FIGHTERS
            </div>
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: Math.max(lives, 0) }).map((_, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 flex items-center justify-center text-xs text-cyan-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
                >
                  ▲
                </div>
              ))}
              {lives === 0 && <span className="text-[10px] text-red-500 font-bold">NONE</span>}
            </div>
          </div>

          {/* Score & Combo */}
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-slate-500 font-semibold mb-0.5">
              SCORE {combo > 1 && <span className="text-amber-400 font-bold">x{combo}</span>}
            </div>
            <div className="text-lg sm:text-2xl font-black text-white font-mono tracking-wider">
              {score.toLocaleString()}
            </div>
          </div>

          {/* High Score & Sound */}
          <div className="text-right flex flex-col items-end">
            <div className="text-[10px] sm:text-xs text-slate-500 font-semibold mb-0.5 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-500" /> BEST
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-300 font-mono">
              {highScore.toLocaleString()}
            </div>
            <button
              onClick={toggleSound}
              className="mt-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Active Powerup Banner (if any) */}
        {activePowerUp && (
          <div className="w-full max-w-[500px] mb-2 px-3 py-1 bg-cyan-950/40 border border-cyan-500/40 rounded-[4px] flex items-center justify-between text-xs text-cyan-300 animate-pulse">
            <span className="font-bold tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> {activePowerUp}
            </span>
            {powerUpDuration > 0 && (
              <span className="font-mono text-cyan-200 font-bold">{powerUpDuration}s</span>
            )}
          </div>
        )}

        {/* Canvas Frame */}
        <div className="w-full max-w-[500px] flex flex-col items-center">
          <div className="relative border border-slate-800 rounded-[4px] overflow-hidden bg-[#09090b] w-full shadow-2xl">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block w-full aspect-square touch-none select-none"
            />

            {/* Overlays */}
            {/* 1. IDLE OVERLAY */}
            {gameStatus === 'IDLE' && (
              <div className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                  <span className="text-3xl animate-pulse">☄️</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mb-2 uppercase tracking-wider text-silver-gradient">
                  Meteor Smash
                </h2>
                <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
                  Rotate and thrust through hostile meteor fields. Break giant asteroids, collect power-ups, and evade enemy saucers!
                </p>

                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                  <button
                    onClick={resetGame}
                    className="flex items-center justify-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-all uppercase tracking-wider text-xs cursor-pointer shadow-lg active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" /> Launch Fighter
                  </button>
                </div>
              </div>
            )}

            {/* 2. PAUSED OVERLAY */}
            {gameStatus === 'PAUSED' && (
              <div className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-4 z-20">
                <h3 className="text-xl font-bold text-white uppercase tracking-widest">Flight Paused</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGameStatus('PLAYING')}
                    className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </button>
                  <button
                    onClick={quitGame}
                    className="flex items-center gap-2 bg-[#1a1a1c] text-slate-400 font-bold px-5 py-2.5 rounded-[4px] border border-slate-800 hover:border-slate-500 hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Abort
                  </button>
                </div>
              </div>
            )}

            {/* 3. GAME OVER OVERLAY */}
            {gameStatus === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-[#09090b]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
                <h3 className="text-2xl font-black text-red-500 mb-1 uppercase tracking-widest">
                  Ship Destroyed
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-medium">
                  Sector cleared: <span className="text-white font-mono">Wave {wave}</span> | Final Score: <span className="text-white font-mono">{score}</span>
                </p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                      ★ High Score Log Entry ★
                    </div>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="Pilot Call-sign"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1a1a1c] border border-slate-800 rounded-[4px] px-3 py-2 text-[#e8e8ea] placeholder-slate-600 text-center text-sm font-semibold focus:outline-none focus:border-white transition-colors"
                      autoFocus
                    />
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleSaveScore}
                        className="flex-1 bg-white text-black font-bold py-2 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Record
                      </button>
                      <button
                        onClick={handleSkipSaveScore}
                        className="flex-1 bg-[#1a1a1c] text-slate-400 font-bold py-2 rounded-[4px] border border-slate-800 hover:border-slate-500 hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={resetGame}
                    className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer shadow-lg active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Re-Deploy
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ----------------- TACTILE MOBILE / TOUCH CONTROLS ----------------- */}
          <div className="mt-4 flex flex-col gap-3 w-full max-w-[500px]">
            <div className="flex justify-between items-center w-full gap-2">
              {/* Left group: Steering & Thrust */}
              <div className="flex gap-2">
                <button
                  onPointerDown={(e) => { e.preventDefault(); engine.current.keys['ArrowLeft'] = true; }}
                  onPointerUp={(e) => { e.preventDefault(); engine.current.keys['ArrowLeft'] = false; }}
                  onPointerLeave={(e) => { e.preventDefault(); engine.current.keys['ArrowLeft'] = false; }}
                  className="w-14 h-12 sm:w-16 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-cyan-500 active:text-black rounded-[4px] flex items-center justify-center text-slate-300 font-bold select-none cursor-pointer shadow-sm active:scale-95 transition-all text-sm"
                  title="Rotate Left (A / Left Arrow)"
                >
                  ↺
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); engine.current.keys['ArrowRight'] = true; }}
                  onPointerUp={(e) => { e.preventDefault(); engine.current.keys['ArrowRight'] = false; }}
                  onPointerLeave={(e) => { e.preventDefault(); engine.current.keys['ArrowRight'] = false; }}
                  className="w-14 h-12 sm:w-16 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-cyan-500 active:text-black rounded-[4px] flex items-center justify-center text-slate-300 font-bold select-none cursor-pointer shadow-sm active:scale-95 transition-all text-sm"
                  title="Rotate Right (D / Right Arrow)"
                >
                  ↻
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); engine.current.keys['ArrowUp'] = true; }}
                  onPointerUp={(e) => { e.preventDefault(); engine.current.keys['ArrowUp'] = false; }}
                  onPointerLeave={(e) => { e.preventDefault(); engine.current.keys['ArrowUp'] = false; }}
                  className="w-14 h-12 sm:w-16 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-orange-500 active:text-black rounded-[4px] flex items-center justify-center text-orange-400 font-bold select-none cursor-pointer shadow-sm active:scale-95 transition-all text-base"
                  title="Thrust (W / Up Arrow)"
                >
                  ▲
                </button>
              </div>

              {/* Center: Pause Toggle */}
              <button
                onClick={() => {
                  if (gameStatus === 'PLAYING') setGameStatus('PAUSED');
                  else if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
                }}
                disabled={gameStatus === 'IDLE' || gameStatus === 'GAME_OVER'}
                className="w-11 h-11 sm:w-12 sm:h-12 bg-[#1a1a1c] border border-slate-800 disabled:opacity-30 rounded-[4px] flex items-center justify-center text-slate-400 hover:text-white select-none cursor-pointer shadow-sm"
                title="Pause (P / Esc)"
              >
                {gameStatus === 'PLAYING' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              {/* Right group: Hyperspace & Fire */}
              <div className="flex gap-2">
                <button
                  onClick={triggerHyperspace}
                  disabled={gameStatus !== 'PLAYING'}
                  className="w-14 h-12 sm:w-16 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-purple-600 active:text-white disabled:opacity-30 rounded-[4px] flex items-center justify-center text-purple-400 font-bold select-none cursor-pointer shadow-sm active:scale-95 transition-all text-xs"
                  title="Hyperspace Jump (Shift / S)"
                >
                  🌀
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); fireLaser(); }}
                  disabled={gameStatus !== 'PLAYING'}
                  className="w-16 h-12 sm:w-20 sm:h-14 bg-red-950/40 border border-red-500/50 active:bg-red-500 active:text-white disabled:opacity-30 rounded-[4px] flex items-center justify-center text-red-400 font-black select-none cursor-pointer shadow-sm active:scale-95 transition-all text-xs tracking-wider"
                  title="Fire Lasers (Spacebar)"
                >
                  FIRE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- RIGHT COLUMN: SETTINGS & LEADERBOARD ----------------- */}
      <div className="w-full lg:w-80 flex flex-col gap-5">
        {/* Difficulty Selection */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-4 sm:p-5 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Sector Difficulty
          </h3>
          <div className="flex gap-1.5">
            {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDifficultyChange(d)}
                disabled={gameStatus === 'PLAYING' || gameStatus === 'PAUSED'}
                className={`flex-1 py-1.5 rounded-[4px] border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  difficulty === d
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard Quick Guide */}
        <div className="hidden lg:block bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Flight Avionics
          </h3>
          <ul className="text-xs space-y-2.5 text-slate-400">
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Steer Left / Right</span>
              <div className="flex gap-1">
                <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">A</kbd>
                <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">D</kbd>
              </div>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Main Thruster</span>
              <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">W / ▲</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Fire Lasers</span>
              <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">Space</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Hyperspace Jump</span>
              <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">Shift / S</kbd>
            </li>
            <li className="flex justify-between items-center">
              <span>Pause Mission</span>
              <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">P / Esc</kbd>
            </li>
          </ul>
        </div>

        {/* Scoring & Features Breakdown */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Tactical Intel
          </h3>
          <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex justify-between">
              <span>☄️ Large Meteor</span>
              <span className="font-mono font-bold text-white">20 pts</span>
            </div>
            <div className="flex justify-between">
              <span>☄️ Medium Meteor</span>
              <span className="font-mono font-bold text-white">50 pts</span>
            </div>
            <div className="flex justify-between">
              <span>☄️ Small Meteor</span>
              <span className="font-mono font-bold text-white">100 pts</span>
            </div>
            <div className="flex justify-between">
              <span>🛸 Alien Saucer</span>
              <span className="font-mono font-bold text-pink-400">200-500 pts</span>
            </div>
            <div className="border-t border-slate-800 pt-2 text-slate-500 text-[10px]">
              Tip: Chain rapid hits to build your <span className="text-amber-400 font-bold">5x Combo Multiplier</span>.
            </div>
          </div>
        </div>

        {/* Leaderboard Log */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-5 flex-1 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" /> Sector High Scores
          </h3>
          <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No pilot logs recorded.</p>
            ) : (
              leaderboard.slice(0, 5).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-2.5 bg-black/20 border border-slate-800/80 rounded-[4px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold truncate max-w-[120px]">
                      {entry.playerName}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-white">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeteorSmash;
