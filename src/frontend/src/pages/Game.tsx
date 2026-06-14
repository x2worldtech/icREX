import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SKINS } from "@/game/config";
import { ACHIEVEMENTS, nextRank, rankFor, skinUnlocked } from "@/game/meta";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGame } from "@/hooks/useGame";
import { useHighScores, useSubmitScore } from "@/hooks/useQueries";
import {
  ArrowDown,
  Award,
  BarChart3,
  Check,
  Coins,
  Gamepad2,
  Home,
  Lock,
  Maximize,
  Minimize,
  Music,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

type MenuTab = "play" | "skins" | "achievements" | "stats";

function Game() {
  const game = useGame();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: highScores } = useHighScores();
  const submitScore = useSubmitScore();

  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [tab, setTab] = useState<MenuTab>("play");

  useEffect(() => {
    if (game.phase === "dead") setSaved(false);
  }, [game.phase, game.finalStats]);

  useEffect(() => {
    const check = () =>
      setPortrait(isMobile && window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [isMobile]);

  // auto-dismiss achievement toasts
  useEffect(() => {
    if (game.newAchievements.length === 0) return;
    const t = window.setTimeout(() => game.dismissAchievements(), 4800);
    return () => window.clearTimeout(t);
  }, [game.newAchievements, game.dismissAchievements]);

  // auto-dismiss rank-up toast
  useEffect(() => {
    if (!game.rankUp) return;
    const t = window.setTimeout(() => game.dismissRankUp(), 5000);
    return () => window.clearTimeout(t);
  }, [game.rankUp, game.dismissRankUp]);

  const topScores =
    highScores
      ?.slice()
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8) ?? [];

  const handleSubmit = () => {
    if (!playerName.trim() || !game.finalStats) return;
    submitScore.mutate(
      { playerName: playerName.trim(), score: game.finalStats.score },
      { onSuccess: () => setSaved(true) },
    );
  };

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-desert-light via-desert-sand to-desert-warm">
      {/* Achievement toasts */}
      {game.newAchievements.length > 0 && (
        <div className="fixed left-1/2 top-4 z-50 flex w-[92%] max-w-sm -translate-x-1/2 flex-col gap-2">
          {game.newAchievements.map((a) => (
            <div
              key={a.id}
              className="animate-fade-in flex items-center gap-3 rounded-2xl border-2 border-desert-sun/50 bg-gradient-to-r from-desert-card to-desert-sand p-3 shadow-soft-xl"
            >
              <span className="text-3xl">{a.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-desert-sun">
                  Erfolg freigeschaltet
                </p>
                <p className="truncate font-bold text-desert-foreground">
                  {a.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rank-up toast */}
      {game.rankUp && (
        <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-sm -translate-x-1/2">
          <div
            className="animate-fade-in flex items-center gap-3 rounded-2xl border-2 bg-gradient-to-r from-desert-card to-desert-sand p-3 shadow-soft-xl"
            style={{ borderColor: game.rankUp.color }}
          >
            <span className="text-3xl">{game.rankUp.icon}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: game.rankUp.color }}>
                Neuer Rang erreicht
              </p>
              <p className="truncate font-bold text-desert-foreground">
                {game.rankUp.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b-2 border-desert-accent/30 bg-gradient-to-r from-desert-card/98 to-desert-sand/98 backdrop-blur-md shadow-soft-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-desert-sun via-desert-accent to-desert-ground shadow-soft-lg animate-pulse-glow">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-desert-accent via-desert-sun to-desert-accent bg-clip-text text-transparent">
                  IC-Rex
                </h1>
                <p className="-mt-1 text-[11px] md:text-xs font-medium text-desert-muted">
                  Endless Desert Runner · on the Internet Computer
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconBtn
                onClick={game.toggleMusic}
                active={game.profile.musicOn}
                label="Musik"
              >
                <Music className="h-5 w-5" />
              </IconBtn>
              <IconBtn onClick={game.toggleMute} label="Ton">
                {game.muted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </IconBtn>
              <IconBtn
                onClick={() => game.toggleFullscreen(containerRef.current)}
                label="Vollbild"
              >
                {game.isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </IconBtn>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="grid gap-4 md:gap-8 lg:grid-cols-[1fr_340px]">
          {/* Game stage */}
          <Card className="overflow-hidden border-2 border-desert-accent/40 shadow-soft-xl">
            <CardContent className="p-0">
              <div
                ref={containerRef}
                className="relative aspect-[16/9] w-full select-none bg-desert-sky"
              >
                <canvas
                  ref={game.canvasRef}
                  className="absolute inset-0 h-full w-full touch-none"
                  style={{ imageRendering: "pixelated" }}
                  onPointerDown={(e) => {
                    if (game.phase === "running") {
                      e.preventDefault();
                      game.pressJump();
                    }
                  }}
                  onPointerUp={() => game.releaseJump()}
                  onPointerLeave={() => game.releaseJump()}
                />

                {game.phase === "running" && (
                  <button
                    type="button"
                    onPointerDown={stop}
                    onClick={game.togglePause}
                    aria-label="Pause"
                    className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                  >
                    <Pause className="h-5 w-5" />
                  </button>
                )}

                {game.phase === "running" && isMobile && (
                  <button
                    type="button"
                    aria-label="Ducken"
                    onPointerDown={(e) => {
                      stop(e);
                      e.preventDefault();
                      game.pressDuck();
                    }}
                    onPointerUp={() => game.releaseDuck()}
                    onPointerLeave={() => game.releaseDuck()}
                    className="absolute bottom-4 left-4 z-20 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-white/30 bg-black/35 text-white backdrop-blur-sm active:bg-black/55"
                  >
                    <ArrowDown className="h-8 w-8" />
                  </button>
                )}

                {/* Menu with tabs */}
                {game.phase === "menu" && (
                  <div className="absolute inset-0 z-10 flex flex-col bg-gradient-to-b from-black/55 via-black/40 to-black/65 backdrop-blur-[2px]">
                    <div className="flex shrink-0 items-center justify-center gap-1 p-2 md:gap-2 md:p-3">
                      <TabBtn active={tab === "play"} onClick={() => setTab("play")}>
                        <Gamepad2 className="h-4 w-4" /> Spielen
                      </TabBtn>
                      <TabBtn active={tab === "skins"} onClick={() => setTab("skins")}>
                        <Palette className="h-4 w-4" /> Skins
                      </TabBtn>
                      <TabBtn
                        active={tab === "achievements"}
                        onClick={() => setTab("achievements")}
                      >
                        <Award className="h-4 w-4" /> Erfolge
                      </TabBtn>
                      <TabBtn active={tab === "stats"} onClick={() => setTab("stats")}>
                        <BarChart3 className="h-4 w-4" /> Statistik
                      </TabBtn>
                    </div>

                    <div className="flex flex-1 items-center justify-center overflow-y-auto p-3">
                      {tab === "play" && (
                        <div className="max-w-xl space-y-5 text-center animate-fade-in">
                          <div className="space-y-2 animate-float">
                            <h2 className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl">
                              IC-Rex
                            </h2>
                            <div className="mx-auto h-1.5 w-40 rounded-full bg-gradient-to-r from-transparent via-desert-sun to-transparent" />
                          </div>
                          {(() => {
                            const rank = rankFor(game.profile.bestScore);
                            const nxt = nextRank(game.profile.bestScore);
                            const pct = nxt
                              ? Math.min(
                                  100,
                                  ((game.profile.bestScore - rank.min) /
                                    (nxt.min - rank.min)) *
                                    100,
                                )
                              : 100;
                            return (
                              <div className="mx-auto max-w-xs rounded-2xl border border-white/15 bg-black/30 p-3">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-2xl">{rank.icon}</span>
                                  <span
                                    className="font-bold"
                                    style={{ color: rank.color }}
                                  >
                                    {rank.name}
                                  </span>
                                </div>
                                <div className="mt-2 h-2 w-full rounded-full bg-white/15">
                                  <div
                                    className="h-2 rounded-full"
                                    style={{ width: `${pct}%`, background: rank.color }}
                                  />
                                </div>
                                <p className="mt-1 text-[11px] text-white/60">
                                  {nxt
                                    ? `${nxt.min - game.profile.bestScore} Punkte bis ${nxt.name}`
                                    : "Höchster Rang erreicht!"}
                                </p>
                              </div>
                            );
                          })()}
                          <p className="text-sm md:text-base text-white/85">
                            Renne, springe und sammle ICP-Münzen. Weiche Kakteen,
                            Felsen, Rollsteinen und Drohnen aus, schnapp dir
                            Power-ups – wie weit kommst du?
                          </p>
                          <Button
                            size="lg"
                            onClick={game.start}
                            className="group bg-gradient-to-r from-desert-sun via-desert-accent to-desert-sun text-white font-bold text-xl px-12 py-8 rounded-2xl border-2 border-white/20 shadow-soft-xl transition hover:scale-105"
                          >
                            <Play className="mr-3 h-7 w-7 transition-transform group-hover:scale-125" />
                            Spiel starten
                          </Button>
                          <div className="mx-auto max-w-md rounded-xl bg-black/30 p-3 text-xs md:text-sm text-white/80">
                            {isMobile ? (
                              <p>
                                Tippen = Springen (2× = Doppelsprung) · Button
                                unten links = Ducken
                              </p>
                            ) : (
                              <p>
                                <b>Leertaste / ↑ / W</b> springen (2× =
                                Doppelsprung) · <b>↓ / S</b> ducken ·{" "}
                                <b>P / Esc</b> Pause
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={game.toggleReducedMotion}
                            className="text-xs text-white/60 underline-offset-2 hover:underline"
                          >
                            Reduzierte Effekte:{" "}
                            {game.profile.reducedMotion ? "An" : "Aus"}
                          </button>
                        </div>
                      )}

                      {tab === "skins" && (
                        <div className="w-full max-w-lg animate-fade-in">
                          <h3 className="mb-3 text-center text-xl font-bold text-white">
                            Wähle deinen Läufer
                          </h3>
                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
                            {SKINS.map((s) => {
                              const selected = game.profile.skinId === s.id;
                              const unlocked = skinUnlocked(s, game.profile);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  disabled={!unlocked}
                                  onClick={() => game.setSkin(s.id)}
                                  className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition ${
                                    selected
                                      ? "border-white bg-white/20 scale-105"
                                      : unlocked
                                        ? "border-white/20 bg-black/20 hover:bg-black/30"
                                        : "border-white/10 bg-black/40 opacity-60"
                                  }`}
                                >
                                  <span
                                    className="h-10 w-10 rounded-full border-2 border-white/40 shadow-soft"
                                    style={{ background: s.swatch }}
                                  />
                                  <span className="text-xs font-semibold text-white">
                                    {s.name}
                                  </span>
                                  {selected && unlocked && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-desert-sun">
                                      <Check className="h-3 w-3" /> aktiv
                                    </span>
                                  )}
                                  {!unlocked && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-white/60">
                                      <Lock className="h-3 w-3" /> {s.unlock.label}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {tab === "achievements" && (
                        <div className="w-full max-w-lg space-y-2 animate-fade-in">
                          {ACHIEVEMENTS.map((a) => {
                            const done = game.unlockedSet.has(a.id);
                            const val = a.metric(game.profile);
                            const pct = Math.min(100, (val / a.goal) * 100);
                            return (
                              <div
                                key={a.id}
                                className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                                  done
                                    ? "border-desert-sun/50 bg-desert-sun/15"
                                    : "border-white/15 bg-black/25"
                                }`}
                              >
                                <span className="text-2xl">
                                  {done ? a.icon : "🔒"}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-1 font-bold text-white">
                                    {a.name}
                                    {done && (
                                      <Check className="h-4 w-4 text-desert-sun" />
                                    )}
                                  </p>
                                  <p className="text-xs text-white/70">{a.desc}</p>
                                  {!done && (
                                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/15">
                                      <div
                                        className="h-1.5 rounded-full bg-desert-sun"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {tab === "stats" && (
                        <div className="w-full max-w-md space-y-3 animate-fade-in">
                          <div className="grid grid-cols-2 gap-3">
                            <StatCard label="Beste Punkte" value={game.profile.bestScore} />
                            <StatCard label="Läufe" value={game.profile.totalRuns} />
                            <StatCard label="Münzen gesamt" value={game.profile.totalCoins} />
                            <StatCard label="Gold-Münzen" value={game.profile.goldenCoins} />
                            <StatCard label="Strecke (m)" value={game.profile.totalDistance} />
                            <StatCard label="Missionen" value={game.profile.missionsCompleted} />
                            <StatCard label="Bester Combo" value={game.profile.maxComboEver} />
                            <StatCard
                              label="Erfolge"
                              value={`${game.unlockedSet.size}/${ACHIEVEMENTS.length}`}
                            />
                          </div>
                          {game.profile.localScores.length > 0 && (
                            <div className="rounded-2xl border border-white/15 bg-black/30 p-3 text-left">
                              <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-white/70">
                                Deine besten Läufe
                              </p>
                              <div className="space-y-1">
                                {game.profile.localScores.map((s, i) => (
                                  <div
                                    key={`${s}-${i}`}
                                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white"
                                  >
                                    <span className="text-white/60">#{i + 1}</span>
                                    <span className="font-bold">{s}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Paused */}
                {game.phase === "paused" && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                    <div className="w-full max-w-xs space-y-3 px-6 text-center animate-fade-in">
                      <h2 className="text-4xl font-bold text-white">Pause</h2>
                      <Button
                        onClick={game.togglePause}
                        className="w-full bg-gradient-to-r from-desert-sun to-desert-accent py-6 text-lg font-bold text-white"
                      >
                        <Play className="mr-2 h-5 w-5" /> Weiter
                      </Button>
                      <Button
                        onClick={game.restart}
                        variant="outline"
                        className="w-full border-2 border-white/40 bg-white/10 py-6 font-bold text-white hover:bg-white/20"
                      >
                        <RotateCcw className="mr-2 h-5 w-5" /> Neu starten
                      </Button>
                      <Button
                        onClick={game.toMenu}
                        variant="ghost"
                        className="w-full text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        <Home className="mr-2 h-5 w-5" /> Hauptmenü
                      </Button>
                    </div>
                  </div>
                )}

                {/* Game over */}
                {game.phase === "dead" && game.finalStats && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-black/60 via-black/45 to-black/70 backdrop-blur-md">
                    <div className="w-full max-w-md space-y-4 p-5 text-center animate-fade-in">
                      <div className="space-y-1">
                        <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-2xl">
                          Game Over
                        </h2>
                        {game.isNewBest && (
                          <span className="inline-block rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-1 text-sm font-bold text-white shadow-soft">
                            🏆 Neuer Rekord!
                          </span>
                        )}
                        <p className="text-sm text-white/70">
                          Erreicht: {game.finalStats.stageReached}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/40 p-4">
                        <Stat label="Punkte" value={game.finalStats.score} />
                        <Stat label="Münzen" value={game.finalStats.coins} />
                        <Stat label="Combo" value={game.finalStats.maxCombo} />
                        <Stat label="Beste" value={game.best} />
                      </div>

                      {(game.finalStats.goldenCoins > 0 ||
                        game.finalStats.nearMisses > 0) && (
                        <p className="text-xs text-white/70">
                          {game.finalStats.goldenCoins > 0 &&
                            `✨ ${game.finalStats.goldenCoins} goldene Münzen  `}
                          {game.finalStats.nearMisses > 0 &&
                            `· ${game.finalStats.nearMisses}× knapp ausgewichen`}
                        </p>
                      )}

                      {game.finalStats.missionLabel && (
                        <div
                          className={`rounded-xl border p-2 text-sm font-semibold ${
                            game.finalStats.missionCompleted
                              ? "border-green-400/40 bg-green-400/15 text-green-200"
                              : "border-white/15 bg-black/30 text-white/70"
                          }`}
                        >
                          {game.finalStats.missionCompleted ? "✓ Mission erfüllt: " : "Mission verpasst: "}
                          {game.finalStats.missionLabel}
                        </div>
                      )}

                      {!saved ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Dein Name für die Bestenliste"
                            value={playerName}
                            maxLength={20}
                            onChange={(e) => setPlayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSubmit();
                            }}
                            className="border-2 border-desert-accent/40 bg-white/90 text-center text-desert-foreground"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              onClick={handleSubmit}
                              disabled={!playerName.trim() || submitScore.isPending}
                              className="flex-1 bg-gradient-to-r from-desert-sun to-desert-accent font-bold text-white"
                            >
                              <Trophy className="mr-2 h-5 w-5" />
                              {submitScore.isPending ? "Speichern…" : "Speichern"}
                            </Button>
                            <Button
                              onClick={game.restart}
                              variant="outline"
                              className="flex-1 border-2 border-white/40 bg-white/10 font-bold text-white hover:bg-white/20"
                            >
                              <RotateCcw className="mr-2 h-5 w-5" /> Nochmal
                            </Button>
                          </div>
                          <button
                            type="button"
                            onClick={game.toMenu}
                            className="flex w-full items-center justify-center gap-1 text-sm text-white/70 hover:text-white"
                          >
                            <Home className="h-4 w-4" /> Hauptmenü
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="font-semibold text-desert-sun">
                            Gespeichert! 🎉
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              onClick={game.restart}
                              className="flex-1 bg-gradient-to-r from-desert-sun to-desert-accent py-6 font-bold text-white"
                            >
                              <RotateCcw className="mr-2 h-5 w-5" /> Nochmal
                            </Button>
                            <Button
                              onClick={game.toMenu}
                              variant="outline"
                              className="flex-1 border-2 border-white/40 bg-white/10 py-6 font-bold text-white hover:bg-white/20"
                            >
                              <Home className="mr-2 h-5 w-5" /> Menü
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {portrait && game.phase === "running" && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85">
                    <div className="space-y-3 p-6 text-center">
                      <Smartphone className="mx-auto h-14 w-14 animate-pulse text-desert-sun" />
                      <p className="text-lg font-bold text-white">
                        Bitte Gerät ins Querformat drehen
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <Card className="border-2 border-desert-accent/40 bg-gradient-to-br from-desert-card to-desert-sand/60 shadow-soft-lg">
              <CardHeader className="border-b border-desert-accent/20 bg-gradient-to-r from-desert-accent/15 to-desert-sun/15">
                <CardTitle className="flex items-center gap-3 text-desert-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-desert-sun to-desert-accent shadow-soft">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold">Bestenliste</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {topScores.length === 0 ? (
                  <div className="py-8 text-center">
                    <Trophy className="mx-auto mb-3 h-12 w-12 text-desert-muted/30" />
                    <p className="text-sm font-medium text-desert-muted">
                      Noch keine Highscores
                    </p>
                    <p className="mt-1 text-xs text-desert-muted/70">
                      Sei der Erste!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topScores.map(([name, score], index) => (
                      <div
                        key={`${name}-${index}`}
                        className="group flex items-center justify-between rounded-xl border border-desert-accent/15 bg-gradient-to-r from-desert-accent/8 to-desert-sun/8 p-3 transition hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-soft ${
                              index === 0
                                ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                : index === 1
                                  ? "bg-gradient-to-br from-gray-300 to-gray-500"
                                  : index === 2
                                    ? "bg-gradient-to-br from-orange-400 to-orange-600"
                                    : "bg-gradient-to-br from-desert-accent to-desert-sun"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="max-w-[150px] truncate font-semibold text-desert-foreground">
                            {name}
                          </span>
                        </div>
                        <span className="font-bold text-desert-accent">
                          {Number(score)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-desert-accent/30 bg-gradient-to-br from-desert-card to-desert-sand/50 shadow-soft">
              <CardContent className="space-y-2 p-4 text-sm text-desert-foreground">
                <p className="flex items-center gap-2 font-bold">
                  <Coins className="h-5 w-5 text-desert-sun" /> So gehts
                </p>
                <ul className="space-y-1 text-desert-muted">
                  <li>• Springe über Kakteen, Felsen, Rollsteine &amp; Mauern</li>
                  <li>• Ducke dich unter Drohnen – oder spring drüber</li>
                  <li>• Doppelsprung für hohe &amp; goldene Münzen ✨</li>
                  <li>• 🛡 Schild · 🧲 Magnet · 2× Punkte · ⏱ Zeitlupe</li>
                  <li>• Erfülle die Mission jedes Laufs für Bonus</li>
                  <li>• Combos &amp; knappe Ausweichmanöver geben Bonus</li>
                </ul>
              </CardContent>
            </Card>

            <div className="hidden overflow-hidden rounded-xl border-2 border-desert-accent/25 shadow-soft lg:block">
              <img
                src="/assets/generated/trex-section-divider.dim_400x150.png"
                alt="T-Rex"
                className="h-auto w-full opacity-50"
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 border-t-2 border-desert-accent/30 bg-gradient-to-r from-desert-card/98 to-desert-sand/98 py-6 backdrop-blur-md">
        <p className="text-center text-xs text-desert-muted">
          © 2025 IC-Rex · Built with ❤ using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-desert-accent underline decoration-desert-accent/30 hover:text-desert-sun"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  active = true,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
        active
          ? "border-desert-accent/30 bg-desert-accent/10 text-desert-accent hover:bg-desert-accent/20"
          : "border-desert-muted/20 bg-desert-muted/5 text-desert-muted/50 hover:bg-desert-muted/10"
      }`}
    >
      {children}
    </button>
  );
}

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition md:text-sm ${
        active
          ? "bg-white text-desert-accent shadow-soft"
          : "bg-white/10 text-white/80 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-bold text-white md:text-2xl">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-white/60">
        {label}
      </span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/30 p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-white/60">
        {label}
      </div>
    </div>
  );
}

export default Game;
