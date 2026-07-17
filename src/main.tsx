import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import './styles/globals.css'

// Styled ASCII Art and Info in Console
console.log(
  `%c   ____        _      _     ____  _             _____\n` +
  `%c  / __ \\      (_)    | |   |  _ \\| |           |__  /___  _ __   ___\n` +
  `%c | |  | |_   _ _  ___| | __| |_) | | __ _ _   _  / // _ \\| '_ \\ / _ \\\n` +
  `%c | |__| | |_| | |/ __| |/ /|  __/| |/ _\` | | | |/ /| (_) | | | |  __/\n` +
  `%c  \\___\\_\\\\__,_|_|\\___|_|\\_\\|_|   |_|\\__,_|\\__, /___/\\___/|_| |_|\\___|\n` +
  `%c                                           __/ |\n` +
  `%c                                          |___/\n\n` +
  `%cWelcome to QuickPlay Zone! 🎮\n` +
  `%c- Repository:   %chttps://github.com/shamilahmdt/quickplay-zone\n` +
  `%c- Contributing: %chttps://github.com/shamilahmdt/quickplay-zone/blob/main/CONTRIBUTING.md\n` +
  `%c- License:      %cMIT\n`,
  'color: #a1a1aa; font-weight: bold;',
  'color: #a1a1aa; font-weight: bold;',
  'color: #a1a1aa; font-weight: bold;',
  'color: #a1a1aa; font-weight: bold;',
  'color: #a1a1aa; font-weight: bold;',
  'color: #a1a1aa; font-weight: bold;',
  'color: #a1a1aa; font-weight: bold;',
  'color: #e8e8ea; font-weight: bold; font-size: 13px;',
  'color: #a1a1aa;', 'color: #38bdf8; text-decoration: underline;',
  'color: #a1a1aa;', 'color: #38bdf8; text-decoration: underline;',
  'color: #a1a1aa;', 'color: #e8e8ea; font-weight: bold;'
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

