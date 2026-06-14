// Shared types for the IC-Rex engine.

export type GamePhase = "menu" | "running" | "paused" | "dead";

export type ObstacleKind = "rock" | "cactus" | "cactusDouble" | "drone" | "boulder" | "wall";

export type PowerUpKind = "shield" | "magnet" | "scoreX2" | "slowmo";

export type MissionKind = "coins" | "score" | "nearMiss" | "powerups" | "distance" | "golden";

export interface Mission {
  id: string;
  kind: MissionKind;
  target: number;
  label: string;
  reward: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle extends Box {
  prevX: number;
  kind: ObstacleKind;
  bobPhase: number;
  spin: number;
  scored: boolean;
}

export interface Coin extends Box {
  prevX: number;
  collected: boolean;
  spin: number;
  baseY: number;
  floatPhase: number;
  golden: boolean;
}

export interface PowerUp extends Box {
  prevX: number;
  kind: PowerUpKind;
  floatPhase: number;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface Popup {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

export interface RunStats {
  score: number;
  coins: number;
  goldenCoins: number;
  distance: number;
  maxCombo: number;
  nearMisses: number;
  usedShield: boolean;
  stageReached: string;
  missionLabel: string;
  missionCompleted: boolean;
}

export interface GameEvents {
  onPhaseChange?: (phase: GamePhase) => void;
  onRunEnd?: (stats: RunStats, isNewBest: boolean) => void;
  onBestChange?: (best: number) => void;
}

export type SfxName =
  | "jump"
  | "doubleJump"
  | "coin"
  | "golden"
  | "hit"
  | "milestone"
  | "select"
  | "powerup"
  | "shieldBreak"
  | "nearMiss"
  | "mission";
