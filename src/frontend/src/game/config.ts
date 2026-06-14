// Central, framerate-independent tuning for IC-Rex.
// All distances are in *design* pixels and all times in seconds.

export const DESIGN = {
  width: 1280,
  height: 720,
  groundHeight: 132,
} as const;

export const PHYSICS_HZ = 120;
export const FIXED_DT = 1 / PHYSICS_HZ;
export const MAX_FRAME_DT = 0.1;

export const PHYSICS = {
  gravityRise: 2650,
  gravityFall: 3550,
  jumpVelocity: -1180,
  doubleJumpVelocity: -1000,
  shortHopFactor: 0.42,
  fastFallBonus: 2600,
  maxFallSpeed: 2200,
  coyoteTime: 0.09,
  jumpBuffer: 0.12,
} as const;

export const SPEED = {
  start: 560,
  max: 1240,
  accelPerSecond: 9.5,
  lineThreshold: 920,
} as const;

export const PLAYER = {
  width: 78, // logical box used as the horizontal centre reference
  height: 84,
  duckHeight: 52,
  startX: 200,
  drawWidth: 112, // visual dino width (wider than the forgiving hitbox)
  hitWidth: 58, // collision width covering the dino's central body
  hitTopInset: 10,
  hitBottomInset: 4,
} as const;

export const SCORING = {
  distancePerPoint: 14,
  coinValue: 25,
  goldenMultiplier: 5,
  comboStep: 0.25,
  comboMax: 5,
  comboDecay: 1.4,
  nearMissBonus: 15,
} as const;

export const SPAWN = {
  minGapSeconds: 0.95,
  maxGapSeconds: 1.7,
  gapDifficultyFloor: 0.6,
  difficultyRampPoints: 2600,
  coinGapSeconds: 1.25,
  goldenChance: 0.12,
  powerupEveryMinSeconds: 13,
  powerupEveryMaxSeconds: 22,
} as const;

export const POWERUPS = {
  magnetDuration: 7,
  magnetRadius: 320,
  magnetPull: 900,
  scoreX2Duration: 8,
  shieldInvulnAfterBreak: 1.2,
  slowmoDuration: 4.5,
  slowmoFactor: 0.5,
} as const;

export interface SkinUnlock {
  kind: "free" | "score" | "coins" | "runs";
  value: number;
  label: string;
}
export interface Skin {
  id: string;
  name: string;
  hue: number;
  swatch: string;
  unlock: SkinUnlock;
}
export const SKINS: Skin[] = [
  { id: "classic", name: "Klassisch", hue: 0, swatch: "#d2691e", unlock: { kind: "free", value: 0, label: "" } },
  { id: "cactus", name: "Kaktus", hue: 95, swatch: "#3f9d4f", unlock: { kind: "free", value: 0, label: "" } },
  { id: "ice", name: "Eis", hue: 185, swatch: "#3fa8c4", unlock: { kind: "score", value: 1000, label: "1000 Punkte" } },
  { id: "royal", name: "Royal", hue: 250, swatch: "#6a5acd", unlock: { kind: "coins", value: 300, label: "300 Münzen" } },
  { id: "candy", name: "Candy", hue: 310, swatch: "#e0559a", unlock: { kind: "runs", value: 15, label: "15 Läufe" } },
  { id: "gold", name: "Gold", hue: 45, swatch: "#e8b44a", unlock: { kind: "score", value: 3000, label: "3000 Punkte" } },
];

export interface Stage {
  name: string;
  skyTop: string;
  skyBottom: string;
  duneFar: string;
  duneNear: string;
  ground: string;
  night: boolean;
  storm: boolean;
}
export const STAGES: Stage[] = [
  { name: "Morgensonne", skyTop: "#fbe7c6", skyBottom: "#f7c98b", duneFar: "#e7b27a", duneNear: "#cf8f53", ground: "#b9824a", night: false, storm: false },
  { name: "Sonnenuntergang", skyTop: "#f7b27a", skyBottom: "#e9646a", duneFar: "#c9785e", duneNear: "#9c5240", ground: "#94553c", night: false, storm: false },
  { name: "Wüstennacht", skyTop: "#1d2350", skyBottom: "#3b2b6b", duneFar: "#2d2a55", duneNear: "#211d40", ground: "#241f3a", night: true, storm: false },
  { name: "Morgendämmerung", skyTop: "#a6b6e6", skyBottom: "#f3b6a0", duneFar: "#c79b86", duneNear: "#9c7060", ground: "#a06f50", night: false, storm: false },
  { name: "Sandsturm", skyTop: "#d9a45b", skyBottom: "#c98a47", duneFar: "#b87b3e", duneNear: "#9a6531", ground: "#875a2c", night: false, storm: true },
];
export const STAGE_LENGTH = 900;

export const PALETTE = {
  hudText: "#5c3a1e",
  hudTextNight: "#f3e6c8",
  hudShadow: "#fff3df",
  hudShadowNight: "#1b1430",
  coin: "#f4c542",
  golden: "#ffd700",
  combo: "#e8783c",
  shield: "#4fc3f7",
  magnet: "#e84393",
  scoreX2: "#9b59ff",
  slowmo: "#52d6c4",
} as const;
