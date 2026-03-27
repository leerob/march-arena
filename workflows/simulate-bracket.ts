import { getWritable } from "workflow";
import {
  type Bracket,
  type Game,
  type SimulatedBracket,
  type SimulatedGame,
  type Team,
  placeholderGame,
} from "@/lib/bracket-data";
import {
  buildWorkflowStreamPayload,
  FIRST_FOUR_SLOTS,
  placeholderRoundsFrom,
  type SimulationProgress,
  type SimulationStage,
} from "@/lib/simulation-shared";
import {
  type GameContext,
  type TournamentContext,
  ROUND_NAMES,
  SIM_GAME_CONCURRENCY,
  getLocationContext,
  getNextRegionalLine,
  getWinner,
  simulateGameWithAI,
  updateTournamentContext,
} from "@/lib/ai-pick";

function patchRoundById(round: Game[], id: string, next: Game): Game[] {
  return round.map((g) => (g.id === id ? next : g));
}

function cloneDisplay(d: Game[][][]): Game[][][] {
  return d.map((rounds) => rounds.map((round) => round.map((g) => ({ ...g }))));
}

const FF_PLACEHOLDERS: Game[] = [
  placeholderGame("ff-east-south"),
  placeholderGame("ff-west-midwest"),
];
const CHAMP_PLACEHOLDER = placeholderGame("champ");

