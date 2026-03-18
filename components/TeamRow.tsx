"use client";

import { useState } from "react";
import type { Team } from "@/lib/bracket-data";
import { getTeamLogoUrl } from "@/lib/bracket-data";

interface TeamRowProps {
  team: Team;
  score?: number;
  isWinner: boolean;
  compact?: boolean;
  /** Wider / 2-line names for compressed bracket cells (avoid ellipsis clipping) */
  compactMultiline?: boolean;
  /** Sim in progress — spinner in logo slot */
  logoLoading?: boolean;
  /** Final game: highlight winning team row with sidebar-matching green */
  winnerRowHighlight?: boolean;
}

export function TeamRow({
  team,
  score,
  isWinner,
  compact = false,
  compactMultiline = false,
  logoLoading = false,
  winnerRowHighlight = false,
}: TeamRowProps) {
  /** CDN pixels (large enough for 2–3× DPR after CSS downscale) */
  const logoSrcSize = compact ? 72 : 96;
  const [logoError, setLogoError] = useState(false);
  const showPlaceholder = team.id <= 0 || logoError;

  return (
    <div
      className={`BracketCell__CompetitorItem flex items-center justify-between ${
        compact
          ? "min-h-[16px] px-1.5 py-[2px] sm:min-h-[17px]"
          : "min-h-[20px] px-1.5 py-0.5"
      } ${winnerRowHighlight && isWinner ? "bg-emerald-500/[0.06]" : ""}`}
    >
      <div className="BracketCell__Competitor flex items-center min-w-0 gap-1">
        <div
          className={`BracketCell__Logo shrink-0 flex items-center justify-center ${compact ? "h-[14px] w-[14px] sm:h-[16px] sm:w-[16px]" : "h-[18px] w-[18px]"}`}
        >
          {logoLoading ? (
            <div
              className="flex h-full w-full items-center justify-center rounded bg-[#e8e9e9]"
              aria-hidden
            >
              <span
                className={`shrink-0 rounded-full border-2 border-[#6c6e6f] border-t-transparent animate-spin ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`}
              />
            </div>
          ) : showPlaceholder ? (
            <div className="w-full h-full rounded bg-[#b5b7b7]" />
          ) : (
            <img
              src={getTeamLogoUrl(team.id, logoSrcSize)}
              alt={team.name}
              width={logoSrcSize}
              height={logoSrcSize}
              className="object-contain w-full h-full"
              onError={() => setLogoError(true)}
            />
          )}
        </div>
        <div
          className={`BracketCell__Rank text-right shrink-0 text-[#9a9c9d] ${
            compact ? "min-w-[10px] text-[9px] sm:min-w-[12px] sm:text-[10px]" : "text-[10px] min-w-[12px]"
          }`}
        >
          {team.seed}
        </div>
        <div
          className={`BracketCell__Name min-w-0 flex-1 ${
            compact && compactMultiline
              ? "line-clamp-2 break-words text-[10px] leading-[1.2] sm:text-[11px]"
              : compact
                ? "max-w-[60px] truncate text-[10px] sm:max-w-[72px] sm:text-[11px]"
                : "truncate text-[12px] max-w-[80px]"
          } ${
            isWinner
              ? "text-[#121213] font-medium"
              : "text-[#121213] font-normal"
          }`}
        >
          {team.name}
        </div>
      </div>

      {score !== undefined && (
        <div
          className={`BracketCell__Score relative shrink-0 font-mono font-bold flex items-center ${
            compact ? "text-[10px] sm:text-[11px]" : "text-[12px]"
          } ${isWinner ? "text-[#121213]" : "text-[#6c6e6f]"}`}
        >
          {score}
        </div>
      )}
    </div>
  );
}
