import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Assets } from "@/game/assets";
import { AudioManager } from "@/game/audio";
import { SKINS } from "@/game/config";
import { GameEngine } from "@/game/engine";
import { KeyboardInput } from "@/game/input";
import {
  type Achievement,
  ACHIEVEMENTS,
  currentlyUnlocked,
  loadProfile,
  type Profile,
  type Rank,
  RANKS,
  rankIndex,
  randomMission,
  recordLocalScore,
  saveProfile,
  skinUnlocked,
} from "@/game/meta";
import type { GamePhase, RunStats } from "@/game/types";

const MUTE_KEY = "icrex_muted";

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeMuted(m: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    // ignore
  }
}

function hueFor(skinId: string): number {
  return SKINS.find((s) => s.id === skinId)?.hue ?? 0;
}

export function useGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const profileRef = useRef<Profile>(loadProfile());

  const [phase, setPhase] = useState<GamePhase>("menu");
  const [best, setBest] = useState(profileRef.current.bestScore);
  const [finalStats, setFinalStats] = useState<RunStats | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMuted] = useState(readMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profile, setProfile] = useState<Profile>(profileRef.current);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [rankUp, setRankUp] = useState<Rank | null>(null);

  const persist = useCallback((p: Profile) => {
    profileRef.current = p;
    saveProfile(p);
    setProfile(p);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const assets = new Assets();
    assets.load();
    const audio = new AudioManager(readMuted());
    audio.setMusicEnabled(profileRef.current.musicOn);
    audioRef.current = audio;

    let engine: GameEngine;
    try {
      engine = new GameEngine(canvas, assets, audio, {
        onPhaseChange: (p) => setPhase(p),
        onRunEnd: (stats, newBest) => {
          setFinalStats(stats);
          setIsNewBest(newBest);
          const prev = profileRef.current;
          const updated: Profile = {
            ...prev,
            totalRuns: prev.totalRuns + 1,
            totalCoins: prev.totalCoins + stats.coins,
            goldenCoins: prev.goldenCoins + stats.goldenCoins,
            totalDistance: prev.totalDistance + stats.distance,
            maxComboEver: Math.max(prev.maxComboEver, stats.maxCombo),
            bestScore: Math.max(prev.bestScore, stats.score),
            localScores: recordLocalScore(prev.localScores, stats.score),
            missionsCompleted:
              prev.missionsCompleted + (stats.missionCompleted ? 1 : 0),
          };
          const unlockedNow = currentlyUnlocked(updated);
          const fresh = unlockedNow.filter((id) => !prev.unlocked.includes(id));
          updated.unlocked = unlockedNow;
          profileRef.current = updated;
          saveProfile(updated);
          setProfile(updated);
          if (fresh.length > 0) {
            setNewAchievements(ACHIEVEMENTS.filter((a) => fresh.includes(a.id)));
          }
          const prevRank = rankIndex(prev.bestScore);
          const newRank = rankIndex(updated.bestScore);
          if (newRank > prevRank) setRankUp(RANKS[newRank]);
        },
        onBestChange: (b) => setBest(b),
      });
    } catch {
      return;
    }
    engineRef.current = engine;
    engine.setSkin(hueFor(profileRef.current.skinId));
    engine.setReducedMotion(profileRef.current.reducedMotion);
    engine.mountMenu();

    const keyboard = new KeyboardInput({
      onJumpPress: () => engine.requestJump(),
      onJumpRelease: () => engine.setJumpHeld(false),
      onDuckPress: () => engine.setDuck(true),
      onDuckRelease: () => engine.setDuck(false),
      onPause: () => engine.togglePause(),
      onConfirm: () => {
        const ph = engine.getPhase();
        if (ph === "menu" || ph === "dead") {
          engine.setMission(randomMission());
          engine.start();
        }
      },
    });
    keyboard.attach();

    const onVisibility = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      keyboard.detach();
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFs);
      engine.destroy();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    setFinalStats(null);
    setIsNewBest(false);
    setNewAchievements([]);
    setRankUp(null);
    engineRef.current?.setMission(randomMission());
    engineRef.current?.start();
  }, []);

  const restart = start;

  const togglePause = useCallback(() => engineRef.current?.togglePause(), []);
  const toMenu = useCallback(() => engineRef.current?.toMenu(), []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted(next);
      writeMuted(next);
      return next;
    });
  }, []);

  const toggleMusic = useCallback(() => {
    const next = !profileRef.current.musicOn;
    audioRef.current?.setMusicEnabled(next);
    if (next && engineRef.current?.getPhase() === "running") {
      audioRef.current?.startMusic();
    }
    persist({ ...profileRef.current, musicOn: next });
  }, [persist]);

  const toggleReducedMotion = useCallback(() => {
    const next = !profileRef.current.reducedMotion;
    engineRef.current?.setReducedMotion(next);
    persist({ ...profileRef.current, reducedMotion: next });
  }, [persist]);

  const setSkin = useCallback(
    (skinId: string) => {
      const skin = SKINS.find((s) => s.id === skinId);
      if (!skin || !skinUnlocked(skin, profileRef.current)) return;
      engineRef.current?.setSkin(skin.hue);
      persist({ ...profileRef.current, skinId });
    },
    [persist],
  );

  const dismissAchievements = useCallback(() => setNewAchievements([]), []);
  const dismissRankUp = useCallback(() => setRankUp(null), []);

  const toggleFullscreen = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const pressJump = useCallback(() => {
    engineRef.current?.requestJump();
    engineRef.current?.setJumpHeld(true);
  }, []);
  const releaseJump = useCallback(() => engineRef.current?.setJumpHeld(false), []);
  const pressDuck = useCallback(() => engineRef.current?.setDuck(true), []);
  const releaseDuck = useCallback(() => engineRef.current?.setDuck(false), []);

  const unlockedSet = useMemo(() => new Set(currentlyUnlocked(profile)), [profile]);

  return {
    canvasRef,
    phase,
    best,
    finalStats,
    isNewBest,
    muted,
    isFullscreen,
    profile,
    unlockedSet,
    newAchievements,
    rankUp,
    start,
    restart,
    togglePause,
    toMenu,
    toggleMute,
    toggleMusic,
    toggleReducedMotion,
    setSkin,
    dismissAchievements,
    dismissRankUp,
    toggleFullscreen,
    pressJump,
    releaseJump,
    pressDuck,
    releaseDuck,
  };
}