export async function simulateBracket(bracket: Bracket): Promise<SimulatedBracket> {
  "use workflow";

  const writable = getWritable<string>();
  const completedStages: SimulationStage[] = [];
  let tournamentContext: TournamentContext = {
    upsets: [],
    eliminatedTeams: [],
    cinderellaTeams: [],
    chalkPicks: 0,
    upsetPicks: 0,
    gamesPlayed: 0,
  };

  // ── 1. First Four ──────────────────────────────────────────────────
  const regionDisplayDuringFF = bracket.regions.map((region) => [
    region.rounds[0].map((g) => ({ ...g, status: "scheduled" as const })),
    ...placeholderRoundsFrom(region, 1),
  ]);

  const firstFourStepResult = await simulateFirstFourRound(
    writable,
    bracket.firstFour.map((g) => ({ ...g, status: "scheduled" as const })),
    {
      roundName: "First Four",
      location: getLocationContext(bracket.schedule, "firstFour"),
    },
    bracket,
    regionDisplayDuringFF,
    [...completedStages],
    tournamentContext,
    SIM_GAME_CONCURRENCY,
  );
  const firstFourResults = firstFourStepResult.results;
  tournamentContext = firstFourStepResult.tournamentContext;
  completedStages.push("first-four");

  // ── 2. Build Round 0 games with First Four winners ─────────────────
  const round0Games: Game[][] = bracket.regions.map((region, regionIdx) => {
    const games = region.rounds[0].map((g) => ({ ...g, status: "scheduled" as const }));
    FIRST_FOUR_SLOTS.forEach((slot, ffIdx) => {
      if (slot.region === regionIdx) {
        const game = games[slot.gameIndex];
        const winner = getWinner(bracket.firstFour[ffIdx], firstFourResults[ffIdx].winner!);
        games[slot.gameIndex] = slot.slot === 1
          ? { ...game, team1: winner }
          : { ...game, team2: winner };
      }
    });
    return games;
  });

  let regionDisplay: Game[][][] = bracket.regions.map((region, ri) => [
    round0Games[ri].map((g) => ({ ...g })),
    ...placeholderRoundsFrom(region, 1),
  ]);

  await emitProgress(writable, buildWorkflowStreamPayload(
    bracket, firstFourResults, cloneDisplay(regionDisplay),
    FF_PLACEHOLDERS.map((g) => ({ ...g })),
    { ...CHAMP_PLACEHOLDER },
    "first-four", [...completedStages],
  ));

  // ── 3. Regional rounds (R64 → Elite Eight) ────────────────────────
  for (let roundIdx = 0; roundIdx <= 3; roundIdx++) {
    const stage: SimulationStage =
      roundIdx === 0 ? "south" : roundIdx >= 2 ? "midwest" : "east";

    let roundGames: Game[][];
    if (roundIdx === 0) {
      roundGames = round0Games;
    } else {
      roundGames = bracket.regions.map((region, ri) => {
        const prev = regionDisplay[ri][roundIdx - 1] as SimulatedGame[];
        return Array.from({ length: region.rounds[roundIdx].length }, (_, i) => {
          const template = region.rounds[roundIdx][i];
          return {
            ...template,
            status: "scheduled" as const,
            team1: getWinner(prev[2 * i], prev[2 * i].winner!),
            team2: getWinner(prev[2 * i + 1], prev[2 * i + 1].winner!),
          };
        });
      });
      bracket.regions.forEach((_, ri) => {
        regionDisplay[ri][roundIdx] = roundGames[ri].map((g) => ({ ...g }));
      });
    }

    const roundType =
      roundIdx === 2 ? "sweet16" : roundIdx === 3 ? "elite8" : undefined;
    const openingRoundType =
      roundIdx <= 1 ? (roundIdx === 0 ? "firstRound" : "secondRound") : undefined;

    const jobs = bracket.regions.flatMap((region, regionIdx) =>
      roundGames[regionIdx].map((game) => ({
        game,
        regionIdx,
        context: {
          roundName: ROUND_NAMES[roundIdx],
          regionName: region.name,
          location: roundType
            ? getLocationContext(bracket.schedule, roundType, region.name)
            : openingRoundType
              ? getLocationContext(bracket.schedule, openingRoundType, region.name, game.id)
              : undefined,
          nextRegionalSite:
            openingRoundType && bracket.schedule
              ? getNextRegionalLine(bracket.schedule, region.name)
              : undefined,
        } as GameContext,
      }))
    );

    const roundResult = await simulateRegionalRound(
      writable, roundIdx, jobs, regionDisplay, bracket, firstFourResults,
      stage, [...completedStages], tournamentContext, SIM_GAME_CONCURRENCY,
    );
    regionDisplay = roundResult.regionDisplay;
    tournamentContext = roundResult.tournamentContext;
  }

  // ── 4. Extract region winners ──────────────────────────────────────
  const regionWinners: Team[] = bracket.regions.map((_, ri) => {
    const game = regionDisplay[ri][3][0] as SimulatedGame;
    return getWinner(game, game.winner!);
  });
  completedStages.push("south", "east", "west", "midwest");

  // ── 5. Finals ──────────────────────────────────────────────────────
  // 2026 NCAA: 1-seed region (East) vs 4-seed region (South); 2 (West) vs 3 (Midwest)
  const finalFourGames: Game[] = [
    {
      id: "ff-east-south",
      status: "scheduled",
      team1: regionWinners[1],
      team2: regionWinners[0],
    },
    {
      id: "ff-west-midwest",
      status: "scheduled",
      team1: regionWinners[2],
      team2: regionWinners[3],
    },
  ];

  const finalsResult = await simulateFinalsRound(
    writable,
    finalFourGames,
    {
      roundName: "Final Four",
      location: getLocationContext(bracket.schedule, "finalFour"),
    },
    {
      roundName: "National Championship",
      location: getLocationContext(bracket.schedule, "championship"),
    },
    regionDisplay,
    bracket,
    firstFourResults,
    [...completedStages],
    tournamentContext,
  );

  completedStages.push("finals");

  // ── 6. Final emission with winner ──────────────────────────────────
  await emitProgress(writable, {
    ...buildWorkflowStreamPayload(
      bracket,
      firstFourResults,
      cloneDisplay(regionDisplay),
      finalsResult.finalFourResults.map((g) => ({ ...g })),
      { ...finalsResult.championship },
      "finals",
      completedStages,
    ),
    winner: finalsResult.winner,
  });
  await closeProgressStream(writable);

  // ── Build return value ─────────────────────────────────────────────
  return {
    year: bracket.year,
    schedule: bracket.schedule,
    firstFour: firstFourResults,
    regions: bracket.regions.map((region, ri) => ({
      ...region,
      rounds: regionDisplay[ri].map((round) =>
        round.map((g) => ({ ...g, status: "final" as const }))
      ) as SimulatedGame[][],
    })),
    finalFour: finalsResult.finalFourResults,
    championship: finalsResult.championship,
    winner: finalsResult.winner,
  };
}

// ══════════════════════════════════════════════════════════════════════
// Step: Simulate all First Four games (1 step for 4 games)
// ══════════════════════════════════════════════════════════════════════

