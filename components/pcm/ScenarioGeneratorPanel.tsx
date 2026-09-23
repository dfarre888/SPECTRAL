'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClipboardList, Crosshair, Gauge, Layers, ListOrdered, Sparkles } from 'lucide-react';
import type { ScenarioConfiguration } from '@/lib/pcm/scenario-generator-engine';
import type { PCM } from '@/lib/pcm/spectral.types';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';

type Inject = ScenarioConfiguration['inject_sequence'][number];
type FocusPoint = ScenarioConfiguration['instructor_focus_points'][number];

const ACRONYMS: Record<string, string> = { ew: 'EW', roe: 'ROE', emcon: 'EMCON', owa: 'OWA', gnss: 'GNSS', arm: 'ARM' };

/** snake_case engine keys to readable labels: `under_ew` → `Under EW`. */
function humanize(key: string): string {
  const words = key.split('_').map((w) => ACRONYMS[w] ?? w);
  const first = words[0] ?? '';
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

const METHOD_LABEL: Record<ScenarioConfiguration['generation_method'], string> = {
  ai_generated: 'AI generated',
  ai_assisted: 'AI assisted',
  manual: 'Manual',
};

const INJECT_COLUMNS: DataColumn<Inject>[] = [
  { key: 'turn', header: 'Turn', align: 'right',
    headerClassName: '!text-right', width: 72, cell: (r) => r.turn, sortValue: (r) => r.turn },
  { key: 'inject', header: 'Inject', width: 110, className: 'mono primary', cell: (r) => r.inject_id },
  { key: 'competency', header: 'Competency', width: 220, cell: (r) => humanize(r.target_competency) },
  { key: 'rationale', header: 'Rationale', cell: (r) => r.rationale },
];

const FOCUS_COLUMNS: DataColumn<FocusPoint>[] = [
  {
    key: 'turns',
    header: 'Turns',
    align: 'right',
    headerClassName: '!text-right',
    width: 84,
    cell: (r) => `${r.turn_range[0]} to ${r.turn_range[1]}`,
  },
  { key: 'watch', header: 'Watch for', className: 'primary', cell: (r) => r.watch_for },
  { key: 'competency', header: 'Competency', width: 200, cell: (r) => humanize(r.competency) },
  { key: 'x', header: 'If trainee does X', cell: (r) => r.if_trainee_does_X },
  { key: 'y', header: 'If trainee does Y', cell: (r) => r.if_trainee_does_Y },
];

const WHAT_APPEARS = [
  { icon: Sparkles, title: 'Title and rationale', body: 'Drawn from the learner’s active competency blind spots.' },
  { icon: ListOrdered, title: 'Inject sequence', body: 'Timed injects by turn, each tied to the competency it pressures.' },
  { icon: ClipboardList, title: 'Instructor focus points', body: 'What to watch for, and how to respond to either trainee choice.' },
  { icon: Gauge, title: 'Detection envelope', body: 'Estimated Pd at baseline and under the trigger conditions.' },
  { icon: Layers, title: 'Scenario code', body: 'Start it as a PCM exercise, or take it to WOPR Arena or Map Intel.' },
] as const;

export function ScenarioGeneratorPanel() {
  const router = useRouter();
  const [config, setConfig] = useState<ScenarioConfiguration | null>(null);
  const [loading, setLoading] = useState(false);
  const [startingExercise, setStartingExercise] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [callsign, setCallsign] = useState('TRAINEE');
  const [scenarioCode, setScenarioCode] = useState<string | null>(null);
  const [scenarioRowId, setScenarioRowId] = useState<string | null>(null);
  const [sessionDsPlayerId, setSessionDsPlayerId] = useState<string | null>(null);

  async function generate(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setExerciseError(null);
    setGenerateError(null);
    try {
      const res = await fetch('/api/spectral/scenario-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, callsign }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfig(data as ScenarioConfiguration);
        setScenarioCode(typeof data.scenario_code === 'string' ? data.scenario_code : null);
        setScenarioRowId(typeof data.scenario_row_id === 'string' ? data.scenario_row_id : null);
        setSessionDsPlayerId(typeof data.ds_player_id === 'string' ? data.ds_player_id : null);
      } else if (res.status === 401) {
        setGenerateError('Sign in as a DS or RPIC player to generate scenarios.');
      } else if (res.status === 403) {
        setGenerateError('Scenario generation needs a DS or RPIC player role.');
      } else {
        setGenerateError(typeof data.error === 'string' ? data.error : `Generation failed (${res.status}).`);
      }
    } catch {
      setGenerateError('Network error generating the scenario.');
    } finally {
      setLoading(false);
    }
  }

  async function startExercise() {
    if (!scenarioRowId) {
      setExerciseError('No scenario ID. Generate a scenario first.');
      return;
    }
    const dsPlayerId = playerId.trim() || sessionDsPlayerId;
    if (!dsPlayerId) {
      setExerciseError('Enter a player ID or sign in as a DS player.');
      return;
    }

    setStartingExercise(true);
    setExerciseError(null);
    try {
      const body: PCM.CreateExerciseRequest = {
        scenario_id: scenarioRowId,
        ds_player_id: dsPlayerId,
        difficulty: 'base',
        red_player_id: null,
        blue_player_id: null,
        blind_mode: false,
      };
      const res = await fetch('/api/spectral/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PCM.CreateExerciseResponse & { error?: string };
      if (!res.ok || data.error) {
        setExerciseError(typeof data.error === 'string' ? data.error : 'Failed to create exercise');
        return;
      }
      if (typeof data.exercise_id === 'string' && data.exercise_id) {
        router.push(`/pcm/exercise/${data.exercise_id}`);
      } else {
        setExerciseError('Exercise created but no ID returned.');
      }
    } catch {
      setExerciseError('Network error creating exercise.');
    } finally {
      setStartingExercise(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
      <form onSubmit={generate} className="store-panel rounded-2xl p-5" aria-labelledby="sg-form-title">
        <h2 id="sg-form-title" className="text-[15px] font-semibold text-[var(--store-ink)]">
          Learner
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed store-text-body">
          The generator reads the learner’s competency record and pressures their active blind spots.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="sg-player" className="mb-1.5 block text-[12px] font-medium store-text-body">
              Player ID <span className="store-text-muted font-normal">(optional)</span>
            </label>
            <input
              id="sg-player"
              className="glass-field h-10 w-full px-3 font-mono text-[13px]"
              placeholder="Player UUID"
              autoComplete="off"
              spellCheck={false}
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
            />
            <p className="mt-1.5 text-[12px] store-text-muted">
              Used as the DS player when you start the exercise. Blank uses your signed-in DS player.
            </p>
          </div>
          <div>
            <label htmlFor="sg-callsign" className="mb-1.5 block text-[12px] font-medium store-text-body">
              Callsign
            </label>
            <input
              id="sg-callsign"
              className="glass-field h-10 w-full px-3 font-mono text-[13px]"
              placeholder="TRAINEE"
              autoComplete="off"
              spellCheck={false}
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
            />
            <p className="mt-1.5 text-[12px] store-text-muted">Names the generated exercise.</p>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-glass primary mt-5 w-full disabled:opacity-60">
          <Sparkles className="h-4 w-4" aria-hidden />
          {loading ? 'Generating…' : 'Generate scenario'}
        </button>

        {generateError ? (
          <p role="alert" className="mt-3 text-[13px] leading-relaxed text-[#FF8A98]">
            {generateError}
          </p>
        ) : null}
      </form>

      {config ? (
        <ScenarioResult
          config={config}
          scenarioCode={scenarioCode}
          scenarioRowId={scenarioRowId}
          exerciseError={exerciseError}
          startingExercise={startingExercise}
          onStart={startExercise}
        />
      ) : (
        <section className="store-panel rounded-2xl p-6" aria-labelledby="sg-empty-title">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lacquer-line)] bg-white/[0.04]">
              <Crosshair className="h-5 w-5 text-[var(--wb-blue)]" aria-hidden />
            </span>
            <div>
              <h2 id="sg-empty-title" className="text-[15px] font-semibold text-[var(--store-ink)]">
                No scenario generated yet
              </h2>
              <p className="mt-1 text-[13px] store-text-body">
                Generate a scenario and it appears here, ready to review before you start the exercise.
              </p>
            </div>
          </div>
          <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {WHAT_APPEARS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 store-text-muted" aria-hidden />
                <div>
                  <p className="text-[13px] font-medium text-[var(--store-ink)]">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed store-text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ScenarioResult({
  config,
  scenarioCode,
  scenarioRowId,
  exerciseError,
  startingExercise,
  onStart,
}: {
  config: ScenarioConfiguration;
  scenarioCode: string | null;
  scenarioRowId: string | null;
  exerciseError: string | null;
  startingExercise: boolean;
  onStart: () => void;
}) {
  const conditions = config.deliberate_conditions ?? [];
  const secondary = config.secondary_competencies ?? [];
  const injects = config.inject_sequence ?? [];
  const focus = config.instructor_focus_points ?? [];

  return (
    <section className="store-panel min-w-0 rounded-2xl p-6" aria-labelledby="sg-result-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sg-result-title" className="store-display text-[20px] font-semibold text-[var(--store-ink)]">
            {config.title}
          </h2>
          <p className="mt-1 font-mono text-[12px] store-text-muted">
            Generated {config.generated_at ? new Date(config.generated_at).toUTCString() : 'now'}
          </p>
        </div>
        <span className="tag blue">{METHOD_LABEL[config.generation_method] ?? config.generation_method}</span>
      </div>

      <p className="mt-4 max-w-[72ch] text-[14px] leading-relaxed store-text-body">{config.generation_rationale}</p>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--lacquer-line)] bg-[var(--lacquer-line)] lg:grid-cols-[1.35fr_0.8fr_0.8fr_1.25fr]">
        <Stat label="Primary competency" value={humanize(config.primary_target_competency)} wrap />
        <Stat label="Baseline Pd" value={config.estimated_pd_envelope.baseline_pd.toFixed(3)} mono />
        <Stat label="Pd under trigger" value={config.estimated_pd_envelope.under_trigger_pd.toFixed(3)} mono tone="cyan" />
        <Stat label="Scenario code" value={scenarioCode ?? 'Not saved'} mono wrap />
      </dl>

      {conditions.length > 0 || secondary.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {conditions.length > 0 ? <span className="mr-1 text-[12px] store-text-muted">Conditions</span> : null}
          {conditions.map((c) => (
            <span key={c} className="tag amber">
              {humanize(c)}
            </span>
          ))}
          {secondary.length > 0 ? <span className="ml-3 mr-1 text-[12px] store-text-muted">Also pressures</span> : null}
          {secondary.map((c) => (
            <span key={c} className="tag">
              {humanize(c)}
            </span>
          ))}
        </div>
      ) : null}

      {injects.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 text-[13px] font-semibold text-[var(--store-ink)]">Inject sequence</h3>
          <DataTable
            rows={injects}
            columns={INJECT_COLUMNS}
            rowKey={(r) => `${r.turn}-${r.inject_id}`}
            defaultSort={{ key: 'turn', dir: 'asc' }}
            compact
            maxHeight="320px"
            caption="Inject sequence by turn"
          />
        </div>
      ) : null}

      {focus.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 text-[13px] font-semibold text-[var(--store-ink)]">Instructor focus points</h3>
          <DataTable
            rows={focus}
            columns={FOCUS_COLUMNS}
            rowKey={(r) => `${r.turn_range.join('-')}-${r.watch_for}`}
            compact
            maxHeight="320px"
            caption="Instructor focus points"
          />
        </div>
      ) : null}

      <div className="mt-6 border-t border-[var(--store-line)] pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={startingExercise || !scenarioRowId}
            className="btn-glass primary disabled:opacity-50"
          >
            {startingExercise ? 'Starting…' : 'Start PCM exercise'}
          </button>
          <Link href="/arena" className="btn-glass">
            WOPR Arena
          </Link>
          <Link href="/map" className="btn-glass">
            Map Intel
          </Link>
          <Link href="/pcm" className="fc-action !px-2">
            PCM hub
          </Link>
        </div>
        {exerciseError ? (
          <p role="alert" className="mt-3 text-[13px] text-[#FF8A98]">
            {exerciseError}
          </p>
        ) : null}
        {scenarioRowId ? (
          <p className="mt-3 text-[12px] store-text-muted">
            Scenario record <span className="font-mono text-[var(--store-ink-soft)]">{scenarioRowId}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  mono,
  tone,
  wrap,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'cyan';
  /** Let long values wrap instead of truncating (names, codes). */
  wrap?: boolean;
}) {
  return (
    <div className="min-w-0 bg-[var(--store-bg)] px-4 py-3">
      <dt className="text-[11.5px] store-text-muted">{label}</dt>
      <dd
        className={[
          'mt-1 text-[15px] font-medium leading-snug',
          wrap ? (mono ? 'break-all' : 'break-words') : 'truncate',
          mono ? 'font-mono tabular-nums' : '',
          tone === 'cyan' ? 'text-[#06B6D4]' : 'text-[var(--store-ink)]',
        ].join(' ')}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
