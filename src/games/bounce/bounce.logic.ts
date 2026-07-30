export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  isBouncy?: boolean; // Trampoline pad!
}

export interface Slope {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Checkpoint {
  x: number;
  y: number;
  active: boolean;
}

export interface Spike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Ring {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface ExitPortal {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Level {
  width: number; // Total scrollable width
  startPos: { x: number; y: number };
  blocks: Block[];
  slopes: Slope[];
  checkpoints: Checkpoint[];
  spikes: Spike[];
  rings: Ring[];
  exitPortal: ExitPortal;
}

export const LEVELS: Level[] = [
  // Level 1: Sunny Hills (Scrolling & Bouncing Warmup)
  {
    width: 2000,
    startPos: { x: 80, y: 300 },
    blocks: [
      { x: 0, y: 350, width: 700, height: 50 }, // Spawn ground
      { x: 600, y: 320, width: 350, height: 80 }, // Elevated hill
      { x: 1050, y: 350, width: 950, height: 50 }, // Final stretch ground
      // Floating structures
      { x: 250, y: 270, width: 120, height: 20 },
      { x: 450, y: 220, width: 100, height: 20 },
      { x: 800, y: 240, width: 100, height: 20 },
      { x: 1200, y: 280, width: 120, height: 20 },
      { x: 1400, y: 220, width: 120, height: 20 },
      // Bouncy Trampolines
      { x: 1600, y: 335, width: 60, height: 15, isBouncy: true },
      { x: 1800, y: 250, width: 80, height: 20 },
    ],
    slopes: [],
    checkpoints: [
      { x: 650, y: 320, active: false }, // sits on elevated hill y:320
      { x: 1150, y: 350, active: false }, // sits on ground y:350
      { x: 1550, y: 350, active: false }, // sits on ground y:350
    ],
    spikes: [
      { x: 450, y: 335, width: 60, height: 15 },
      { x: 950, y: 335, width: 60, height: 15 },
      { x: 1350, y: 335, width: 45, height: 15 },
    ],
    rings: [
      { x: 310, y: 220, radius: 10, collected: false },
      { x: 500, y: 160, radius: 10, collected: false },
      { x: 850, y: 180, radius: 10, collected: false },
      { x: 1260, y: 230, radius: 10, collected: false },
      { x: 1460, y: 160, radius: 10, collected: false },
      { x: 1630, y: 180, radius: 10, collected: false },
      { x: 1840, y: 190, radius: 10, collected: false },
    ],
    exitPortal: { x: 1920, y: 290, width: 35, height: 60 },
  },
  // Level 2: The Bouncy Cavern
  {
    width: 2500,
    startPos: { x: 80, y: 300 },
    blocks: [
      { x: 0, y: 350, width: 400, height: 50 }, // Ground 1
      { x: 500, y: 350, width: 500, height: 50 }, // Ground 2
      { x: 1100, y: 350, width: 500, height: 50 }, // Ground 3
      { x: 1700, y: 350, width: 800, height: 50 }, // Ground 4
      
      // Floating structures
      { x: 200, y: 270, width: 100, height: 20 },
      { x: 400, y: 210, width: 60, height: 15, isBouncy: true }, // Trampoline over pit 1
      { x: 600, y: 230, width: 120, height: 20 },
      { x: 800, y: 170, width: 120, height: 20 },
      { x: 1020, y: 220, width: 60, height: 15, isBouncy: true }, // Trampoline over pit 2
      { x: 1200, y: 250, width: 80, height: 20 },
      { x: 1350, y: 180, width: 60, height: 15, isBouncy: true }, // Trampoline over pit 3
      { x: 1500, y: 240, width: 180, height: 20 },
      { x: 1800, y: 260, width: 120, height: 20 },
      { x: 1950, y: 180, width: 60, height: 15, isBouncy: true }, // High jump pad
      { x: 2100, y: 240, width: 200, height: 20 },
    ],
    slopes: [],
    checkpoints: [
      { x: 350, y: 350, active: false }, // sits on Ground 1
      { x: 800, y: 350, active: false }, // moved from 950 (spike pit) to Ground 2
      { x: 1750, y: 350, active: false }, // moved from 1650 (spike pit) to Ground 4
      { x: 2150, y: 350, active: false }, // sits on Ground 4
    ],
    spikes: [
      { x: 400, y: 350, width: 100, height: 50 }, // Spike pit 1
      { x: 1000, y: 350, width: 100, height: 50 }, // Spike pit 2
      { x: 1600, y: 350, width: 100, height: 50 }, // Spike pit 3
      { x: 650, y: 215, width: 30, height: 15 },
      { x: 1220, y: 235, width: 30, height: 15 },
    ],
    rings: [
      { x: 250, y: 200, radius: 10, collected: false },
      { x: 430, y: 120, radius: 10, collected: false },
      { x: 660, y: 170, radius: 10, collected: false },
      { x: 860, y: 110, radius: 10, collected: false },
      { x: 1050, y: 120, radius: 10, collected: false },
      { x: 1380, y: 90, radius: 10, collected: false },
      { x: 1580, y: 180, radius: 10, collected: false },
      { x: 1980, y: 90, radius: 10, collected: false },
      { x: 2200, y: 180, radius: 10, collected: false },
    ],
    exitPortal: { x: 2380, y: 290, width: 35, height: 60 },
  },
  // Level 3: Bouncing Ascent
  {
    width: 2400,
    startPos: { x: 80, y: 300 },
    blocks: [
      { x: 0, y: 350, width: 400, height: 50 }, // Spawn base
      { x: 400, y: 290, width: 200, height: 110 },
      { x: 600, y: 350, width: 1800, height: 50 }, // Ground 2
      
      // Ascent structures
      { x: 750, y: 270, width: 100, height: 20 },
      { x: 900, y: 190, width: 100, height: 20 },
      { x: 1080, y: 140, width: 60, height: 15, isBouncy: true }, // Trampoline to high ledge
      { x: 1200, y: 180, width: 120, height: 20 },
      { x: 1380, y: 260, width: 120, height: 20 },
      { x: 1550, y: 200, width: 120, height: 20 },
      { x: 1720, y: 140, width: 60, height: 15, isBouncy: true }, // High launcher
      { x: 1880, y: 220, width: 150, height: 20 },
      { x: 2100, y: 270, width: 150, height: 20 },
    ],
    slopes: [],
    checkpoints: [
      { x: 350, y: 350, active: false }, // Spawn base y:350
      { x: 650, y: 350, active: false }, // Ground 2 y:350
      { x: 1350, y: 350, active: false }, // Ground 2 y:350
      { x: 1750, y: 350, active: false }, // Sits safely on Ground 2 y:350
    ],
    spikes: [
      { x: 900, y: 335, width: 80, height: 15 },
      { x: 1450, y: 335, width: 80, height: 15 },
      { x: 2000, y: 335, width: 60, height: 15 },
    ],
    rings: [
      { x: 800, y: 210, radius: 10, collected: false },
      { x: 950, y: 130, radius: 10, collected: false },
      { x: 1110, y: 60, radius: 10, collected: false },
      { x: 1260, y: 110, radius: 10, collected: false },
      { x: 1440, y: 190, radius: 10, collected: false },
      { x: 1610, y: 130, radius: 10, collected: false },
      { x: 1750, y: 60, radius: 10, collected: false },
      { x: 1950, y: 150, radius: 10, collected: false },
      { x: 2180, y: 200, radius: 10, collected: false },
    ],
    exitPortal: { x: 2280, y: 290, width: 35, height: 60 },
  },
  // Level 4: The Spike Gauntlet
  {
    width: 2600,
    startPos: { x: 80, y: 300 },
    blocks: [
      { x: 0, y: 350, width: 500, height: 50 },
      { x: 650, y: 350, width: 600, height: 50 },
      { x: 1400, y: 350, width: 500, height: 50 },
      { x: 2050, y: 350, width: 550, height: 50 },
      
      // Floating challenges
      { x: 220, y: 250, width: 80, height: 20 },
      { x: 380, y: 180, width: 80, height: 20 },
      { x: 500, y: 180, width: 60, height: 15, isBouncy: true },
      { x: 700, y: 220, width: 100, height: 20 },
      { x: 880, y: 150, width: 100, height: 20 },
      { x: 1050, y: 220, width: 80, height: 20 },
      { x: 1250, y: 180, width: 60, height: 15, isBouncy: true },
      { x: 1480, y: 250, width: 120, height: 20 },
      { x: 1620, y: 190, width: 120, height: 20 },
      { x: 1850, y: 130, width: 60, height: 15, isBouncy: true },
      { x: 2150, y: 220, width: 150, height: 20 },
    ],
    slopes: [],
    checkpoints: [
      { x: 450, y: 350, active: false }, // Ground 1
      { x: 1150, y: 350, active: false }, // Ground 2
      { x: 2150, y: 350, active: false }, // moved from 1950 (spike pit) to Ground 4 y:350
    ],
    spikes: [
      { x: 500, y: 350, width: 150, height: 50 },
      { x: 1200, y: 350, width: 100, height: 50 },
      { x: 1800, y: 350, width: 100, height: 50 },
      { x: 780, y: 335, width: 60, height: 15 },
      { x: 1550, y: 335, width: 60, height: 15 },
      { x: 2200, y: 335, width: 60, height: 15 },
    ],
    rings: [
      { x: 260, y: 190, radius: 10, collected: false },
      { x: 420, y: 120, radius: 10, collected: false },
      { x: 750, y: 160, radius: 10, collected: false },
      { x: 930, y: 90, radius: 10, collected: false },
      { x: 1530, y: 190, radius: 10, collected: false },
      { x: 1740, y: 120, radius: 10, collected: false },
      { x: 1880, y: 50, radius: 10, collected: false },
      { x: 2220, y: 160, radius: 10, collected: false },
    ],
    exitPortal: { x: 2480, y: 290, width: 35, height: 60 },
  },
  // Level 5: Trampoline High
  {
    width: 2800,
    startPos: { x: 80, y: 300 },
    blocks: [
      { x: 0, y: 350, width: 600, height: 50 },
      { x: 750, y: 350, width: 600, height: 50 },
      { x: 1500, y: 350, width: 600, height: 50 },
      { x: 2200, y: 350, width: 600, height: 50 },
      // Floating launch structures
      { x: 300, y: 250, width: 100, height: 20 },
      { x: 480, y: 180, width: 60, height: 15, isBouncy: true },
      { x: 620, y: 120, width: 100, height: 20 },
      { x: 850, y: 220, width: 120, height: 20 },
      { x: 1050, y: 180, width: 60, height: 15, isBouncy: true },
      { x: 1200, y: 120, width: 120, height: 20 },
      { x: 1380, y: 230, width: 100, height: 20 },
      { x: 1600, y: 180, width: 60, height: 15, isBouncy: true },
      { x: 1800, y: 220, width: 120, height: 20 },
      { x: 2000, y: 160, width: 60, height: 15, isBouncy: true },
      { x: 2300, y: 240, width: 150, height: 20 },
    ],
    slopes: [],
    checkpoints: [
      { x: 550, y: 350, active: false }, // Ground 1
      { x: 1300, y: 350, active: false }, // Ground 2
      { x: 2000, y: 350, active: false }, // Sits safely on Ground 3
    ],
    spikes: [
      { x: 600, y: 350, width: 150, height: 50 },
      { x: 1350, y: 350, width: 150, height: 50 },
      { x: 2100, y: 350, width: 100, height: 50 },
    ],
    rings: [
      { x: 350, y: 190, radius: 10, collected: false },
      { x: 510, y: 100, radius: 10, collected: false },
      { x: 670, y: 60, radius: 10, collected: false },
      { x: 910, y: 160, radius: 10, collected: false },
      { x: 1080, y: 100, radius: 10, collected: false },
      { x: 1260, y: 60, radius: 10, collected: false },
      { x: 1630, y: 100, radius: 10, collected: false },
      { x: 2030, y: 80, radius: 10, collected: false },
      { x: 2380, y: 180, radius: 10, collected: false },
    ],
    exitPortal: { x: 2650, y: 290, width: 35, height: 60 },
  },
  // Level 6: Bounce Tales Finale
  {
    width: 3200,
    startPos: { x: 80, y: 300 },
    blocks: [
      { x: 0, y: 350, width: 500, height: 50 },
      { x: 600, y: 320, width: 400, height: 80 },
      { x: 1100, y: 350, width: 500, height: 50 },
      { x: 1700, y: 290, width: 400, height: 110 },
      { x: 2200, y: 350, width: 1000, height: 50 },
      // High floating platforms
      { x: 200, y: 250, width: 80, height: 20 },
      { x: 350, y: 180, width: 80, height: 20 },
      { x: 500, y: 120, width: 60, height: 15, isBouncy: true },
      { x: 750, y: 220, width: 100, height: 20 },
      { x: 920, y: 150, width: 80, height: 20 },
      { x: 1200, y: 270, width: 100, height: 20 },
      { x: 1350, y: 200, width: 60, height: 15, isBouncy: true },
      { x: 1500, y: 140, width: 100, height: 20 },
      { x: 1800, y: 180, width: 120, height: 20 },
      { x: 2000, y: 120, width: 60, height: 15, isBouncy: true },
      { x: 2350, y: 250, width: 120, height: 20 },
      { x: 2550, y: 180, width: 120, height: 20 },
      { x: 2750, y: 120, width: 60, height: 15, isBouncy: true },
    ],
    slopes: [],
    checkpoints: [
      { x: 450, y: 350, active: false }, // sits on Ground 1
      { x: 1150, y: 350, active: false }, // sits on Ground 3
      { x: 1750, y: 290, active: false }, // sits on block y:290
      { x: 2250, y: 350, active: false }, // sits on Ground 5
      { x: 2850, y: 350, active: false }, // sits on Ground 5
    ],
    spikes: [
      { x: 500, y: 350, width: 100, height: 50 },
      { x: 1000, y: 350, width: 100, height: 50 },
      { x: 1600, y: 350, width: 100, height: 50 },
      { x: 2100, y: 350, width: 100, height: 50 },
      { x: 800, y: 305, width: 60, height: 15 },
      { x: 2400, y: 335, width: 80, height: 15 },
    ],
    rings: [
      { x: 240, y: 190, radius: 10, collected: false },
      { x: 390, y: 120, radius: 10, collected: false },
      { x: 530, y: 50, radius: 10, collected: false },
      { x: 800, y: 160, radius: 10, collected: false },
      { x: 960, y: 90, radius: 10, collected: false },
      { x: 1250, y: 210, radius: 10, collected: false },
      { x: 1380, y: 120, radius: 10, collected: false },
      { x: 1550, y: 80, radius: 10, collected: false },
      { x: 1860, y: 120, radius: 10, collected: false },
      { x: 2030, y: 50, radius: 10, collected: false },
      { x: 2400, y: 190, radius: 10, collected: false },
      { x: 2600, y: 120, radius: 10, collected: false },
      { x: 2780, y: 50, radius: 10, collected: false },
    ],
    exitPortal: { x: 3050, y: 290, width: 35, height: 60 },
  }
];
