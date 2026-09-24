import { useSeoMeta } from '@unhead/react';
import {
  ArrowRight,
  Check,
  CircleDashed,
  Handshake,
  PauseCircle,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/rest/AppShell';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  AGREEMENT_STARTER,
  createDemoTeamRestState,
  DEFAULT_TEAM_REST_STATE,
  hasAcceptedCoverageConflict,
  type AgreementFrame,
  type CoverageItem,
  type CoverageStatus,
  type PulseAnswer,
  type TeamRestState,
} from '@/lib/teamRest';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'restivism:team-rest';
type TeamStep = 'agree' | 'cover' | 'reflect';

const FRAME_LABELS: Record<AgreementFrame, string> = {
  movement: 'Movement',
  secular: 'Secular',
  faith: 'Faith',
};

const STATUS_LABELS: Record<CoverageStatus, string> = {
  proposed: 'Waiting for acceptance',
  accepted: 'Covered',
  'needs-change': 'Needs change',
  paused: 'Work paused',
};

const PULSE_OPTIONS: Array<{ value: PulseAnswer; label: string; detail: string }> = [
  { value: 'yes', label: 'Yes', detail: 'The plan held.' },
  { value: 'partly', label: 'Partly', detail: 'Some coverage changed or fell through.' },
  { value: 'no', label: 'No', detail: 'The plan did not protect the rest window.' },
  { value: 'prefer-not', label: 'Prefer not to record', detail: 'Have the conversation without storing an answer.' },
];

function isTeamStep(value: string | null): value is TeamStep {
  return value === 'agree' || value === 'cover' || value === 'reflect';
}

function toLocalInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const local = new Date(timestamp - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatWindow(item: CoverageItem) {
  const start = new Date(item.startsAt);
  const end = new Date(item.endsAt);
  const sameDay = start.toDateString() === end.toDateString();

  const startText = start.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const endText = end.toLocaleString([], sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return `${startText} – ${endText}`;
}

export default function TeamRest() {
  useSeoMeta({
    title: 'Team rest | Restivism',
    description: 'Turn rest into a team practice: agree on the norm, cover the work, then reflect together.',
  });

  // Privacy guideline: this state is deliberately device-local and is not published to Nostr.
  const [state, setState] = useLocalStorage<TeamRestState>(STORAGE_KEY, DEFAULT_TEAM_REST_STATE);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStep = searchParams.get('step');
  const activeStep: TeamStep = isTeamStep(requestedStep) ? requestedStep : 'agree';

  const [agreementDraft, setAgreementDraft] = useState(state.agreement.text || AGREEMENT_STARTER);
  const [aliasDraft, setAliasDraft] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [restingAlias, setRestingAlias] = useState('');
  const [coveringChoice, setCoveringChoice] = useState('');
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(Date.now() + 60 * 60 * 1000));
  const [endsAt, setEndsAt] = useState(() => toLocalInputValue(Date.now() + 3 * 60 * 60 * 1000));
  const [currentStatus, setCurrentStatus] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [limit, setLimit] = useState('');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');

  const sortedCoverage = useMemo(
    () => [...state.coverage].sort((a, b) => a.startsAt - b.startsAt),
    [state.coverage],
  );

  const chooseStep = (step: TeamStep) => {
    setMessage('');
    setSearchParams({ step });
  };

  const updateFrame = (frame: AgreementFrame) => {
    setState((previous) => ({
      ...previous,
      agreement: { ...previous.agreement, frame },
    }));
  };

  const adoptAgreement = () => {
    const text = agreementDraft.trim();
    if (!text) {
      setMessage('Write the agreement in your team’s own words before adopting it.');
      return;
    }

    setState((previous) => ({
      ...previous,
      agreement: {
        ...previous.agreement,
        text,
        revision: previous.agreement.revision + 1,
        adoptedAt: Date.now(),
      },
    }));
    setMessage('Team agreement adopted. Next, make sure rest has real coverage.');
  };

  const addAlias = (event: FormEvent) => {
    event.preventDefault();
    const alias = aliasDraft.trim();
    if (!alias) return;

    const exists = state.aliases.some((existing) => existing.toLocaleLowerCase() === alias.toLocaleLowerCase());
    if (exists) {
      setMessage('That alias is already on the team.');
      return;
    }

    setState((previous) => ({
      ...previous,
      aliases: [...previous.aliases, alias],
    }));
    setAliasDraft('');
    setMessage('');
  };

  const addCoverage = (event: FormEvent) => {
    event.preventDefault();
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    const isPause = coveringChoice === '__pause__';
    const coverer = isPause ? undefined : coveringChoice;

    if (!responsibility.trim() || !restingAlias || !coveringChoice || Number.isNaN(start) || Number.isNaN(end)) {
      setMessage('Add the responsibility, who is resting, what happens to the work, and the time window.');
      return;
    }
    if (end <= start) {
      setMessage('The coverage window needs to end after it starts.');
      return;
    }
    if (coverer && coverer === restingAlias) {
      setMessage('The person resting cannot also be their own coverage.');
      return;
    }

    // Coverage guideline: a named handoff starts as proposed and never silently counts as accepted.
    const item: CoverageItem = {
      id: crypto.randomUUID(),
      responsibility: responsibility.trim(),
      restingAlias,
      coveringAlias: coverer,
      startsAt: start,
      endsAt: end,
      status: isPause ? 'paused' : 'proposed',
      handover: {
        currentStatus: currentStatus.trim(),
        nextAction: nextAction.trim(),
        limit: limit.trim(),
        reference: reference.trim(),
      },
    };

    setState((previous) => ({
      ...previous,
      coverage: [...previous.coverage, item],
    }));

    setResponsibility('');
    setCoveringChoice('');
    setCurrentStatus('');
    setNextAction('');
    setLimit('');
    setReference('');
    setMessage(isPause ? 'Work paused by agreement.' : 'Coverage proposed. The receiving person still needs to accept it.');
  };

  const changeCoverageStatus = (id: string, status: CoverageStatus) => {
    const candidate = state.coverage.find((item) => item.id === id);
    if (!candidate) return;

    if (status === 'accepted' && hasAcceptedCoverageConflict(state.coverage, candidate)) {
      setMessage(`${candidate.coveringAlias} already has accepted coverage during part of this window.`);
      return;
    }

    setState((previous) => ({
      ...previous,
      coverage: previous.coverage.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
    setMessage(status === 'accepted' ? 'Coverage accepted.' : STATUS_LABELS[status]);
  };

  const removeCoverage = (id: string) => {
    setState((previous) => ({
      ...previous,
      coverage: previous.coverage.filter((item) => item.id !== id),
    }));
    setMessage('');
  };

  const recordPulse = (answer: PulseAnswer) => {
    if (answer === 'prefer-not') {
      setState((previous) => ({
        ...previous,
        pulse: undefined,
      }));
      setMessage('Nothing recorded. You can still have the conversation together.');
      return;
    }

    setState((previous) => ({
      ...previous,
      pulse: { answer, recordedAt: Date.now() },
    }));
    setMessage('Team reflection recorded on this device.');
  };

  const loadExample = () => {
    const example = createDemoTeamRestState();
    setState(example);
    setAgreementDraft(example.agreement.text);
    setRestingAlias('Cedar');
    setMessage('Loaded a fictional Cedar / Birch / Ash example. Nothing was sent anywhere.');
  };

  const clearTeamData = () => {
    if (!window.confirm('Clear the local team agreement, aliases, coverage, and reflection from this browser?')) return;
    setState(DEFAULT_TEAM_REST_STATE);
    setAgreementDraft(AGREEMENT_STARTER);
    setRestingAlias('');
    setMessage('Team data cleared from this browser.');
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="bg-gradient-to-br from-primary/12 via-card to-ember/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <UsersRound className="size-6" aria-hidden />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-widest text-primary">Team rest</p>
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Make room for people to actually rest.</h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Personal rest works better when the team protects it. Agree on the norm, cover the work, then reflect together.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t" aria-label="Team rest steps">
            <StepButton number="1" label="Agree" active={activeStep === 'agree'} onClick={() => chooseStep('agree')} />
            <StepButton number="2" label="Cover" active={activeStep === 'cover'} onClick={() => chooseStep('cover')} />
            <StepButton number="3" label="Reflect" active={activeStep === 'reflect'} onClick={() => chooseStep('reflect')} />
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-primary/20 bg-secondary/60 px-4 py-3 text-base" role="status">
            {message}
          </div>
        )}

        {activeStep === 'agree' && (
          <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="agree-heading">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
                <ShieldCheck className="size-5" aria-hidden />
                Step 1
              </p>
              <h2 id="agree-heading" className="text-3xl font-semibold">Agree on what protected rest means.</h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Keep it short enough that the team can remember it. The important decisions are what rest protects and what happens when nobody has capacity.
              </p>
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Choose the framing that fits your team.</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FRAME_LABELS) as AgreementFrame[]).map((frame) => (
                  <button
                    key={frame}
                    type="button"
                    aria-pressed={state.agreement.frame === frame}
                    onClick={() => updateFrame(frame)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      state.agreement.frame === frame ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary',
                    )}
                  >
                    {FRAME_LABELS[frame]}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="font-semibold">Our team agreement</span>
              <textarea
                value={agreementDraft}
                onChange={(event) => setAgreementDraft(event.target.value)}
                rows={7}
                maxLength={1200}
                className="w-full rounded-xl border bg-background px-4 py-3 text-lg leading-relaxed outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="font-semibold">Two questions to settle together</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-base text-muted-foreground">
                <li>What does protected rest mean in our work?</li>
                <li>What will we pause, reduce, or postpone when nobody can cover?</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={adoptAgreement}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Check className="size-5" aria-hidden />
                Adopt this agreement
              </button>
              {state.agreement.revision > 0 && (
                <span className="text-base text-muted-foreground">
                  Revision {state.agreement.revision} · adopted {new Date(state.agreement.adoptedAt ?? 0).toLocaleDateString()}
                </span>
              )}
            </div>

            {state.agreement.revision === 0 && state.coverage.length === 0 && (
              <button
                type="button"
                onClick={loadExample}
                className="text-base font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Or load a fictional Cedar / Birch / Ash example
              </button>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => chooseStep('cover')}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Next: cover the work <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          </section>
        )}

        {activeStep === 'cover' && (
          <section className="space-y-6" aria-labelledby="cover-heading">
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
                  <Handshake className="size-5" aria-hidden />
                  Step 2
                </p>
                <h2 id="cover-heading" className="text-3xl font-semibold">Cover the work, not the person.</h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Use aliases by default. A handoff is only covered after the receiving person accepts it. If nobody has capacity, pause the work instead.
                </p>
              </div>

              <form onSubmit={addAlias} className="mt-6 space-y-2">
                <label htmlFor="team-alias" className="font-semibold">Who is on this team?</label>
                <div className="flex gap-2">
                  <input
                    id="team-alias"
                    value={aliasDraft}
                    onChange={(event) => setAliasDraft(event.target.value)}
                    maxLength={32}
                    placeholder="Add an alias, e.g. Cedar"
                    className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border px-4 py-3 font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Add
                  </button>
                </div>
              </form>

              {state.aliases.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Team aliases">
                  {state.aliases.map((alias) => (
                    <span key={alias} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">{alias}</span>
                  ))}
                </div>
              )}

              <form onSubmit={addCoverage} className="mt-8 space-y-5 border-t pt-6">
                <label className="block space-y-2">
                  <span className="font-semibold">What needs coverage?</span>
                  <input
                    value={responsibility}
                    onChange={(event) => setResponsibility(event.target.value)}
                    maxLength={120}
                    placeholder="Community contact, public updates, meeting…"
                    className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="font-semibold">Who is resting?</span>
                    <select
                      value={restingAlias}
                      onChange={(event) => setRestingAlias(event.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Choose an alias</option>
                      {state.aliases.map((alias) => <option key={alias} value={alias}>{alias}</option>)}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="font-semibold">What happens to the work?</span>
                    <select
                      value={coveringChoice}
                      onChange={(event) => setCoveringChoice(event.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Choose coverage</option>
                      {state.aliases
                        .filter((alias) => alias !== restingAlias)
                        .map((alias) => <option key={alias} value={alias}>{alias} can cover</option>)}
                      <option value="__pause__">Nobody has capacity — pause it</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="font-semibold">Starts</span>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="font-semibold">Ends</span>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>

                <details className="rounded-xl border bg-background/60 p-4">
                  <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Add a short handoff <span className="font-normal text-muted-foreground">— optional</span>
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <HandoverField label="Current status" value={currentStatus} onChange={setCurrentStatus} placeholder="Where does this stand?" />
                    <HandoverField label="Next bounded action" value={nextAction} onChange={setNextAction} placeholder="What is the one next action?" />
                    <HandoverField label="Agreed limit" value={limit} onChange={setLimit} placeholder="What should not expand while they rest?" />
                    <HandoverField label="Essential reference" value={reference} onChange={setReference} placeholder="Point to something they already have access to." />
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={state.aliases.length === 0}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Handshake className="size-5" aria-hidden />
                  {coveringChoice === '__pause__' ? 'Pause this work' : 'Propose coverage'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">Coverage plan</h3>
                  <p className="text-base text-muted-foreground">Proposed is not the same as accepted.</p>
                </div>
                <button
                  type="button"
                  onClick={() => chooseStep('reflect')}
                  className="hidden items-center gap-2 rounded-full px-4 py-2 font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                >
                  Reflect <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>

              {sortedCoverage.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
                  <CircleDashed className="mx-auto size-7 text-muted-foreground" aria-hidden />
                  <p className="mt-3 font-semibold">No coverage planned yet.</p>
                  <p className="mx-auto mt-1 max-w-md text-base text-muted-foreground">
                    Start with one real rest window. You do not need to schedule the whole organization.
                  </p>
                </div>
              ) : (
                sortedCoverage.map((item) => (
                  <CoverageCard
                    key={item.id}
                    item={item}
                    onStatus={(status) => changeCoverageStatus(item.id, status)}
                    onRemove={() => removeCoverage(item.id)}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {activeStep === 'reflect' && (
          <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="reflect-heading">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
                <UsersRound className="size-5" aria-hidden />
                Step 3
              </p>
              <h2 id="reflect-heading" className="text-3xl font-semibold">Did our coverage plan hold?</h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Answer once as a team. This is a conversation aid, not an individual wellness score.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PULSE_OPTIONS.map((option) => {
                const selected = option.value !== 'prefer-not' && state.pulse?.answer === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => recordPulse(option.value)}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'border-primary bg-secondary' : 'hover:bg-secondary/60',
                    )}
                  >
                    <span className="block font-semibold">{option.label}</span>
                    <span className="mt-1 block text-base text-muted-foreground">{option.detail}</span>
                  </button>
                );
              })}
            </div>

            {state.pulse && (
              <p className="rounded-xl bg-secondary/60 p-4 text-base">
                Last shared answer: <strong>{PULSE_OPTIONS.find((option) => option.value === state.pulse?.answer)?.label}</strong>
                {' · '}
                {new Date(state.pulse.recordedAt).toLocaleString()}
              </p>
            )}

            <div className="rounded-xl border border-dashed p-4 text-base text-muted-foreground">
              <strong className="text-foreground">Privacy note:</strong> team-rest data stays in this browser and is not published to Nostr.
              Browser storage is not encrypted, so use aliases and keep handoffs minimal—no passwords, beneficiary identities, case histories, or precise sensitive locations.
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Back to my rest
              </Link>
              <button
                type="button"
                onClick={clearTeamData}
                className="rounded-full px-4 py-2 text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear team data
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function StepButton({
  number,
  label,
  active,
  onClick,
}: {
  number: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'step' : undefined}
      onClick={onClick}
      className={cn(
        'flex min-h-16 items-center justify-center gap-2 border-r px-2 text-base font-semibold transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        active ? 'bg-secondary text-primary' : 'hover:bg-secondary/60',
      )}
    >
      <span className={cn(
        'grid size-7 place-items-center rounded-full border text-sm',
        active && 'border-primary bg-primary text-primary-foreground',
      )}>
        {number}
      </span>
      {label}
    </button>
  );
}

function HandoverField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-base font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={240}
        placeholder={placeholder}
        className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function CoverageCard({
  item,
  onStatus,
  onRemove,
}: {
  item: CoverageItem;
  onStatus: (status: CoverageStatus) => void;
  onRemove: () => void;
}) {
  const StatusIcon = item.status === 'accepted'
    ? Check
    : item.status === 'paused'
      ? PauseCircle
      : CircleDashed;

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{formatWindow(item)}</p>
          <h4 className="text-2xl font-semibold">{item.responsibility}</h4>
          <p className="text-base text-muted-foreground">
            <strong className="text-foreground">{item.restingAlias}</strong> rests
            {item.coveringAlias
              ? <> · <strong className="text-foreground">{item.coveringAlias}</strong> covers</>
              : <> · nonessential work is paused</>}
          </p>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold',
          item.status === 'accepted' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
          item.status === 'paused' && 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
          item.status === 'proposed' && 'bg-secondary text-secondary-foreground',
          item.status === 'needs-change' && 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
        )}>
          <StatusIcon className="size-4" aria-hidden />
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      {(item.handover.currentStatus || item.handover.nextAction || item.handover.limit || item.handover.reference) && (
        <details className="mt-4 rounded-xl bg-secondary/50 p-4">
          <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Short handoff
          </summary>
          <dl className="mt-3 grid gap-3 text-base">
            {item.handover.currentStatus && <HandoverRow term="Current status" value={item.handover.currentStatus} />}
            {item.handover.nextAction && <HandoverRow term="Next action" value={item.handover.nextAction} />}
            {item.handover.limit && <HandoverRow term="Limit" value={item.handover.limit} />}
            {item.handover.reference && <HandoverRow term="Reference" value={item.handover.reference} />}
          </dl>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.status !== 'paused' && item.coveringAlias && (
          <>
            {item.status !== 'accepted' && (
              <button
                type="button"
                onClick={() => onStatus('accepted')}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Accept coverage
              </button>
            )}
            {item.status !== 'needs-change' && (
              <button
                type="button"
                onClick={() => onStatus('needs-change')}
                className="rounded-full border px-4 py-2 text-sm font-bold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Needs change
              </button>
            )}
            <button
              type="button"
              onClick={() => onStatus('paused')}
              className="rounded-full border px-4 py-2 text-sm font-bold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Pause work
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function HandoverRow({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold">{term}</dt>
      <dd className="mt-0.5 text-muted-foreground">{value}</dd>
    </div>
  );
}
