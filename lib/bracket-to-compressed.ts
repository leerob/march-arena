import type { Bracket, Game, RegionName, SimulatedBracket, Team } from "@/lib/bracket-data";
import { placeholderGame, TBD_TEAM } from "@/lib/bracket-data";
import { FIRST_FOUR_SLOTS } from "@/lib/simulation-shared";
import type { CompressedRegionData } from "@/lib/bracket-2025";

const REGION_PREFIX: Record<RegionName, string> = {
  SOUTH: "s",
  WEST: "w",
  EAST: "e",
  MIDWEST: "m",
};

function relabel(game: Game, id: string): Game {
  return { ...game, id };
}

/** Advancing team once a feeder game is final; otherwise keep downstream slot as-is (usually TBD). */
function winnerFromFeeder(feeder: Game): Team | undefined {
  if (feeder.winner == null) return undefined;
  return feeder.winner === 1 ? feeder.team1 : feeder.team2;
}

function hydrateMatchupFromFeeders(game: Game, feeder1: Game, feeder2: Game): Game {
  const t1 = winnerFromFeeder(feeder1);
  const t2 = winnerFromFeeder(feeder2);
  return {
    ...game,
    team1: t1 ?? game.team1,
    team2: t2 ?? game.team2,
  };
}

function hydrateRegionAdvancement(region: CompressedRegionData): void {
  for (let i = 0; i < region.r32.length; i++) {
    region.r32[i] = hydrateMatchupFromFeeders(
      region.r32[i],
      region.r64[2 * i]!,
      region.r64[2 * i + 1]!
    );
  }
  for (let i = 0; i < region.s16.length; i++) {
    region.s16[i] = hydrateMatchupFromFeeders(
      region.s16[i],
      region.r32[2 * i]!,
      region.r32[2 * i + 1]!
    );
  }
  region.e8 = hydrateMatchupFromFeeders(region.e8, region.s16[0]!, region.s16[1]!);
}

function regionToCompressed(
  name: RegionName,
  label: string,
  rounds: Game[][]
): CompressedRegionData {
  const p = REGION_PREFIX[name];
  const r64 = (rounds[0] ?? []).map((g, i) => relabel(g, `${p}-r64-${i + 1}`));
  const r32 = (rounds[1] ?? []).map((g, i) => relabel(g, `${p}-r32-${i + 1}`));
  const s16 = (rounds[2] ?? []).map((g, i) => relabel(g, `${p}-s16-${i + 1}`));
  const e8Game = rounds[3]?.[0] ?? placeholderGame(`${p}-e8`);
  const e8 = relabel(e8Game, `${p}-e8`);
  return { name, label, r64, r32, s16, e8 };
}

const REGION_LABEL: Record<RegionName, string> = {
  SOUTH: "South",
  WEST: "West",
  EAST: "East",
  MIDWEST: "Midwest",
};

export interface CompressedBracketModel {
  south: CompressedRegionData;
  west: CompressedRegionData;
  east: CompressedRegionData;
  midwest: CompressedRegionData;
  firstFour: Game[];
  finalFourLeft: Game;
  finalFourRight: Game;
  championship: Game;
  firstFourDate: string;
  finalFourDate: string;
  championshipDate: string;
}

function getRegion(bracket: Bracket | SimulatedBracket, name: RegionName) {
  const r = bracket.regions.find((reg) => reg.name === name);
  if (!r) {
    throw new Error(`Missing region ${name}`);
  }
  return r;
}

/**
 * Maps canonical bracket tree to ESPN-style compressed layout ids (s-r64-1, …)
 * for stable grid keys. Pairing (2026 NCAA): FF left = East vs South, right = West vs Midwest.
 */