async function simulateFirstFourRound(
  writable: WritableStream<string>,
  games: Game[],
  baseContext: { roundName: string; location?: string },
  bracket: Bracket,
  regionDisplayDuringFF: Game[][][],
  completedStages: SimulationStage[],
  tournamentContext: TournamentContext,
  concurrency: number,
): Promise<{
  results: SimulatedGame[];
  tournamentContext: TournamentContext;
}> {
  "use step";

  const display = games.map((g) => ({ ...g }));
  const ctx = JSON.parse(JSON.stringify(tournamentContext)) as TournamentContext;
  const results: SimulatedGame[] = [];

  for (let i = 0; i < games.length; i += concurrency) {
    const chunk = games.slice(i, i + concurrency);

    chunk.forEach((game, j) => {
      display[i + j] = { ...game, status: "in_progress" };
    });

    let writer = writable.getWriter();
    await writer.write(JSON.stringify(buildWorkflowStreamPayload(
      bracket,
      display.map((g) => ({ ...g })),
      cloneDisplay(regionDisplayDuringFF),
      FF_PLACEHOLDERS.map((g) => ({ ...g })),
      { ...CHAMP_PLACEHOLDER },
      "first-four", [...completedStages],
    )) + "\n");
    writer.releaseLock();

    const chunkRes = await Promise.all(
      chunk.map((game) =>
        simulateGameWithAI(game, { ...baseContext, tournamentContext: ctx })
      )
    );

    chunkRes.forEach((res, j) => {
      display[i + j] = { ...res, status: "final" as const };
      results.push(res);
      updateTournamentContext(ctx, chunk[j], res, "First Four");
    });

    writer = writable.getWriter();
    await writer.write(JSON.stringify(buildWorkflowStreamPayload(
      bracket,
      display.map((g) => ({ ...g })),
      cloneDisplay(regionDisplayDuringFF),
      FF_PLACEHOLDERS.map((g) => ({ ...g })),
      { ...CHAMP_PLACEHOLDER },
      "first-four", [...completedStages],
    )) + "\n");
    writer.releaseLock();
  }

  return { results, tournamentContext: ctx };
}

// ══════════════════════════════════════════════════════════════════════
// Step: Simulate one regional round across all 4 regions (1 step per round)
// ══════════════════════════════════════════════════════════════════════

async function simulateRegionalRound(
  writable: WritableStream<string>,
  roundIdx: number,
  jobs: Array<{ game: Game; regionIdx: number; context: GameContext }>,
  regionDisplay: Game[][][],
  bracket: Bracket,
  firstFourResults: SimulatedGame[],
  stage: SimulationStage,
  completedStages: SimulationStage[],
  tournamentContext: TournamentContext,
  concurrency: number,
): Promise<{
  regionDisplay: Game[][][];
  tournamentContext: TournamentContext;
}> {
  "use step";

  const display = cloneDisplay(regionDisplay);
  const ctx = JSON.parse(JSON.stringify(tournamentContext)) as TournamentContext;

  let writer = writable.getWriter();
  await writer.write(JSON.stringify(buildWorkflowStreamPayload(
    bracket, firstFourResults, cloneDisplay(display),
    FF_PLACEHOLDERS.map((g) => ({ ...g })),
    { ...CHAMP_PLACEHOLDER },
    stage, [...completedStages],
  )) + "\n");
  writer.releaseLock();

  for (let i = 0; i < jobs.length; i += concurrency) {
    const chunk = jobs.slice(i, i + concurrency);

    for (const job of chunk) {
      display[job.regionIdx][roundIdx] = patchRoundById(
        display[job.regionIdx][roundIdx],
        job.game.id,
        { ...job.game, status: "in_progress" },
      );
    }

    writer = writable.getWriter();
    await writer.write(JSON.stringify(buildWorkflowStreamPayload(
      bracket, firstFourResults, cloneDisplay(display),
      FF_PLACEHOLDERS.map((g) => ({ ...g })),
      { ...CHAMP_PLACEHOLDER },
      stage, [...completedStages],
    )) + "\n");
    writer.releaseLock();

    const results = await Promise.all(
      chunk.map((j) =>
        simulateGameWithAI(j.game, { ...j.context, tournamentContext: ctx })
      )
    );

    chunk.forEach((job, j) => {
      display[job.regionIdx][roundIdx] = patchRoundById(
        display[job.regionIdx][roundIdx],
        job.game.id,
        { ...results[j], status: "final" as const },
      );
      updateTournamentContext(ctx, job.game, results[j], ROUND_NAMES[roundIdx]);
    });

    writer = writable.getWriter();
    await writer.write(JSON.stringify(buildWorkflowStreamPayload(
      bracket, firstFourResults, cloneDisplay(display),
      FF_PLACEHOLDERS.map((g) => ({ ...g })),
      { ...CHAMP_PLACEHOLDER },
      stage, [...completedStages],
    )) + "\n");
    writer.releaseLock();
  }

  return { regionDisplay: display, tournamentContext: ctx };
}

