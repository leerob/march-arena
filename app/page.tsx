"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Confetti from "react-confetti";
import { CompressedBracket } from "@/components/compressed-bracket/CompressedBracket";
import { MatchupStatsPanel } from "@/components/MatchupStatsPanel";
import { useSimulation } from "@/components/SimulationControls";
import { BRACKET_2026 } from "@/lib/bracket-data";
import type { Bracket as BracketType, Game, SimulatedBracket } from "@/lib/bracket-data";
import {
  findCompressedGameById,
  getInProgressCompressedGameIds,
  NO_SIM_DEFAULT_SELECTED_GAME_ID,
} from "@/lib/bracket-to-compressed";
import { showSim } from "@/lib/simulate-gate";

function inferSimPhase(b: BracketType | SimulatedBracket): string {
  if (!b.firstFour.every((g) => g.winner)) return "First Four";
  for (const r of b.regions) {
    if (!r.rounds[0].every((g) => g.winner)) return "Round of 64";
  }
  for (const r of b.regions) {
    if (!r.rounds[1].every((g) => g.winner)) return "Round of 32";
  }
  for (const r of b.regions) {
    if (!r.rounds[2].every((g) => g.winner)) return "Sweet 16";
  }
  for (const r of b.regions) {
    if (!r.rounds[3].every((g) => g.winner)) return "Elite Eight";
  }
  if (!b.finalFour.every((g) => g.winner)) return "Final Four";
  if (!b.championship?.winner) return "Championship";
  return "Complete";
}

function ProductionAside({
  bracket,
  selectedGameId,
}: {
  bracket: BracketType | SimulatedBracket;
  selectedGameId: string | null;
}) {
  const selectedGame = useMemo(
    () => findCompressedGameById(bracket, selectedGameId),
    [bracket, selectedGameId]
  );
  return (
    <aside
      className="flex w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e8e8] bg-white max-h-[50dvh] md:max-h-[42dvh] lg:max-h-none lg:w-[28%] lg:min-w-0 lg:border-l lg:border-t-0"
      aria-label="Matchup details"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <MatchupStatsPanel
          game={selectedGame}
          variant="panel"
          includeBracketRoundNotes
        />
      </div>
    </aside>
  );
}

