export interface GameMeta {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  controls: string[];
  component: React.ComponentType;
}

export interface ScoreEntry {
  playerName: string;
  score: number;
  date: string;
}

export interface GameStats {
  highScore: number;
  playCount: number;
  lastPlayed: string;
  [key: string]: any;
}
