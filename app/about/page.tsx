import type { Metadata } from "next";
import { Tweet } from "react-tweet";

export const metadata: Metadata = {
  title: "About",
  description:
    "How the AI-powered March Madness bracket simulation works: KenPom-style stats, seed history, and real-time AI analysis.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="max-w-[800px] mx-auto px-4 py-12">
        <h1 className="text-[32px] font-bold text-[#121213] mb-2">
          About March Madness Arena
        </h1>
        <p className="text-[15px] text-[#6c6e6f] mb-12">
          An AI-powered bracket simulation using real statistical data and
          advanced prompting techniques.
        </p>

        <Section title="How It Works">
          <p>
            March Madness Arena simulates the entire NCAA Tournament bracket
            using an AI model that analyzes each matchup in real-time. The
            simulation streams results as each game is decided, allowing you to
            watch the bracket unfold game by game.
          </p>
          <p>
            The simulation follows the actual tournament structure: First Four
            play-in games, then the Round of 64, Round of 32, Sweet 16, Elite
            Eight, Final Four, and Championship.
          </p>
        </Section>

        <Section title="The AI Model">
          <p>
            Each game is simulated using{" "}
            <strong>Anthropic&apos;s Claude 4.5 Haiku</strong> model with structured
            output. The AI acts as an &quot;elite March Madness analyst&quot;
            filling out a bracket to win a pool, not just picking favorites
            but weighing matchup-specific factors like defensive efficiency,
            tempo control, tournament DNA, and luck regression.
          </p>
          <p>
            For every matchup, the model returns a structured JSON response with
            the predicted winner and reasoning, ensuring consistent and
            parse-able results.
          </p>
          <p>
            The model uses a <strong>temperature of 0.7</strong> to introduce
            controlled variance: running the same bracket multiple times will
            produce different outcomes while keeping the reasoning analytically
            grounded. The real variety comes from the prompt design: qualitative
            edge framing and tournament-specific analysis give the AI genuine
            reasons to pick upsets, rather than relying on raw randomness.
          </p>
        </Section>

        <Section title="Prompting Strategy">
          <p>
            The prompting strategy is designed to produce realistic tournament
            outcomes with appropriate upset rates. Each game prompt includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[#3a3b3d]">
            <li>
              <strong>Team profiles</strong>: name, seed, conference, program
              tier (blueblood, power conference, mid-major), and Cinderella
              status
            </li>
            <li>
              <strong>Statistical analysis</strong>: KenPom rankings, adjusted
              efficiency margins, offensive/defensive ratings, tempo, and
              strength of schedule, presented with qualitative edge framing
              rather than explicit percentages, so the AI analyzes the matchup
              instead of anchoring on a number
            </li>
            <li>
              <strong>Tournament-specific KenPom factors</strong>: the AI is
              told which KenPom qualities matter most in March: elite defense
              (AdjD top 25) that grinds out close games, tempo control that
              neutralizes more talented opponents, style clashes (elite offense
              vs elite defense treated as coin flips), and luck regression for
              overperforming teams
            </li>
            <li>
              <strong>Historical seed matchup data</strong>: upset rates from
              1985-2025 (e.g., 12-seeds beat 5-seeds 36% of the time)
            </li>
            <li>
              <strong>Tournament context</strong>: running totals of upsets vs
              chalk picks, with calibration nudges when the sim is running too
              chalky or too chaotic compared to historical norms
            </li>
            <li>
              <strong>Upset indicators</strong>: KenPom rank vs seed
              divergence, luck regression signals, strength of schedule gaps,
              unlucky teams that are better than their record, and elite
              defensive profiles
            </li>
            <li>
              <strong>Site &amp; travel</strong>: each game includes the 2026
              neutral venue (First Four in Dayton; R64/R32 pod sites; regionals;
              Final Four in Indianapolis). The model nudges tight matchups when
              one team’s footprint is closer to the arena or has a stronger
              traveling fan base, without overriding KenPom.
            </li>
          </ul>
        </Section>

        <Section title="Data Sources">
          <div className="space-y-4">
            <DataSource
              name="KenPom"
              url="https://kenpom.com"
              description="Advanced college basketball analytics including adjusted efficiency margins, offensive and defensive ratings, tempo, luck factor, and strength of schedule. Updated throughout the season."
            />
            <DataSource
              name="Historical Seed Data"
              description="Win rates for every seed matchup combination from 1985-2025, including upset frequencies and notable patterns (e.g., 1-seeds have only lost to 16-seeds twice in tournament history)."
            />
            <DataSource
              name="Team Metadata"
              description="Program tiers (blueblood, power conference, mid-major), conference affiliations, and fan base characteristics to model intangible tournament factors."
            />
            <DataSource
              name="ESPN Team IDs"
              description="Used for fetching team logos and visual identification in the bracket display."
            />
          </div>
        </Section>

        <Section title="Win Probability Model">
          <p>
            The ensemble win probability combines three different models to
            provide a baseline prediction:
          </p>
          <div className="bg-white rounded-lg border border-[#dcdddf] p-4 font-mono text-[13px] my-4">
            <div className="text-[#6c6e6f] mb-2">{"// Ensemble weights"}</div>
            <div>
              KenPom Logistic: <span className="text-[#0066cc]">60%</span>
            </div>
            <div>
              Log5 Method: <span className="text-[#0066cc]">25%</span>
            </div>
            <div>
              Seed-Based: <span className="text-[#0066cc]">15%</span>
            </div>
          </div>
          <p>
            The KenPom logistic model uses adjusted efficiency margin
            differences with the formula:{" "}
            <code className="bg-[#e8e8e8] px-1.5 py-0.5 rounded text-[13px]">
              1 / (1 + 10^(-marginDiff/11))
            </code>
          </p>
          <p>
            Rather than showing the AI an explicit percentage (which would
            anchor it into always picking the favorite), the ensemble
            probability is translated into a{" "}
            <strong>qualitative edge description</strong> (toss-up, slight
            edge, favored, or clear favorite) so the AI genuinely evaluates
            matchup-specific factors instead of deferring to a number.
          </p>
        </Section>

        <Section title="Realistic Upset Rates">
          <p>
            The system is calibrated to produce historically accurate upset
            rates. The AI is given explicit guidance on expected upset
            frequencies:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[#3a3b3d]">
            <li>
              <strong>Round of 64:</strong> ~10-12 upsets expected (lower seed
              wins)
            </li>
            <li>
              <strong>Round of 32:</strong> ~4-6 upsets expected
            </li>
            <li>
              <strong>5 vs 12 matchups:</strong> 12-seeds win 36% of the time
            </li>
            <li>
              <strong>8 vs 9 matchups:</strong> Essentially a coin flip (47% vs
              53%)
            </li>
            <li>
              <strong>1 vs 16 matchups:</strong> Only 2 upsets in tournament
              history (1%)
            </li>
          </ul>
          <p>
            The tournament context tracker monitors actual vs expected upsets
            and provides <strong>dynamic calibration</strong>:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[#3a3b3d]">
            <li>
              <strong>Too chalky:</strong> If upsets are well below expected,
              the AI is told to pick the underdog when any legitimate indicators
              exist
            </li>
            <li>
              <strong>Too chaotic:</strong> If upsets significantly exceed
              expectations, the AI leans toward higher seeds
            </li>
            <li>
              <strong>On track:</strong> No calibration. The AI picks based
              purely on the matchup data and its own analysis
            </li>
          </ul>
          <p>
            Combined with qualitative rather than numeric probability framing,
            this produces brackets with genuine variety: different champions,
            different Cinderellas, and different upset patterns across
            simulations.
          </p>
        </Section>

        {/* What People Are Saying */}
        <Section title="Other Tweets">
          <div className="grid gap-4 sm:grid-cols-2 not-prose">
            <Tweet id="2033572003454530042" />
            <Tweet id="2033356869889396923" />
            <Tweet id="2033351062212555031" />
            <Tweet id="2033528719697236409" />
          </div>
        </Section>

        <Section title="Disclaimer">
          <div className="bg-white rounded-lg border border-[#dcdddf] p-4">
            <p>
              This project is built entirely for fun and is free for anyone to
              try and use. We do not claim ownership over any data sourced from{" "}
              <a
                href="https://www.espn.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0066cc] hover:underline"
              >
                ESPN
              </a>
              ,{" "}
              <a
                href="https://kenpom.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0066cc] hover:underline"
              >
                KenPom
              </a>
              , or any other third-party source. All team names, logos, and
              statistical data belong to their respective owners. This is an
              independent, unofficial project with no affiliation to the NCAA,
              ESPN, or KenPom.
            </p>
          </div>
        </Section>

        <div className="mt-16 pt-8 border-t border-[#dcdddf]">
          <p className="text-[13px] text-[#6c6e6f] text-center">
            Built for March Madness 2026. Data and predictions are for
            entertainment purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="text-[20px] font-bold text-[#121213] mb-4">{title}</h2>
      <div className="space-y-4 text-[15px] text-[#3a3b3d] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function DataSource({
  name,
  url,
  description,
}: {
  name: string;
  url?: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#dcdddf] p-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-[15px] font-semibold text-[#121213]">{name}</h3>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-[#0066cc] hover:underline"
          >
            {url.replace("https://", "")}
          </a>
        )}
      </div>
      <p className="text-[14px] text-[#6c6e6f]">{description}</p>
    </div>
  );
}
