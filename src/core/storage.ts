import type { ScoreEntry, GameStats } from './types';

const PREFIX = 'quickplay_zone_';

export const storage = {
  // Get stats for a game
  getGameStats(gameId: string): GameStats {
    const data = localStorage.getItem(`${PREFIX}stats_${gameId}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        // Fallback
      }
    }
    return {
      highScore: 0,
      playCount: 0,
      lastPlayed: '',
    };
  },

  // Save stats for a game
  saveGameStats(gameId: string, stats: Partial<GameStats>): void {
    const current = this.getGameStats(gameId);
    const updated = {
      ...current,
      ...stats,
      lastPlayed: stats.lastPlayed || new Date().toISOString(),
    };
    localStorage.setItem(`${PREFIX}stats_${gameId}`, JSON.stringify(updated));
  },

  // Increment play count
  incrementPlayCount(gameId: string): void {
    const current = this.getGameStats(gameId);
    this.saveGameStats(gameId, {
      playCount: current.playCount + 1,
      lastPlayed: new Date().toISOString(),
    });
  },

  // Update high score
  updateHighScore(gameId: string, score: number): boolean {
    const current = this.getGameStats(gameId);
    if (score > current.highScore) {
      this.saveGameStats(gameId, { highScore: score });
      return true; // New high score
    }
    return false;
  },

  // Get leaderboard for a game
  getLeaderboard(gameId: string): ScoreEntry[] {
    const data = localStorage.getItem(`${PREFIX}leaderboard_${gameId}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        // Fallback
      }
    }
    return [];
  },

  // Add score to leaderboard
  addLeaderboardScore(gameId: string, entry: Omit<ScoreEntry, 'date'>): boolean {
    const current = this.getLeaderboard(gameId);
    const newEntry: ScoreEntry = {
      ...entry,
      date: new Date().toISOString(),
    };
    const updated = [...current, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    localStorage.setItem(`${PREFIX}leaderboard_${gameId}`, JSON.stringify(updated));
    this.updateHighScore(gameId, entry.score);
    return updated.some(e => e.date === newEntry.date); // True if it made the board
  }
};
