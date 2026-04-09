// ESPN team ID reference: https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams

import { getKenpomRating } from "./kenpom-data";

/** KenPom-derived statistical profile for a team */
export interface TeamStats {
  kenpomRank: number;
  /** Adjusted Efficiency Margin (points per 100 possessions above average) */
  adjEM: number;
  /** Adjusted Offensive Efficiency */
  adjO: number;
  adjORank: number;
  /** Adjusted Defensive Efficiency (lower = better) */
  adjD: number;
  adjDRank: number;
  /** Adjusted Tempo (possessions per game) */
  adjTempo: number;
  /** Win-Loss record */
  record: { wins: number; losses: number };
  /** Strength of Schedule (efficiency margin) */
  sosEM: number;
  /** Luck rating (positive = luckier than expected) */
  luck: number;
}

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  seed: number;
  /** Power conference, e.g. "Big Ten", "SEC", "Big 12" */
  conference?: string;
  /** Program caliber for tournament experience/prestige */
  teamTier?: "blueblood" | "power" | "mid-major" | "low-major";
  /** How well fans travel to neutral sites */
  fanBaseStrength?: "elite" | "strong" | "average" | "weak";
  /** Campus location for proximity/geographic advantage */
  location?: { city: string; state: string };
  /** KenPom statistical data */
  stats?: TeamStats;
}

export interface Game {
  id: string;
  status: "scheduled" | "in_progress" | "final";
  team1: Team;
  team2: Team;
  score1?: number;
  score2?: number;
  winner?: 1 | 2;
  statusLabel?: string; // e.g. "Final", "Final/OT"
}

export type RegionName = "SOUTH" | "EAST" | "WEST" | "MIDWEST";

export interface Region {
  name: RegionName;
  rounds: Game[][];
}

// Tournament venue/location data for prompts
export interface Venue {
  city: string;
  state: string;
  arena: string;
}

export interface TournamentSchedule {
  selectionSunday: string;
  firstFour: { dates: string; venue: Venue };
  firstSecondRound: {
    dates: string[];
    venues: Venue[];
  };
  regionals: {
    [key in RegionName]: {
      dates: string;
      venue: Venue;
    };
  };
  finalFour: { date: string; venue: Venue };
  championship: { date: string; venue: Venue };
}

export interface Bracket {
  year: number;
  regions: Region[];
  finalFour: Game[];
  championship: Game | null;
  firstFour: Game[];
  schedule?: TournamentSchedule;
}

export interface SimulatedGame extends Game {
  reasoning?: string;
}

export interface SimulatedBracket {
  year: number;
  firstFour: SimulatedGame[];
  regions: Region[];
  finalFour: SimulatedGame[];
  championship: SimulatedGame | null;
  winner: Team;
  schedule?: TournamentSchedule;
}

/**
 * ESPN combiner logo URL. Use `size` ≥ 2× the displayed CSS px for sharp retina rendering.
 * Source art is 500×500; 64–128 is a good range for small UI slots.
 */
