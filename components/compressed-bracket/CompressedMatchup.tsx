"use client";

import type { Game } from "@/lib/bracket-data";
import { TeamRow } from "@/components/TeamRow";
import styles from "./compressed-bracket.module.css";

export function CompressedMatchup({
  game,
  className = "",
  selected = false,
  onSelect,
  variant = "inner",
}: {
  game: Game;
  className?: string;
  selected?: boolean;
  onSelect?: (game: Game) => void;
  variant?: "outer" | "inner" | "center";
}) {
  const w = game.winner;
  const s1 = game.score1;
  const s2 = game.score2;
  const showScores = game.status === "final" && s1 !== undefined && s2 !== undefined;
  const logoLoading = game.status === "in_progress";
  const interactive = Boolean(onSelect);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      data-matchup-selectable={interactive ? "" : undefined}
      data-game-id={game.id}
      onClick={interactive ? () => onSelect?.(game) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(game);
              }
            }
          : undefined
      }
      className={`${styles.matchupCard} ${
        variant === "outer"
          ? styles.matchupOuter
          : variant === "center"
            ? styles.matchupCenter
            : styles.matchupInner
      } ${selected ? styles.matchupSelected : ""} ${interactive ? styles.matchupInteractive : ""} ${className}`.trim()}
    >
      <TeamRow
        team={game.team1}
        score={showScores ? s1 : undefined}
        isWinner={w === 1}
        compact
        compactMultiline
        logoLoading={logoLoading}
        winnerRowHighlight={showScores}
      />
      <div className={styles.matchupDivider} aria-hidden />
      <TeamRow
        team={game.team2}
        score={showScores ? s2 : undefined}
        isWinner={w === 2}
        compact
        compactMultiline
        logoLoading={logoLoading}
        winnerRowHighlight={showScores}
      />
    </div>
  );
}
