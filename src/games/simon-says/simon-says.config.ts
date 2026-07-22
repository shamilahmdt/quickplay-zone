export const SIMON_CONFIG = {
  TILES: [
    { id: 'green', color: '#22c55e', className: 'bg-green-500', frequency: 523 }, // C5
    { id: 'red', color: '#ef4444', className: 'bg-red-500', frequency: 659 }, // E5
    { id: 'yellow', color: '#eab308', className: 'bg-yellow-500', frequency: 784 }, // G5
    { id: 'blue', color: '#3b82f6', className: 'bg-blue-500', frequency: 1047 }, // C6
  ] as const,
  
  FLASH_DURATION: 500, // ms
  PAUSE_BETWEEN_TILES: 100, // ms
  
  // Speed scaling: reduce timings as sequence grows
  getFlashDuration: (sequenceLength: number) => 
    Math.max(300, 500 - sequenceLength * 10),
  
  getPauseBetweenTiles: (sequenceLength: number) => 
    Math.max(50, 100 - sequenceLength * 2),
};
