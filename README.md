# 🎮 QUICKPLAY ZONE

QuickPlay Zone is a fast, minimal, offline-first web arcade cockpit designed to run retro games instantly in your browser. With zero accounts, downloads, or bloated frameworks, session stats and high scores are preserved locally.

---

## 🚀 Key Features

* **Arcade Aesthetic**: Monochromatic look featuring slate-gray speed-lines, sharp corners, and a silver/off-white gradient wordmark.
* **Soften OLED Dark Theme**: Designed to prevent eye strain and OLED halation by using a custom `#121214` body background, `#1a1a1c` card layers, and an `#e8e8ea` off-white primary text.
* **Offline Independence**: Manifest configurations and asset caching allow full gameplay in planes, subways, or whenever offline.
* **Interactive Splashscreen**: A session-aware retro system deck loader with an animated loading progress bar and pulsing gamepad logo.
* **Responsive Mobile Header**: Hides desktop-only navigation text links on mobile, collapsing them alongside connection status feeds into a 44px tap-target-friendly sidebar menu.

---

## 🐍 Snake Classic Game Options

The integrated Snake Classic game features customized options configurable from the side panel:
1. **Difficulty Speeds**:
   - `EASY` (180ms tick rate)
   - `MEDIUM` (130ms tick rate)
   - `HARD` (80ms tick rate)
2. **Wall Collision Modes**:
   - `Solid Walls` (death on board border contact)
   - `Screen Wrap` (snake wraps around to the opposite side of the grid board)
3. **Leaderboard**:
   - Displays the top 3 scores saved under local storage.
   - Prompts the user with an input overlay to save their name **only** if they qualify for the top 3 high scores. Otherwise, scores are committed automatically under `Anonymous Player`.

---

## 🛠️ Contributor Guide: Adding New Games

Adding a new game to the QuickPlay Zone grid takes four simple steps:

1. **Reference/Duplicate the Template**:
   Inspect [GameTemplate.tsx](file:///d:/PROJECTS/Personal/MyProjects/QuickPlayZone/src/games/_template/GameTemplate.tsx) under `src/games/_template/` to see the basic structure, hooks, storage integration, and layout style properties.

2. **Develop the Game**:
   Create a folder under `src/games/<your-game-name>/` and build your React + Canvas gameplay elements. Use the `storage` utility to retrieve and update scores.

3. **Register in Registry**:
   Import your component and add a configuration item to the `gameRegistry` array in [gameRegistry.ts](file:///d:/PROJECTS/Personal/MyProjects/QuickPlayZone/src/core/gameRegistry.ts):
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