// ══════════════════════════════════════════════════════════════════════
// Step: Simulate Final Four + Championship (1 step for 3 games)
// ══════════════════════════════════════════════════════════════════════

async function simulateFinalsRound(
  writable: WritableStream<string>,
  finalFourGames: Game[],
  finalFourBaseContext: { roundName: string; location?: string },
  championshipBaseContext: { roundName: string; location?: string },
  regionDisplay: Game[][][],
  bracket: Bracket,
  firstFourResults: SimulatedGame[],
  completedStages: SimulationStage[],
  tournamentContext: TournamentContext,
): Promise<{
  finalFourResults: SimulatedGame[];
  championship: SimulatedGame;
  winner: Team;
  tournamentContext: TournamentContext;
}> {
  "use step";

  const display = cloneDisplay(regionDisplay);
  const ctx = JSON.parse(JSON.stringify(tournamentContext)) as TournamentContext;

  let ffDisplay: Game[] = finalFourGames.map((g) => ({ ...g }));
  let champDisplay: Game = { ...CHAMP_PLACEHOLDER };

  let writer = writable.getWriter();
  await writer.write(JSON.stringify(buildWorkflowStreamPayload(
    bracket, firstFourResults, cloneDisplay(display),
    ffDisplay.map((g) => ({ ...g })),
    { ...champDisplay },
    "finals", [...completedStages],
  )) + "\n");
  writer.releaseLock();

  const finalFourResults: SimulatedGame[] = [];
  for (let fi = 0; fi < 2; fi++) {
    ffDisplay = ffDisplay.map((g, idx) =>
      idx === fi ? { ...g, status: "in_progress" as const } : g
    );

    writer = writable.getWriter();
    await writer.write(JSON.stringify(buildWorkflowStreamPayload(
      bracket, firstFourResults, cloneDisplay(display),
      ffDisplay.map((g) => ({ ...g })),
      { ...champDisplay },
      "finals", [...completedStages],
    )) + "\n");
    writer.releaseLock();

    const res = await simulateGameWithAI(finalFourGames[fi], {
      ...finalFourBaseContext,
      tournamentContext: ctx,
    });
    finalFourResults.push(res);
    updateTournamentContext(ctx, finalFourGames[fi], res, "Final Four");

    ffDisplay = ffDisplay.map((g, idx) =>
      idx === fi ? { ...res, status: "final" as const } : g
    );

    writer = writable.getWriter();
    await writer.write(JSON.stringify(buildWorkflowStreamPayload(
      bracket, firstFourResults, cloneDisplay(display),
      ffDisplay.map((g) => ({ ...g })),
      { ...champDisplay },
      "finals", [...completedStages],
    )) + "\n");
    writer.releaseLock();
  }

  const championshipGame: Game = {
    id: "champ",
    status: "scheduled",
    team1: getWinner(finalFourGames[0], finalFourResults[0].winner!),
    team2: getWinner(finalFourGames[1], finalFourResults[1].winner!),
  };

  champDisplay = { ...championshipGame, status: "in_progress" };
  writer = writable.getWriter();
  await writer.write(JSON.stringify(buildWorkflowStreamPayload(
    bracket, firstFourResults, cloneDisplay(display),
    ffDisplay.map((g) => ({ ...g })),
    { ...champDisplay },
    "finals", [...completedStages],
  )) + "\n");
  writer.releaseLock();

  const championshipResult = await simulateGameWithAI(championshipGame, {
    ...championshipBaseContext,
    tournamentContext: ctx,
  });
  const winner = getWinner(championshipGame, championshipResult.winner!);

  return {
    finalFourResults: ffDisplay as SimulatedGame[],
    championship: { ...championshipResult, status: "final" as const },
    winner,
    tournamentContext: ctx,
  };
}

// ══════════════════════════════════════════════════════════════════════
// Utility steps (lightweight, called sparingly)
// ══════════════════════════════════════════════════════════════════════

async function emitProgress(writable: WritableStream<string>, update: SimulationProgress): Promise<void> {
  "use step";

  const writer = writable.getWriter();
  await writer.write(JSON.stringify(update) + "\n");
  writer.releaseLock();
}

async function closeProgressStream(writable: WritableStream<string>): Promise<void> {
  "use step";

  await writable.close();
}
