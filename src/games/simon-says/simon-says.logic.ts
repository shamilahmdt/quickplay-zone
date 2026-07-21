export interface SimonTile {
  id: 'green' | 'red' | 'yellow' | 'blue';
  color: string;
  className: string;
  frequency: number;
}

export type GameState = 'IDLE' | 'SHOWING' | 'INPUT' | 'GAME_OVER';

/**
 * Generate random tile ID
 */
export const getRandomTile = (): SimonTile['id'] => {
  const tiles = ['green', 'red', 'yellow', 'blue'] as const;
  return tiles[Math.floor(Math.random() * tiles.length)];
};

/**
 * Play a tile sound using Web Audio API
 */
export const playTileSound = (frequency: number, duration: number = 150) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Web Audio API not available:', error);
  }
};

/**
 * Check if the player input matches the current sequence
 */
export const checkInput = (sequence: SimonTile['id'][], userInput: SimonTile['id'][]): boolean => {
  if (userInput.length > sequence.length) return false;
  return userInput.every((tile, idx) => tile === sequence[idx]);
};

/**
 * Determine if player has completed the current round
 */
export const isRoundComplete = (sequence: SimonTile['id'][], userInput: SimonTile['id'][]): boolean => {
  return userInput.length > 0 && userInput.length === sequence.length;
};