export function bracketToCompressedModel(
  bracket: Bracket | SimulatedBracket
): CompressedBracketModel {
  const south = getRegion(bracket, "SOUTH");
  const west = getRegion(bracket, "WEST");
  const east = getRegion(bracket, "EAST");
  const midwest = getRegion(bracket, "MIDWEST");

  const firstFourGames = bracket.firstFour.map((g, i) =>
    relabel(g, `ff-play-${i + 1}`)
  );

  const ff0 = bracket.finalFour[0] ?? placeholderGame("ff-east-south");
  const ff1 = bracket.finalFour[1] ?? placeholderGame("ff-west-midwest");
  const finalFourLeft = relabel(ff0, "ff-compressed-l");
  const finalFourRight = relabel(ff1, "ff-compressed-r");
  const champ =
    bracket.championship != null
      ? relabel(bracket.championship, "champ-compressed")
      : placeholderGame("champ-compressed");

  const schedule = bracket.schedule;
  const firstFourDate = schedule?.firstFour.dates ?? "TBD";
  const finalFourDate = schedule?.finalFour.date ?? "TBD";
  const championshipDate = schedule?.championship.date ?? "TBD";

  // Build regions in bracket.regions order: SOUTH(0), EAST(1), WEST(2), MIDWEST(3)
  const compressedRegions = [
    regionToCompressed("SOUTH", REGION_LABEL.SOUTH, south.rounds),
    regionToCompressed("EAST", REGION_LABEL.EAST, east.rounds),
    regionToCompressed("WEST", REGION_LABEL.WEST, west.rounds),
    regionToCompressed("MIDWEST", REGION_LABEL.MIDWEST, midwest.rounds),
  ];

  // R64 games fed by a First Four matchup show TBD until that game is resolved
  FIRST_FOUR_SLOTS.forEach((slot, ffIdx) => {
    const ffGame = bracket.firstFour[ffIdx];
    if (!ffGame.winner) {
      const region = compressedRegions[slot.region];
      const game = region.r64[slot.gameIndex];
      if (slot.slot === 1) {
        region.r64[slot.gameIndex] = { ...game, team1: TBD_TEAM };
      } else {
        region.r64[slot.gameIndex] = { ...game, team2: TBD_TEAM };
      }
    }
  });

  const [southC, eastC, westC, midwestC] = compressedRegions;
  for (const r of compressedRegions) {
    hydrateRegionAdvancement(r);
  }

  const ffL = hydrateMatchupFromFeeders(finalFourLeft, eastC.e8, southC.e8);
  const ffR = hydrateMatchupFromFeeders(finalFourRight, westC.e8, midwestC.e8);
  const championship = hydrateMatchupFromFeeders(champ, ffL, ffR);

  return {
    south: southC,
    east: eastC,
    west: westC,
    midwest: midwestC,
    firstFour: firstFourGames,
    finalFourLeft: ffL,
    finalFourRight: ffR,
    championship,
    firstFourDate,
    finalFourDate,
    championshipDate,
  };
}

/** Default sidebar selection when sim UI is off (South 1-seed R64, e.g. Florida vs 16). */
export const NO_SIM_DEFAULT_SELECTED_GAME_ID = "s-r64-1";

/** Stable iteration order for compressed-layout games (matches grid / selection). */
export function compressedModelGamePool(m: CompressedBracketModel): Game[] {
  return [
    ...m.firstFour,
    ...m.south.r64,
    ...m.south.r32,
    ...m.south.s16,
    m.south.e8,
    ...m.west.r64,
    ...m.west.r32,
    ...m.west.s16,
    m.west.e8,
    ...m.east.r64,
    ...m.east.r32,
    ...m.east.s16,
    m.east.e8,
    ...m.midwest.r64,
    ...m.midwest.r32,
    ...m.midwest.s16,
    m.midwest.e8,
    m.finalFourLeft,
    m.finalFourRight,
    m.championship,
  ];
}

/** Game ids currently simulating (`in_progress`), in bracket display order. */
export function getInProgressCompressedGameIds(
  bracket: Bracket | SimulatedBracket
): string[] {
  const m = bracketToCompressedModel(bracket);
  return compressedModelGamePool(m)
    .filter((g) => g.status === "in_progress")
    .map((g) => g.id);
}

/** Resolve a matchup after streaming updates (stable compressed ids). */
export function findCompressedGameById(
  bracket: Bracket | SimulatedBracket,
  id: string | null
): Game | null {
  if (!id) return null;
  const m = bracketToCompressedModel(bracket);
  return compressedModelGamePool(m).find((g) => g.id === id) ?? null;
}