function LocalSimHome() {
  const [bracket, setBracket] = useState<BracketType | SimulatedBracket>(BRACKET_2026);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [simFocusManaged, setSimFocusManaged] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const bracketRef = useRef(bracket);
  useEffect(() => {
    bracketRef.current = bracket;
  }, [bracket]);

  const handleBracketUpdate = useCallback((update: BracketType | SimulatedBracket) => {
    setBracket(update);
    setHasStarted(true);
    setStarting(false);
  }, []);

  const { runSimulation, running, error } = useSimulation(
    (result) => setBracket(result),
    handleBracketUpdate
  );

  const selectedGame = useMemo(
    () => findCompressedGameById(bracket, selectedGameId),
    [bracket, selectedGameId]
  );

  const handleSelectGame = useCallback(
    (game: Game) => {
      if (running) setSimFocusManaged(false);
      setSelectedGameId(game.id);
    },
    [running]
  );

  const isComplete =
    "winner" in bracket &&
    bracket.winner != null &&
    bracket.championship != null &&
    bracket.championship.winner != null;

  const phase = running ? inferSimPhase(bracket) : null;
  const showOnboarding = !hasStarted && !isComplete;
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCompleteRef = useRef(false);

  useEffect(() => {
    if (isComplete && !prevCompleteRef.current) setShowConfetti(true);
    prevCompleteRef.current = isComplete;
  }, [isComplete]);

  const handleStart = useCallback(() => {
    setStarting(true);
    setSimFocusManaged(true);
    setSelectedGameId(null);
    setShowConfetti(false);
    prevCompleteRef.current = false;
    runSimulation();
  }, [runSimulation]);

  useEffect(() => {
    if (!running) setStarting(false);
  }, [running]);

  useEffect(() => {
    if (!running || !simFocusManaged) return;
    const ids = getInProgressCompressedGameIds(bracket);
    if (ids.length === 0) return;
    setSelectedGameId((prev) => (prev && ids.includes(prev) ? prev : ids[0]!));
  }, [bracket, running, simFocusManaged]);

  useEffect(() => {
    if (!running || !simFocusManaged) return;
    const intervalMs = 2800;
    const id = window.setInterval(() => {
      const ids = getInProgressCompressedGameIds(bracketRef.current);
      if (ids.length <= 1) return;
      setSelectedGameId((prev) => {
        const i = Math.max(0, ids.indexOf(prev ?? ""));
        return ids[(i + 1) % ids.length]!;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [running, simFocusManaged]);

  useEffect(() => {
    if (!running || !simFocusManaged || !selectedGameId) return;
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      const el = document.querySelector(
        `[data-game-id="${CSS.escape(selectedGameId)}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [selectedGameId, running, simFocusManaged]);

  return (
    <div className="relative flex h-[calc(100dvh-3rem)] flex-col overflow-hidden bg-[#ececec] lg:flex-row">
      {showConfetti && (
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 800}
          height={typeof window !== "undefined" ? window.innerHeight : 600}
          confettiSource={{
            x: typeof window !== "undefined" ? window.innerWidth / 2 : 400,
            y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
            w: 0,
            h: 0,
          }}
          recycle={false}
          numberOfPieces={500}
          gravity={0.15}
          initialVelocityX={15}
          initialVelocityY={30}
          onConfettiComplete={() => setShowConfetti(false)}
          style={{ position: "fixed", top: 0, left: 0, zIndex: 50, pointerEvents: "none" }}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:w-[72%] lg:shrink-0">
        <div className="min-h-0 flex-1 overflow-auto bg-[#ececec]">
          <div className="min-w-max p-3 pb-8">
            <CompressedBracket
              bracket={bracket}
              selectedGameId={selectedGameId}
              onSelectGame={handleSelectGame}
            />
          </div>
        </div>
      </div>

      <aside
        className="flex w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e8e8] bg-white max-h-[50dvh] md:max-h-[42dvh] lg:max-h-none lg:w-[28%] lg:min-w-0 lg:border-l lg:border-t-0"
        aria-label="Matchup details"
      >
        {showOnboarding ? (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 p-6 lg:p-8">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-[#1a1a1a]">
                March Madness AI
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5c5c5c]">
                We simulate the full 2026 bracket with an AI analyst: First Four,
                then every tournament game through the national championship, using
                KenPom-style stats, seed history, and matchup context. Results stream
                in round by round on the bracket.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#c8102e] px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#a50d25] disabled:opacity-70"
            >
              {starting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {starting ? "Starting…" : "Start simulation"}
            </button>
            <p className="text-[12px] text-[#8a8a8a]">
              Runs the full tournament in one pass (many games in parallel per
              round). May take a few minutes.
            </p>
          </div>
        ) : (
          <>
            {running && (
              <div className="shrink-0 border-b border-[#eee] bg-[#fafafa] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                  Simulating
                </p>
                <p className="text-[14px] font-medium text-[#1a1a1a]">{phase}…</p>
              </div>
            )}
            {error && (
              <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
                {error}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <MatchupStatsPanel
                game={selectedGame}
                variant="panel"
                includeBracketRoundNotes
              />
            </div>
            {isComplete && !running && (
              <div className="shrink-0 border-t border-[#eee] p-4">
                <button
                  type="button"
                  onClick={() => {
                    setHasStarted(false);
                    setStarting(false);
                    setBracket(BRACKET_2026);
                    setSelectedGameId(null);
                    setSimFocusManaged(false);
                    setShowConfetti(false);
                    prevCompleteRef.current = false;
                  }}
                  className="w-full rounded-lg border border-[#dcdddf] bg-white px-4 py-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f5f5f5]"
                >
                  New simulation
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

export default function Home() {
  const [bracket] = useState<BracketType | SimulatedBracket>(BRACKET_2026);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(() =>
    showSim() ? null : NO_SIM_DEFAULT_SELECTED_GAME_ID
  );
  const onSelectGame = useCallback((game: Game) => setSelectedGameId(game.id), []);

  if (showSim()) {
    return <LocalSimHome />;
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col overflow-hidden bg-[#ececec] lg:flex-row relative">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:w-[72%] lg:shrink-0">
        <div className="min-h-0 flex-1 overflow-auto bg-[#ececec]">
          <div className="min-w-max p-3 pb-8">
            <CompressedBracket
              bracket={bracket}
              selectedGameId={selectedGameId}
              onSelectGame={onSelectGame}
            />
          </div>
        </div>
      </div>
      <ProductionAside bracket={bracket} selectedGameId={selectedGameId} />
    </div>
  );
}