export function getTeamLogoUrl(
  teamId: number,
  size = 64,
  quality: number = 90
): string {
  const q = Math.min(100, Math.max(1, Math.round(quality)));
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${teamId}.png&w=${size}&h=${size}&scale=crop&cquality=${q}`;
}

// NCAA Tournament bracket data (from ESPN)
const TEAM_IDS: Record<string, number> = {
  // 2025 teams
  Auburn: 2,
  "Alabama St": 2011,
  Louisville: 97,
  Creighton: 156,
  Michigan: 130,
  "UC San Diego": 28,
  "Texas A&M": 245,
  Yale: 43,
  "Ole Miss": 145,
  "North Carolina": 153,
  "Iowa State": 66,
  Lipscomb: 288,
  Marquette: 269,
  "New Mexico": 167,
  "Michigan St": 127,
  Bryant: 2803,
  Duke: 150,
  "Mount St Marys": 116,
  "Mississippi St": 344,
  Baylor: 239,
  Oregon: 2483,
  Liberty: 2335,
  Arizona: 12,
  Akron: 2006,
  BYU: 252,
  VCU: 2670,
  Wisconsin: 275,
  Montana: 149,
  "Saint Mary's": 260,
  Vanderbilt: 238,
  Alabama: 333,
  "Robert Morris": 2523,
  Florida: 57,
  "Norfolk St": 2450,
  UConn: 41,
  Oklahoma: 201,
  Memphis: 235,
  "Colorado St": 36,
  Maryland: 120,
  "Grand Canyon": 2253,
  Missouri: 142,
  Drake: 2181,
  "Texas Tech": 2641,
  "UNC Wilmington": 350,
  Kansas: 2305,
  Arkansas: 8,
  "St John's": 2599,
  Omaha: 2437,
  Houston: 248,
  SIUE: 2565,
  Gonzaga: 2250,
  Georgia: 61,
  Clemson: 228,
  McNeese: 2377,
  Purdue: 2509,
  "High Point": 2272,
  Illinois: 356,
  Xavier: 2752,
  Kentucky: 96,
  Troy: 2653,
  UCLA: 26,
  "Utah State": 328,
  Tennessee: 2633,
  Wofford: 2747,
  "San Diego St": 21,
  "Saint Francis": 2598,
  American: 44,
  Texas: 251,
  // 2026 additional teams
  Nebraska: 158,
  Iowa: 2294,
  Virginia: 258,
  "NC State": 152,
  "Saint Louis": 139,
  Villanova: 222,
  "Miami FL": 2390,
  "Ohio St": 194,
  "Santa Clara": 2541,
  Washington: 264,
  TCU: 2628,
  LSU: 99,
  "Seton Hall": 2550,
  USC: 30,
  California: 25,
  "Oklahoma St": 197,
  Tulsa: 202,
  Belmont: 2057,
  Nevada: 2440,
  "Virginia Tech": 259,
  "Boise St": 68,
  Northwestern: 77,
  Cincinnati: 2132,
  UCF: 2116,
  SMU: 2567,
  Indiana: 84,
  // 2026 NCAA field (ncaa.com bracket)
  Siena: 2561,
  "Northern Iowa": 2460,
  "Cal Baptist": 2856,
  "South Florida": 58,
  "North Dakota St": 2449,
  Furman: 231,
  LIU: 112358,
  Hawaii: 62,
  "Kennesaw St": 338,
  Queens: 2511,
  Penn: 219,
  Idaho: 70,
  Hofstra: 2275,
  "Wright St": 2750,
  "Tennessee St": 2635,
  UMBC: 2378,
  Howard: 47,
  "Prairie View": 2504,
  Lehigh: 2329,
  "Miami OH": 193,
};

interface TeamMetadata {
  conference?: string;
  teamTier?: Team["teamTier"];
  fanBaseStrength?: Team["fanBaseStrength"];
  location?: { city: string; state: string };
}

// Metadata for BRACKET_2026 teams - conference, program tier, fan base strength
const TEAM_METADATA: Record<string, TeamMetadata> = {
  Michigan: { conference: "Big Ten", teamTier: "blueblood", fanBaseStrength: "elite" },
  Missouri: { conference: "SEC", teamTier: "power", fanBaseStrength: "strong" },
  "North Carolina": { conference: "ACC", teamTier: "blueblood", fanBaseStrength: "elite" },
  Indiana: { conference: "Big Ten", teamTier: "blueblood", fanBaseStrength: "elite" },
  Louisville: { conference: "ACC", teamTier: "power", fanBaseStrength: "elite" },
  "Santa Clara": { conference: "WCC", teamTier: "mid-major", fanBaseStrength: "average" },
  Vanderbilt: { conference: "SEC", teamTier: "power", fanBaseStrength: "average" },
  LSU: { conference: "SEC", teamTier: "power", fanBaseStrength: "strong" },
  "Texas Tech": { conference: "Big 12", teamTier: "power", fanBaseStrength: "strong" },
  "Ohio St": { conference: "Big Ten", teamTier: "power", fanBaseStrength: "elite" },
  UConn: { conference: "Big East", teamTier: "blueblood", fanBaseStrength: "elite" },
  Akron: { conference: "MAC", teamTier: "mid-major", fanBaseStrength: "weak" },
  "Saint Louis": { conference: "A-10", teamTier: "mid-major", fanBaseStrength: "strong" },
  Wisconsin: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "elite" },
  Illinois: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "strong" },
  Belmont: { conference: "MVC", teamTier: "mid-major", fanBaseStrength: "average" },
  Arizona: { conference: "Big 12", teamTier: "blueblood", fanBaseStrength: "elite" },
  Cincinnati: { conference: "Big 12", teamTier: "power", fanBaseStrength: "strong" },
  Kentucky: { conference: "SEC", teamTier: "blueblood", fanBaseStrength: "elite" },
  Texas: { conference: "SEC", teamTier: "power", fanBaseStrength: "elite" },
  Virginia: { conference: "ACC", teamTier: "power", fanBaseStrength: "strong" },
  Washington: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "average" },
  Kansas: { conference: "Big 12", teamTier: "blueblood", fanBaseStrength: "elite" },
  "Seton Hall": { conference: "Big East", teamTier: "power", fanBaseStrength: "strong" },
  Iowa: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "strong" },
  "San Diego St": { conference: "Mountain West", teamTier: "mid-major", fanBaseStrength: "strong" },
  Purdue: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "elite" },
  California: { conference: "ACC", teamTier: "power", fanBaseStrength: "average" },
  Auburn: { conference: "SEC", teamTier: "power", fanBaseStrength: "strong" },
  "Miami FL": { conference: "ACC", teamTier: "power", fanBaseStrength: "average" },
  Florida: { conference: "SEC", teamTier: "power", fanBaseStrength: "strong" },
  Nevada: { conference: "Mountain West", teamTier: "mid-major", fanBaseStrength: "average" },
  Duke: { conference: "ACC", teamTier: "blueblood", fanBaseStrength: "elite" },
  Northwestern: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "average" },
  Clemson: { conference: "ACC", teamTier: "power", fanBaseStrength: "strong" },
  "Saint Mary's": { conference: "WCC", teamTier: "mid-major", fanBaseStrength: "strong" },
  Tennessee: { conference: "SEC", teamTier: "power", fanBaseStrength: "elite" },
  VCU: { conference: "A-10", teamTier: "mid-major", fanBaseStrength: "strong" },
  BYU: { conference: "Big 12", teamTier: "power", fanBaseStrength: "elite" },
  Baylor: { conference: "Big 12", teamTier: "power", fanBaseStrength: "strong" },
  "NC State": { conference: "ACC", teamTier: "power", fanBaseStrength: "strong" },
  "New Mexico": { conference: "Mountain West", teamTier: "mid-major", fanBaseStrength: "strong" },
  Gonzaga: { conference: "WCC", teamTier: "blueblood", fanBaseStrength: "elite" },
  "Oklahoma St": { conference: "Big 12", teamTier: "power", fanBaseStrength: "strong" },
  "Texas A&M": { conference: "SEC", teamTier: "power", fanBaseStrength: "strong" },
  UCLA: { conference: "Big Ten", teamTier: "blueblood", fanBaseStrength: "elite" },
  Houston: { conference: "Big 12", teamTier: "power", fanBaseStrength: "strong" },
  "Virginia Tech": { conference: "ACC", teamTier: "power", fanBaseStrength: "strong" },
  "Iowa State": { conference: "Big 12", teamTier: "power", fanBaseStrength: "strong" },
  "Ole Miss": { conference: "SEC", teamTier: "power", fanBaseStrength: "average" },
  "Utah State": { conference: "Mountain West", teamTier: "mid-major", fanBaseStrength: "strong" },
  SMU: { conference: "ACC", teamTier: "power", fanBaseStrength: "average" },
  "St John's": { conference: "Big East", teamTier: "power", fanBaseStrength: "strong" },
  TCU: { conference: "Big 12", teamTier: "power", fanBaseStrength: "average" },
  Alabama: { conference: "SEC", teamTier: "power", fanBaseStrength: "elite" },
  USC: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "average" },
  Arkansas: { conference: "SEC", teamTier: "power", fanBaseStrength: "strong" },
  UCF: { conference: "Big 12", teamTier: "power", fanBaseStrength: "average" },
  Nebraska: { conference: "Big Ten", teamTier: "power", fanBaseStrength: "strong" },
  Tulsa: { conference: "American", teamTier: "mid-major", fanBaseStrength: "average" },
  Villanova: { conference: "Big East", teamTier: "blueblood", fanBaseStrength: "elite" },
  Georgia: { conference: "SEC", teamTier: "power", fanBaseStrength: "strong" },
  "Michigan St": { conference: "Big Ten", teamTier: "blueblood", fanBaseStrength: "elite" },
  "Boise St": { conference: "Mountain West", teamTier: "mid-major", fanBaseStrength: "average" },
  Siena: { conference: "MAAC", teamTier: "low-major", fanBaseStrength: "weak" },
  "Northern Iowa": { conference: "MVC", teamTier: "mid-major", fanBaseStrength: "average" },
  "Cal Baptist": { conference: "WAC", teamTier: "low-major", fanBaseStrength: "weak" },
  "South Florida": { conference: "American", teamTier: "mid-major", fanBaseStrength: "average" },
  "North Dakota St": { conference: "Summit", teamTier: "low-major", fanBaseStrength: "weak" },
  Furman: { conference: "SoCon", teamTier: "low-major", fanBaseStrength: "weak" },
  LIU: { conference: "NEC", teamTier: "low-major", fanBaseStrength: "weak" },
  Hawaii: { conference: "Big West", teamTier: "low-major", fanBaseStrength: "weak" },
  "Kennesaw St": { conference: "CUSA", teamTier: "mid-major", fanBaseStrength: "weak" },
  Queens: { conference: "ASUN", teamTier: "low-major", fanBaseStrength: "weak" },
  Penn: { conference: "Ivy", teamTier: "low-major", fanBaseStrength: "weak" },
  Idaho: { conference: "Big Sky", teamTier: "low-major", fanBaseStrength: "weak" },
  Hofstra: { conference: "CAA", teamTier: "mid-major", fanBaseStrength: "weak" },
  "Wright St": { conference: "Horizon", teamTier: "low-major", fanBaseStrength: "weak" },
  "Tennessee St": { conference: "OVC", teamTier: "low-major", fanBaseStrength: "weak" },
  UMBC: { conference: "America East", teamTier: "low-major", fanBaseStrength: "weak" },
  Howard: { conference: "MEAC", teamTier: "low-major", fanBaseStrength: "weak" },
  "Prairie View": { conference: "SWAC", teamTier: "low-major", fanBaseStrength: "weak" },
  Lehigh: { conference: "Patriot", teamTier: "low-major", fanBaseStrength: "weak" },
  "Miami OH": { conference: "MAC", teamTier: "mid-major", fanBaseStrength: "average" },
  McNeese: { conference: "Southland", teamTier: "low-major", fanBaseStrength: "weak" },
  Troy: { conference: "Sun Belt", teamTier: "low-major", fanBaseStrength: "weak" },
  "High Point": { conference: "Big South", teamTier: "low-major", fanBaseStrength: "weak" },
};

/** Build a team for static bracket data (uses ESPN IDs in TEAM_IDS). */
export function makeBracketTeam(name: string, seed: number, metadata?: TeamMetadata): Team {
  return team(name, seed, metadata);
}

function team(name: string, seed: number, metadata?: TeamMetadata): Team {
  const kenpom = getKenpomRating(name);
  return {
    id: TEAM_IDS[name] ?? 0,
    name,
    abbreviation: name.split(" ").slice(-1)[0]?.slice(0, 3).toUpperCase() ?? "???",
    seed,
    ...(TEAM_METADATA[name] ?? metadata),
    ...(kenpom
      ? {
          stats: {
            kenpomRank: kenpom.rank,
            adjEM: kenpom.adjEM,
            adjO: kenpom.adjO,
            adjORank: kenpom.adjORank,
            adjD: kenpom.adjD,
            adjDRank: kenpom.adjDRank,
            adjTempo: kenpom.adjTempo,
            record: { wins: kenpom.wins, losses: kenpom.losses },
            sosEM: kenpom.sosEM,
            luck: kenpom.luck,
          },
        }
      : {}),
  };
}

export const TBD_TEAM: Team = {
  id: 0,
  name: "TBD",
  abbreviation: "TBD",
  seed: 0,
};

function scheduledGame(
  id: string,
  team1: Team,
  team2: Team
): Game {
  return { id, status: "scheduled", team1, team2 };
}

/** Completed game with box score (winner must match higher score). */
export function finalGame(
  id: string,
  team1: Team,
  team2: Team,
  score1: number,
  score2: number,
  statusLabel = "Final"
): Game {
  const winner: 1 | 2 = score1 > score2 ? 1 : 2;
  return {
    id,
    status: "final",
    team1,
    team2,
    score1,
    score2,
    winner,
    statusLabel,
  };
}

export function placeholderGame(id: string): Game {
  return scheduledGame(id, TBD_TEAM, TBD_TEAM);
}

// 2026 NCAA Tournament Schedule and Locations
export const SCHEDULE_2026: TournamentSchedule = {
  selectionSunday: "March 15, 2026",
  firstFour: {
    dates: "March 17-18, 2026",
    venue: { city: "Dayton", state: "OH", arena: "UD Arena" },
  },
  firstSecondRound: {
    dates: ["March 19 & 21", "March 20 & 22"],
    venues: [
      { city: "Buffalo", state: "NY", arena: "KeyBank Center" },
      { city: "Greenville", state: "SC", arena: "Bon Secours Wellness Arena" },
      { city: "Oklahoma City", state: "OK", arena: "Paycom Center" },
      { city: "Portland", state: "OR", arena: "Moda Center" },
      { city: "Tampa", state: "FL", arena: "Benchmark International Arena" },
      { city: "Philadelphia", state: "PA", arena: "Xfinity Mobile Arena" },
      { city: "San Diego", state: "CA", arena: "Viejas Arena" },
      { city: "St. Louis", state: "MO", arena: "Enterprise Center" },
    ],
  },
  regionals: {
    SOUTH: {
      dates: "March 26 & 28",
      venue: { city: "Houston", state: "TX", arena: "Toyota Center" },
    },
    WEST: {
      dates: "March 26 & 28",
      venue: { city: "San Jose", state: "CA", arena: "SAP Center" },
    },
    MIDWEST: {
      dates: "March 27 & 29",
      venue: { city: "Chicago", state: "IL", arena: "United Center" },
    },
    EAST: {
      dates: "March 27 & 29",
      venue: { city: "Washington", state: "D.C.", arena: "Capital One Arena" },
    },
  },
  finalFour: {
    date: "April 4, 2026",
    venue: { city: "Indianapolis", state: "IN", arena: "Lucas Oil Stadium" },
  },
  championship: {
    date: "April 6, 2026",
    venue: { city: "Indianapolis", state: "IN", arena: "Lucas Oil Stadium" },
  },
};

/**
 * 2026 Round of 64 / Round of 32: each game id maps to an index in
 * `SCHEDULE_2026.firstSecondRound.venues` (official NCAA pod sites).
 * Sources: NCAA bracket (e.g. Michigan→Buffalo, Duke→Greenville, Houston→OKC);
 * remaining pods filled to the eight host cities.
 */
export const FIRST_SECOND_VENUE_INDEX_BY_GAME_ID_2026: Record<string, number> = {
  // South — Tampa / Oklahoma City
  s1: 4,
  s2: 4,
  s3: 4,
  s4: 4,
  s5: 2,
  s6: 2,
  s7: 2,
  s8: 2,
  s9: 4,
  s10: 4,
  s11: 2,
  s12: 2,
  // East — Greenville / Philadelphia
  e1: 1,
  e2: 1,
  e3: 1,
  e4: 1,
  e5: 5,
  e6: 5,
  e7: 5,
  e8: 5,
  e9: 1,
  e10: 1,
  e11: 5,
  e12: 5,
  // West — Portland / San Diego (Arizona pod @ San Diego per NCAA 2026)
  w1: 6,
  w2: 6,
  w3: 3,
  w4: 3,
  w5: 3,
  w6: 3,
  w7: 6,
  w8: 6,
  w9: 6,
  w10: 6,
  w11: 3,
  w12: 3,
  // Midwest — Buffalo / St. Louis
  m1: 0,
  m2: 0,
  m3: 0,
  m4: 0,
  m5: 7,
  m6: 7,
  m7: 7,
  m8: 7,
  m9: 0,
  m10: 0,
  m11: 7,
  m12: 7,
};

export function formatVenueLine(venue: Venue): string {
  return `${venue.arena} in ${venue.city}, ${venue.state}`;
}

/** Neutral-site venue for a 2026 R64/R32 game, when `schedule` matches the official field. */
export function getFirstSecondRoundVenueForGameId(
  gameId: string,
  schedule: TournamentSchedule | undefined
): Venue | undefined {
  if (!schedule || schedule.firstSecondRound.venues.length < 8) return undefined;
  const idx = FIRST_SECOND_VENUE_INDEX_BY_GAME_ID_2026[gameId];
  if (idx === undefined) return undefined;
  return schedule.firstSecondRound.venues[idx];
}

// 2026 NCAA Tournament — pairings/seeds from ncaa.com/march-madness-live/bracket (March 2026)
export const BRACKET_2026: Bracket = {
  year: 2026,
  schedule: SCHEDULE_2026,
  firstFour: [
    finalGame("ff1", team("UMBC", 16), team("Howard", 16), 83, 86),
    finalGame("ff2", team("Miami OH", 11), team("SMU", 11), 89, 79),
    finalGame("ff3", team("Prairie View", 16), team("Lehigh", 16), 67, 55),
    finalGame("ff4", team("Texas", 11), team("NC State", 11), 68, 66),
  ],
  regions: [
    {
      name: "SOUTH",
      // 1 seed: Florida
      rounds: [
        [
          finalGame("s1", team("Florida", 1), team("Prairie View", 16), 114, 55),
          finalGame("s2", team("Clemson", 8), team("Iowa", 9), 61, 67),
          finalGame("s3", team("Vanderbilt", 5), team("McNeese", 12), 78, 68),
          finalGame("s4", team("Nebraska", 4), team("Troy", 13), 76, 47),
          finalGame("s5", team("North Carolina", 6), team("VCU", 11), 78, 82, "Final/OT"),
          finalGame("s6", team("Illinois", 3), team("Penn", 14), 105, 70),
          finalGame("s7", team("Saint Mary's", 7), team("Texas A&M", 10), 50, 63),
          finalGame("s8", team("Houston", 2), team("Idaho", 15), 78, 47),
        ],
        [
          finalGame("s9", team("Florida", 1), team("Iowa", 9), 72, 73),
          finalGame("s10", team("Vanderbilt", 5), team("Nebraska", 4), 72, 74),
          finalGame("s11", team("VCU", 11), team("Illinois", 3), 55, 76),
          finalGame("s12", team("Texas A&M", 10), team("Houston", 2), 57, 88),
        ],
        [
          finalGame("s13", team("Iowa", 9), team("Nebraska", 4), 77, 71),
          finalGame("s14", team("Illinois", 3), team("Houston", 2), 65, 55),
        ],
        [finalGame("s15", team("Iowa", 9), team("Illinois", 3), 59, 71)],
      ],
    },
    {
      name: "EAST",
      // 1 seed: Duke
      rounds: [
        [
          finalGame("e1", team("Duke", 1), team("Siena", 16), 71, 65),
          finalGame("e2", team("Ohio St", 8), team("TCU", 9), 64, 66),
          finalGame("e3", team("St John's", 5), team("Northern Iowa", 12), 79, 53),
          finalGame("e4", team("Kansas", 4), team("Cal Baptist", 13), 68, 60),
          finalGame("e5", team("Louisville", 6), team("South Florida", 11), 83, 79),
          finalGame("e6", team("Michigan St", 3), team("North Dakota St", 14), 92, 67),
          finalGame("e7", team("UCLA", 7), team("UCF", 10), 75, 71),
          finalGame("e8", team("UConn", 2), team("Furman", 15), 82, 71),
        ],
        [
          finalGame("e9", team("Duke", 1), team("TCU", 9), 81, 58),
          finalGame("e10", team("St John's", 5), team("Kansas", 4), 67, 65),
          finalGame("e11", team("Louisville", 6), team("Michigan St", 3), 69, 77),
          finalGame("e12", team("UCLA", 7), team("UConn", 2), 57, 73),
        ],
        [
          finalGame("e13", team("Duke", 1), team("St John's", 5), 80, 75),
          finalGame("e14", team("Michigan St", 3), team("UConn", 2), 63, 67),
        ],
        [finalGame("e15", team("Duke", 1), team("UConn", 2), 72, 73)],
      ],
    },
    {
      name: "WEST",
      // 1 seed: Arizona
      rounds: [
        [
          finalGame("w1", team("Arizona", 1), team("LIU", 16), 92, 58),
          finalGame("w2", team("Villanova", 8), team("Utah State", 9), 76, 86),
          finalGame("w3", team("Wisconsin", 5), team("High Point", 12), 82, 83),
          finalGame("w4", team("Arkansas", 4), team("Hawaii", 13), 97, 78),
          finalGame("w5", team("BYU", 6), team("Texas", 11), 71, 79),
          finalGame("w6", team("Gonzaga", 3), team("Kennesaw St", 14), 73, 64),
          finalGame("w7", team("Miami FL", 7), team("Missouri", 10), 80, 66),
          finalGame("w8", team("Purdue", 2), team("Queens", 15), 104, 71),
        ],
        [
          finalGame("w9", team("Arizona", 1), team("Utah State", 9), 78, 66),
          finalGame("w10", team("High Point", 12), team("Arkansas", 4), 88, 94),
          finalGame("w11", team("Texas", 11), team("Gonzaga", 3), 74, 68),
          finalGame("w12", team("Miami FL", 7), team("Purdue", 2), 69, 79),
        ],
        [
          finalGame("w13", team("Arizona", 1), team("Arkansas", 4), 109, 88),
          finalGame("w14", team("Texas", 11), team("Purdue", 2), 77, 79),
        ],
        [finalGame("w15", team("Arizona", 1), team("Purdue", 2), 79, 64)],
      ],
    },
    {
      name: "MIDWEST",
      // 1 seed: Michigan
      rounds: [
        [
          finalGame("m1", team("Michigan", 1), team("Howard", 16), 101, 80),
          finalGame("m2", team("Georgia", 8), team("Saint Louis", 9), 77, 102),
          finalGame("m3", team("Texas Tech", 5), team("Akron", 12), 91, 71),
          finalGame("m4", team("Alabama", 4), team("Hofstra", 13), 90, 70),
          finalGame("m5", team("Tennessee", 6), team("Miami OH", 11), 78, 56),
          finalGame("m6", team("Virginia", 3), team("Wright St", 14), 82, 73),
          finalGame("m7", team("Kentucky", 7), team("Santa Clara", 10), 89, 84, "Final/OT"),
          finalGame("m8", team("Iowa State", 2), team("Tennessee St", 15), 108, 74),
        ],
        // R32 order matches NCAA quadrants: [1-pod, 5/4-pod, 6/3-pod, 7/2-pod] so S16 pairs (m9+m11) and (m10+m12).
        [
          finalGame("m9", team("Michigan", 1), team("Saint Louis", 9), 95, 72),
          finalGame("m11", team("Texas Tech", 5), team("Alabama", 4), 65, 90),
          finalGame("m10", team("Tennessee", 6), team("Virginia", 3), 79, 72),
          finalGame("m12", team("Kentucky", 7), team("Iowa State", 2), 63, 82),
        ],
        [
          finalGame("m13", team("Michigan", 1), team("Alabama", 4), 90, 77),
          finalGame("m14", team("Tennessee", 6), team("Iowa State", 2), 76, 62),
        ],
        [finalGame("m15", team("Michigan", 1), team("Tennessee",6), 95, 62)],
      ],
    },
  ],
  finalFour: [
    finalGame("ff-east-south", team("UConn", 2), team("Illinois", 3), 71, 62),
    finalGame("ff-west-midwest", team("Arizona", 1), team("Michigan", 1), 73, 91),
  ],
  championship: finalGame("champ", team("UConn", 2), team("Michigan", 1), 63, 69),
};
