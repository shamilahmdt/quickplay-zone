# 🎮 QUICKPLAY ZONE

QuickPlay Zone is a fast, minimal, offline-first web arcade cockpit designed to run retro games instantly in your browser. With zero accounts, downloads, or bloated frameworks, session stats and high scores are preserved locally.

## 🚀 Live Demo

Experience QuickPlay Zone live at: **[https://quickplay-zone.vercel.app/](https://quickplay-zone.vercel.app/)**

---

## 🛠️ Check Out My Other Project

**DevTasks Workspace** — [Live Demo](https://dev-tasks-beta.vercel.app/) · [Repository](https://github.com/shamilahmdt/devtasks)

[![DevTasks](https://img.shields.io/badge/Check_Out-DevTasks-black?style=flat-square&logo=vercel)](https://dev-tasks-beta.vercel.app/)

---

## 🚀 Key Features

* **Arcade Aesthetic**: Monochromatic look featuring slate-gray speed-lines, sharp corners, and a silver/off-white gradient wordmark.
* **Soften OLED Dark Theme**: Designed to prevent eye strain and OLED halation by using a custom `#121214` body background, `#1a1a1c` card layers, and an `#e8e8ea` off-white primary text.
* **Offline Independence**: Manifest configurations and asset caching allow full gameplay in planes, subways, or whenever offline.
* **Interactive Splashscreen**: A session-aware retro system deck loader with an animated loading progress bar and pulsing gamepad logo.
* **Responsive Mobile Header**: Hides desktop-only navigation text links on mobile, collapsing them alongside connection status feeds into a 44px tap-target-friendly sidebar menu.

---

## 🎮 Available Games

QuickPlay Zone features a selection of retro games built to run instantly offline:

* **Snake Classic** 🐍 — Eat silver bits, adjust speed/difficulty, select wall wrapping modes, and save high scores.
* **Cosmic Defender** 🚀 — Move your spaceship, dodge enemy projectiles, and shoot down waves of hostile aliens.
* **Brick Breaker** 🧱 — Bounce balls and break neon bricks with fluid movement and paddle physics.
* **Simon Says** 🎵 — Watch sound and light patterns and repeat the sequence to test your memory.
* **Neon Pong** 🏓 — Classic paddle tennis with support for local two-player matchups or single-player vs AI.
* **2048 Puzzle** 🔢 — Slide and merge matching number tiles to reach the 2048 goal.
* **Bounce Retro** 🔴 — Roll, jump, and bounce a squishy red ball through 10 obstacle-filled platformer levels.
* **Cyber Highway Crosser 🐸** — Guide your data packet across moving traffic and memory-stream platforms, avoid collisions, and reach the server docks.

---

## 🛠️ Contributor Guide: Adding New Games

Adding a new game to the QuickPlay Zone grid takes four simple steps:

1. **Reference/Duplicate the Template**:
   Inspect [GameTemplate.tsx](./src/games/_template/GameTemplate.tsx) under `src/games/_template/` to see the basic structure, hooks, storage integration, and layout style properties.

2. **Develop the Game**:
   Create a folder under `src/games/<your-game-name>/` and build your React + Canvas gameplay elements. Use the `storage` utility to retrieve and update scores.

3. **Register in Registry**:
   Import your component and add a configuration item to the `gameRegistry` array in [gameRegistry.ts](./src/core/gameRegistry.ts):
   ```typescript
   import YourGame from '../games/your-game-name/YourGame';

   export const gameRegistry = [
     {
       id: 'your-game-id',
       name: 'Your Game Title',
       description: 'Brief description of features, settings, and objective.',
       thumbnail: '🎮',
       category: 'Arcade',
       controls: ['W/A/S/D: Steer', 'Space: Action'],
       component: YourGame,
     }
   ];
   ```

4. **Verify Build**:
   Ensure compilation is successful:
   ```bash
   npm run build
   ```

---

## 💻 CLI Commands

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Compile Production Bundle
```bash
npm run build
```
