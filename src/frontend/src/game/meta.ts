// Local player profile, persistent stats, missions, ranks and achievements.
import type { Skin } from "./config";
import type { Mission } from "./types";

export interface Profile {
  totalRuns: number;
  totalCoins: number;
  totalDistance: number;
  maxComboEver: number;
  bestScore: number;
  missionsCompleted: number;
  goldenCoins: number;
  localScores: number[];
  skinId: string;
  reducedMotion: boolean;
  musicOn: boolean;
  unlocked: string[];
}

export const DEFAULT_PROFILE: Profile = {
  totalRuns: 0,
  totalCoins: 0,
  totalDistance: 0,
  maxComboEver: 0,
  bestScore: 0,
  missionsCompleted: 0,
  goldenCoins: 0,
  localScores: [],
  skinId: "classic",
  reducedMotion: false,
  musicOn: true,
  unlocked: [],
};

const PROFILE_KEY = "icrex_profile_v1";

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      unlocked: parsed.unlocked ?? [],
      localScores: parsed.localScores ?? [],
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function recordLocalScore(scores: number[], score: number): number[] {
  return [...scores, score].sort((a, b) => b - a).slice(0, 5);
}

// ---- ranks ---------------------------------------------------------------

export interface Rank {
  name: string;
  min: number;
  color: string;
  icon: string;
}

export const RANKS: Rank[] = [
  { name: "Küken", min: 0, color: "#b08968", icon: "🥚" },
  { name: "Bronze", min: 500, color: "#cd7f32", icon: "🥉" },
  { name: "Silber", min: 1500, color: "#c0c0c0", icon: "🥈" },
  { name: "Gold", min: 3000, color: "#e8b44a", icon: "🥇" },
  { name: "Platin", min: 6000, color: "#7fd1d6", icon: "💠" },
  { name: "Diamant", min: 10000, color: "#9b8cff", icon: "💎" },
];

export function rankIndex(score: number): number {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].min) idx = i;
  }
  return idx;
}
export function rankFor(score: number): Rank {
  return RANKS[rankIndex(score)];
}
export function nextRank(score: number): Rank | null {
  const i = rankIndex(score);
  return i + 1 < RANKS.length ? RANKS[i + 1] : null;
}

// ---- skins ---------------------------------------------------------------

export function skinUnlocked(skin: Skin, p: Profile): boolean {
  switch (skin.unlock.kind) {
    case "free":
      return true;
    case "score":
      return p.bestScore >= skin.unlock.value;
    case "coins":
      return p.totalCoins >= skin.unlock.value;
    case "runs":
      return p.totalRuns >= skin.unlock.value;
    default:
      return true;
  }
}

// ---- missions ------------------------------------------------------------

export const MISSIONS: Mission[] = [
  { id: "m-coins-10", kind: "coins", target: 10, label: "Sammle 10 Münzen", reward: 150 },
  { id: "m-coins-20", kind: "coins", target: 20, label: "Sammle 20 Münzen", reward: 300 },
  { id: "m-coins-30", kind: "coins", target: 30, label: "Sammle 30 Münzen", reward: 500 },
  { id: "m-score-700", kind: "score", target: 700, label: "Erreiche 700 Punkte", reward: 200 },
  { id: "m-score-1500", kind: "score", target: 1500, label: "Erreiche 1500 Punkte", reward: 350 },
  { id: "m-score-2500", kind: "score", target: 2500, label: "Erreiche 2500 Punkte", reward: 550 },
  { id: "m-near-3", kind: "nearMiss", target: 3, label: "3 knappe Ausweichmanöver", reward: 250 },
  { id: "m-near-6", kind: "nearMiss", target: 6, label: "6 knappe Ausweichmanöver", reward: 450 },
  { id: "m-power-2", kind: "powerups", target: 2, label: "Sammle 2 Power-ups", reward: 250 },
  { id: "m-power-3", kind: "powerups", target: 3, label: "Sammle 3 Power-ups", reward: 400 },
  { id: "m-dist-1200", kind: "distance", target: 1200, label: "Laufe 1200 m", reward: 300 },
  { id: "m-dist-2000", kind: "distance", target: 2000, label: "Laufe 2000 m", reward: 500 },
  { id: "m-gold-1", kind: "golden", target: 1, label: "Sammle eine goldene Münze", reward: 300 },
];

export function randomMission(): Mission {
  return MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
}

// ---- achievements --------------------------------------------------------

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  goal: number;
  metric: (p: Profile) => number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-run", name: "Erste Schritte", desc: "Spiele deinen ersten Lauf", icon: "👣", goal: 1, metric: (p) => p.totalRuns },
  { id: "score-500", name: "Aufgewärmt", desc: "Erreiche 500 Punkte", icon: "🔥", goal: 500, metric: (p) => p.bestScore },
  { id: "score-2000", name: "Wüstenläufer", desc: "Erreiche 2000 Punkte", icon: "🏃", goal: 2000, metric: (p) => p.bestScore },
  { id: "score-5000", name: "Legende", desc: "Erreiche 5000 Punkte", icon: "👑", goal: 5000, metric: (p) => p.bestScore },
  { id: "score-10000", name: "Unsterblich", desc: "Erreiche 10000 Punkte", icon: "💎", goal: 10000, metric: (p) => p.bestScore },
  { id: "coins-100", name: "Münzsammler", desc: "Sammle insgesamt 100 Münzen", icon: "🪙", goal: 100, metric: (p) => p.totalCoins },
  { id: "coins-500", name: "Schatzmeister", desc: "Sammle insgesamt 500 Münzen", icon: "💰", goal: 500, metric: (p) => p.totalCoins },
  { id: "golden-1", name: "Goldrausch", desc: "Sammle eine goldene Münze", icon: "✨", goal: 1, metric: (p) => p.goldenCoins },
  { id: "golden-10", name: "Goldgräber", desc: "Sammle 10 goldene Münzen", icon: "🌟", goal: 10, metric: (p) => p.goldenCoins },
  { id: "combo-5", name: "Combo-Meister", desc: "Erreiche einen 5er-Combo", icon: "⚡", goal: 5, metric: (p) => p.maxComboEver },
  { id: "missions-10", name: "Auftragsjäger", desc: "Erfülle 10 Missionen", icon: "🎖️", goal: 10, metric: (p) => p.missionsCompleted },
  { id: "missions-25", name: "Söldner", desc: "Erfülle 25 Missionen", icon: "🏅", goal: 25, metric: (p) => p.missionsCompleted },
  { id: "runs-25", name: "Ausdauernd", desc: "Spiele 25 Läufe", icon: "🎯", goal: 25, metric: (p) => p.totalRuns },
  { id: "distance-8000", name: "Weitwanderer", desc: "Lege insgesamt 8000 m zurück", icon: "🗺️", goal: 8000, metric: (p) => p.totalDistance },
];

export function achievementUnlocked(a: Achievement, p: Profile): boolean {
  return a.metric(p) >= a.goal;
}

export function currentlyUnlocked(p: Profile): string[] {
  return ACHIEVEMENTS.filter((a) => achievementUnlocked(a, p)).map((a) => a.id);
}
