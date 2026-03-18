"use client";

import type { Game, SimulatedGame, Team } from "@/lib/bracket-data";
import { getTeamLogoUrl } from "@/lib/bracket-data";
import { getMatchupKey, SEED_MATCHUP_STATS } from "@/lib/tournament-context";
import { ensembleWinProbability } from "@/lib/win-probability";
import {
  getFactsForMatchup,
  getFactsForTeam,
  getRoundFactsForBracketGameId,
} from "@/lib/fun-facts";

interface MatchupStatsPanelProps {
  game: Game | SimulatedGame | null;
  /** `panel` = flush sections for sidebar / sheet (no card chrome) */
  variant?: "card" | "panel";
  /** Merge round-relevant tournament facts into Notes (e.g. bracket-espn game ids) */
  includeBracketRoundNotes?: boolean;
}

function TeamHeader({
  team,
  winProbability,
  highlightWinProb,
  panel,
  finalScore,
  showScoresInsteadOfProb,
  /** Finished game: same padding on both rows so winner tint doesn’t shift layout */
  evenFinalRowLayout,
}: {
  team: Team;
  winProbability: number;
  highlightWinProb?: boolean;
  panel?: boolean;
  finalScore?: number;
  showScoresInsteadOfProb?: boolean;
  evenFinalRowLayout?: boolean;
}) {
  const rowClasses = (() => {
    if (evenFinalRowLayout && panel) {
      return [
        "py-2",
        highlightWinProb ? "rounded-lg bg-emerald-500/[0.06]" : "",
      ]
        .filter(Boolean)
        .join(" ");
    }
    if (highlightWinProb && panel) {
      return "rounded-lg bg-emerald-500/[0.06] px-3 py-2.5 -mx-1";
    }
    if (highlightWinProb && !panel) {
      return "rounded-lg bg-[#f0f9f0] px-3 py-2.5 -mx-1";
    }
    return "";
  })();

  return (
    <div className={`flex items-center gap-3 ${rowClasses}`}>
      <img
        src={getTeamLogoUrl(team.id, 48)}
        alt={team.name}
        className="w-12 h-12 shrink-0 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-white bg-[#121213] px-1.5 py-0.5 rounded">
            {team.seed}
          </span>
          <span
            className={`text-[16px] text-[#121213] ${
              highlightWinProb ? "font-bold" : "font-semibold"
            }`}
          >
            {team.name}
          </span>
        </div>
        <div className="text-[12px] text-[#6c6e6f]">
          {team.conference || ""}
          {team.stats && ` • ${team.stats.record.wins}-${team.stats.record.losses}`}
        </div>
      </div>
      <div className="ml-auto shrink-0 text-right">
        {showScoresInsteadOfProb && finalScore !== undefined ? (
          <>
            <div
              className={`text-[24px] tabular-nums ${
                highlightWinProb ? "font-extrabold text-[#121213]" : "font-bold text-[#6c6e6f]"
              }`}
            >
              {finalScore}
            </div>
          </>
        ) : (
          <>
            <div className="text-[24px] font-bold text-[#121213]">
              {Math.round(winProbability * 100)}%
            </div>
            <div className="text-[10px] text-[#6c6e6f] uppercase">Win Prob</div>
          </>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value1,
  value2,
  highlight,
  lowerIsBetter = false,
  panel,
}: {
  label: string;
  value1: string | number;
  value2: string | number;
  highlight?: boolean;
  lowerIsBetter?: boolean;
  panel?: boolean;
}) {
  const num1 = typeof value1 === "number" ? value1 : parseFloat(value1);
  const num2 = typeof value2 === "number" ? value2 : parseFloat(value2);
  const better1 = lowerIsBetter ? num1 < num2 : num1 > num2;
  const better2 = lowerIsBetter ? num2 < num1 : num2 > num1;
  const stripe = panel
    ? highlight
      ? "bg-black/[0.04]"
      : "bg-transparent"
    : highlight
      ? "bg-[#f7f7f7]"
      : "";

  return (
    <div className={`flex items-center py-2 px-0.5 ${stripe}`}>
      <div
        className={`flex-1 text-right pr-4 text-[14px] ${
          better1 ? "font-semibold text-[#121213]" : "text-[#6c6e6f]"
        }`}
      >
        {value1}
      </div>
      <div className="w-24 text-center text-[12px] text-[#6c6e6f] uppercase">
        {label}
      </div>
      <div
        className={`flex-1 text-left pl-4 text-[14px] ${
          better2 ? "font-semibold text-[#121213]" : "text-[#6c6e6f]"
        }`}
      >
        {value2}
      </div>
    </div>
  );
}

export function MatchupStatsPanel({
  game,
  variant = "card",
  includeBracketRoundNotes = false,
}: MatchupStatsPanelProps) {
  const panel = variant === "panel";

  if (!game) {
    if (panel) {
      return (
        <div className="px-2 py-10 text-center sm:px-3">
          <p className="text-[13px] font-medium text-[#121213]">
            Select a matchup
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#6c6e6f]">
            Click any game on the bracket for stats, win probability, and
            history.
          </p>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[#dcdddf] p-6">
        <div className="text-center text-[#6c6e6f]">
          <div className="text-[14px] mb-2">Select a matchup to view details</div>
          <div className="text-[12px]">
            Click on any game in the bracket to see statistics, win probabilities,
            and historical data.
          </div>
        </div>
      </div>
    );
  }

  const { team1, team2 } = game;
  const stats1 = team1.stats;
  const stats2 = team2.stats;
  const winProb1 = ensembleWinProbability(team1, team2);
  const winProb2 = 1 - winProb1;

  // Get historical matchup data
  const matchupKey = getMatchupKey(team1.seed, team2.seed);
  const matchupStats = SEED_MATCHUP_STATS[matchupKey];

  // Get fun facts
  const matchupFacts = getFactsForMatchup(team1.seed, team2.seed);
  const team1Facts = getFactsForTeam(team1.name);
  const team2Facts = getFactsForTeam(team2.name);
  const roundFacts = includeBracketRoundNotes
    ? getRoundFactsForBracketGameId(game.id)
    : [];
  const mergedNotes = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const f of [...roundFacts.slice(0, 2), ...matchupFacts, ...team1Facts.slice(0, 1), ...team2Facts.slice(0, 1)]) {
      if (!seen.has(f)) {
        seen.add(f);
        out.push(f);
      }
    }
    return out;
  })();

  // Check if game is completed
  const isCompleted = "winner" in game && game.winner !== undefined;
  const isFinalWithScores =
    game.status === "final" &&
    game.score1 !== undefined &&
    game.score2 !== undefined;
  const reasoning = "reasoning" in game ? game.reasoning : undefined;

  const shell = panel
    ? "overflow-hidden"
    : "bg-white rounded-lg shadow-sm border border-[#dcdddf] overflow-hidden";
  const sectionBorder = panel ? "border-[#e4e5e7]" : "border-[#dcdddf]";
  /** Sidebar panel: minimal horizontal inset so matchup uses full rail width */
  const sectionPad = panel ? "px-2 py-4 sm:px-2.5" : "p-4";
  const labelClass = panel
    ? "text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b8d8f]"
    : "text-[12px] text-[#6c6e6f] uppercase tracking-wide";

  return (
    <div className={shell}>
      <div className={`${sectionPad} border-b ${sectionBorder}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className={labelClass}>Matchup</div>
          {isFinalWithScores && (
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#121213]">
              {game.statusLabel ?? "Final"}
            </span>
          )}
        </div>

        <div className="mb-4">
          <TeamHeader
            team={team1}
            winProbability={winProb1}
            highlightWinProb={Boolean(isCompleted && game.winner === 1)}
            panel={panel}
            finalScore={game.score1}
            showScoresInsteadOfProb={isFinalWithScores}
            evenFinalRowLayout={Boolean(panel && isFinalWithScores)}
          />
        </div>

        <div className="flex items-center gap-3 my-3">
          <div className={`flex-1 h-px ${panel ? "bg-[#e4e5e7]" : "bg-[#dcdddf]"}`} />
          <span className="text-[11px] font-medium text-[#8b8d8f]">vs</span>
          <div className={`flex-1 h-px ${panel ? "bg-[#e4e5e7]" : "bg-[#dcdddf]"}`} />
        </div>

        <div>
          <TeamHeader
            team={team2}
            winProbability={winProb2}
            highlightWinProb={Boolean(isCompleted && game.winner === 2)}
            panel={panel}
            finalScore={game.score2}
            showScoresInsteadOfProb={isFinalWithScores}
            evenFinalRowLayout={Boolean(panel && isFinalWithScores)}
          />
        </div>
        {isCompleted && reasoning && (
          <p className={`mt-4 border-t pt-3 text-[12px] italic leading-relaxed ${panel ? "border-[#e4e5e7] text-[#5c5e61]" : "border-[#eee] text-[#4a4a4a]"}`}>
            &ldquo;{reasoning}&rdquo;
          </p>
        )}
      </div>

      {stats1 && stats2 && (
        <div className={`${sectionPad} border-b ${sectionBorder}`}>
          <div className={`${labelClass} mb-3`}>KenPom</div>
          <div className={panel ? "divide-y divide-[#e4e5e7]" : "divide-y divide-[#eee]"}>
            <StatRow
              label="KenPom Rank"
              value1={`#${stats1.kenpomRank}`}
              value2={`#${stats2.kenpomRank}`}
              lowerIsBetter
              highlight
              panel={panel}
            />
            <StatRow
              label="Adj. EM"
              value1={stats1.adjEM > 0 ? `+${stats1.adjEM.toFixed(1)}` : stats1.adjEM.toFixed(1)}
              value2={stats2.adjEM > 0 ? `+${stats2.adjEM.toFixed(1)}` : stats2.adjEM.toFixed(1)}
              panel={panel}
            />
            <StatRow
              label="Adj. Offense"
              value1={`${stats1.adjO.toFixed(1)} (#${stats1.adjORank})`}
              value2={`${stats2.adjO.toFixed(1)} (#${stats2.adjORank})`}
              highlight
              panel={panel}
            />
            <StatRow
              label="Adj. Defense"
              value1={`${stats1.adjD.toFixed(1)} (#${stats1.adjDRank})`}
              value2={`${stats2.adjD.toFixed(1)} (#${stats2.adjDRank})`}
              lowerIsBetter
              panel={panel}
            />
            <StatRow
              label="Tempo"
              value1={stats1.adjTempo.toFixed(1)}
              value2={stats2.adjTempo.toFixed(1)}
              highlight
              panel={panel}
            />
            <StatRow
              label="SOS EM"
              value1={stats1.sosEM > 0 ? `+${stats1.sosEM.toFixed(1)}` : stats1.sosEM.toFixed(1)}
              value2={stats2.sosEM > 0 ? `+${stats2.sosEM.toFixed(1)}` : stats2.sosEM.toFixed(1)}
              panel={panel}
            />
            <StatRow
              label="Luck"
              value1={stats1.luck > 0 ? `+${stats1.luck.toFixed(3)}` : stats1.luck.toFixed(3)}
              value2={stats2.luck > 0 ? `+${stats2.luck.toFixed(3)}` : stats2.luck.toFixed(3)}
              lowerIsBetter
              highlight
              panel={panel}
            />
          </div>
        </div>
      )}

      {matchupStats && (
        <div className={`${sectionPad} border-b ${sectionBorder}`}>
          <div className={`${labelClass} mb-3`}>
            History · {matchupKey.toUpperCase()}
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[#121213]">
                Higher seed ({Math.min(team1.seed, team2.seed)})
              </span>
              <span className="text-[#121213]">
                Lower seed ({Math.max(team1.seed, team2.seed)})
              </span>
            </div>
            <div className="h-3 bg-[#dcdddf] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#0066cc]"
                style={{ width: `${(1 - matchupStats.upsetRate) * 100}%` }}
              />
              <div
                className="h-full bg-[#d00]"
                style={{ width: `${matchupStats.upsetRate * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#6c6e6f] mt-1">
              <span>{Math.round((1 - matchupStats.upsetRate) * 100)}%</span>
              <span>{Math.round(matchupStats.upsetRate * 100)}%</span>
            </div>
          </div>
          
          <div className="text-[13px] text-[#4a4a4a]">
            {matchupStats.note}
          </div>
        </div>
      )}

      {mergedNotes.length > 0 && (
        <div className={sectionPad}>
          <div className={`${labelClass} mb-3`}>Notes</div>
          <ul className="space-y-2.5">
            {mergedNotes.slice(0, 5).map((fact, i) => (
              <li
                key={i}
                className={`flex gap-2 text-[13px] leading-snug ${
                  panel ? "text-[#3d3d3d]" : "text-[#4a4a4a]"
                }`}
              >
                <span className="shrink-0 text-[#0066cc]">·</span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
