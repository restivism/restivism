import { useSeoMeta } from '@unhead/react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clipboard,
  CircleDashed,
  Handshake,
  KeyRound,
  LogOut,
  PauseCircle,
  Plus,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/rest/AppShell';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  createOrganizationInvite,
  DEFAULT_ORGANIZATION_DIRECTORY,
  openOrganizationInvite,
  type OrganizationDirectory,
  type OrganizationMembership,
} from '@/lib/organization';
import {
  agreementSummary,
  createDemoOrganizationRestState,
  DEFAULT_ORGANIZATION_REST_STATE,
  type AlignmentScore,
  type CoverageItem,
  type OrganizationRestState,
  type PulseAnswer,
} from '@/lib/teamRest';
import { cn } from '@/lib/utils';

const DIRECTORY_KEY = 'restivism:organizations';
const ALIGNMENT_LEVELS: ReadonlyArray<{ score: AlignmentScore; emoji: string; label: string }> = [
  { score: 1, emoji: '😟', label: 'Not aligned' },
  { score: 2, emoji: '😕', label: 'Some concerns' },
  { score: 3, emoji: '🤔', label: 'Unsure' },
  { score: 4, emoji: '🙂', label: 'Mostly aligned' },
  { score: 5, emoji: '🤝', label: 'Fully aligned' },
];
const ALIGNMENT_PRIVACY_THRESHOLD = 3;

function localDateValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function sameName(a: string, b: string) {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

export default function TeamRest() {
  useSeoMeta({
    title: 'Organization rest | Restivism',
    description: 'Create or join an organization, protect rest with a simple agreement, cover the work, and reflect together.',
  });

  const [directory, setDirectory] = useLocalStorage<OrganizationDirectory>(
    DIRECTORY_KEY,
    DEFAULT_ORGANIZATION_DIRECTORY,
  );
  const [searchParams] = useSearchParams();

  const current = directory.memberships.find(
    (membership) => membership.id === directory.currentOrganizationId,
  );

  const setCurrentOrganization = (organizationId: string) => {
    setDirectory((previous) => ({
      ...previous,
      currentOrganizationId: organizationId,
    }));
  };

  const addMembership = (membership: OrganizationMembership) => {
    setDirectory((previous) => {
      const existing = previous.memberships.find((item) => item.id === membership.id);
      const merged: OrganizationMembership = existing
        ? {
            ...membership,
            role: existing.role === 'leader' ? 'leader' : membership.role,
            inviteCode: existing.inviteCode ?? membership.inviteCode,
          }
        : membership;

      return {
        ...previous,
        memberships: [
          ...previous.memberships.filter((item) => item.id !== merged.id),
          merged,
        ],
        currentOrganizationId: merged.id,
      };
    });
  };

  const leaveOrganization = (organizationId: string) => {
    if (!window.confirm('Leave this organization on this device? You can only get back in with its invite code and passcode.')) {
      return;
    }

    setDirectory((previous) => {
      const memberships = previous.memberships.filter((item) => item.id !== organizationId);
      return {
        ...previous,
        memberships,
        currentOrganizationId: memberships[0]?.id,
      };
    });
  };

  return (
    <AppShell>
      {!current ? (
        <OrganizationGate
          memberships={directory.memberships}
          onSelect={setCurrentOrganization}
          onJoin={addMembership}
        />
      ) : (
        <OrganizationWorkspace
          key={current.id}
          membership={current}
          memberships={directory.memberships}
          requestedFocus={searchParams.get('focus')}
          onSelectOrganization={setCurrentOrganization}
          onLeave={() => leaveOrganization(current.id)}
        />
      )}
    </AppShell>
  );
}

function OrganizationGate({
  memberships,
  onSelect,
  onJoin,
}: {
  memberships: OrganizationMembership[];
  onSelect: (organizationId: string) => void;
  onJoin: (membership: OrganizationMembership) => void;
}) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [organizationName, setOrganizationName] = useState('');
  const [alias, setAlias] = useState('');
  const [passcode, setPasscode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const createOrganization = async (event: FormEvent) => {
    event.preventDefault();
    const name = organizationName.trim();
    const person = alias.trim();

    if (!name || !person) {
      setMessage('Add your organization name and the name or alias you want to use.');
      return;
    }
    if (passcode.length < 6) {
      setMessage('Choose a passcode with at least 6 characters.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const result = await createOrganizationInvite(name, passcode);
      onJoin({
        id: result.organization.id,
        name: result.organization.name,
        alias: person,
        role: 'leader',
        joinedAt: Date.now(),
        inviteCode: result.inviteCode,
      });
    } catch {
      setMessage('Could not create the organization on this device.');
    } finally {
      setBusy(false);
    }
  };

  const joinOrganization = async (event: FormEvent) => {
    event.preventDefault();
    const person = alias.trim();

    if (!inviteCode.trim() || !person || !passcode) {
      setMessage('Paste the organization invite, enter the passcode, and choose your name or alias.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const organization = await openOrganizationInvite(inviteCode, passcode);
      onJoin({
        id: organization.id,
        name: organization.name,
        alias: person,
        role: 'member',
        joinedAt: Date.now(),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not join that organization.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary/12 via-card to-ember/10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="size-6" aria-hidden />
            </span>
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">Organization rest</p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Rest works better when the team protects it.</h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Create your organization or join one with the passcode your organization leader created.
              </p>
            </div>
          </div>
        </div>
      </section>

      {memberships.length > 0 && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Already on this device</p>
          <div className="mt-3 grid gap-2">
            {memberships.map((membership) => (
              <button
                key={membership.id}
                type="button"
                onClick={() => onSelect(membership.id)}
                className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <span className="block font-semibold">{membership.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {membership.alias} · {membership.role === 'leader' ? 'Leader' : 'Member'}
                  </span>
                </span>
                <ArrowRight className="size-5 text-primary" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
        <div className="grid grid-cols-2 rounded-xl bg-secondary/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setMessage('');
            }}
            className={cn(
              'rounded-lg px-4 py-2.5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'create' && 'bg-card text-primary shadow-sm',
            )}
          >
            Create organization
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setMessage('');
            }}
            className={cn(
              'rounded-lg px-4 py-2.5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'join' && 'bg-card text-primary shadow-sm',
            )}
          >
            Join organization
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-xl border border-primary/20 bg-secondary/50 px-4 py-3 text-base" role="status">
            {message}
          </p>
        )}

        {mode === 'create' ? (
          <form onSubmit={createOrganization} className="mt-6 space-y-5">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold">Create your organization</h2>
              <p className="text-lg text-muted-foreground">
                The leader chooses one passcode. Members will need both the invite code and that passcode to join.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="font-semibold">Organization name</span>
              <input
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                maxLength={80}
                placeholder="Community Care Collective"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="block space-y-2">
              <span className="font-semibold">Your name or alias</span>
              <input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                maxLength={40}
                placeholder="Cedar"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 font-semibold">
                <KeyRound className="size-4" aria-hidden />
                Organization passcode
              </span>
              <input
                type="password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="block text-sm text-muted-foreground">
                Restivism does not put the passcode inside the invite code.
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Building2 className="size-5" aria-hidden />
              {busy ? 'Creating…' : 'Create organization'}
            </button>
          </form>
        ) : (
          <form onSubmit={joinOrganization} className="mt-6 space-y-5">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold">Join your organization</h2>
              <p className="text-lg text-muted-foreground">
                Ask your organization leader for the invite code and the separate passcode.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="font-semibold">Organization invite code</span>
              <textarea
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                rows={4}
                spellCheck={false}
                placeholder="Paste the invite code here"
                className="w-full rounded-xl border bg-background px-4 py-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="block space-y-2">
              <span className="font-semibold">Passcode</span>
              <input
                type="password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                autoComplete="current-password"
                placeholder="Passcode from your organization leader"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="block space-y-2">
              <span className="font-semibold">Your name or alias</span>
              <input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                maxLength={40}
                placeholder="Birch"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <KeyRound className="size-5" aria-hidden />
              {busy ? 'Joining…' : 'Join organization'}
            </button>
          </form>
        )}
      </section>

      <p className="px-2 text-sm leading-relaxed text-muted-foreground">
        Prototype note: the invite + passcode controls organization membership, and each organization gets a separate local data space.
        Ongoing cross-device synchronization is not enabled in this branch yet.
      </p>
    </div>
  );
}

function OrganizationWorkspace({
  membership,
  memberships,
  requestedFocus,
  onSelectOrganization,
  onLeave,
}: {
  membership: OrganizationMembership;
  memberships: OrganizationMembership[];
  requestedFocus: string | null;
  onSelectOrganization: (organizationId: string) => void;
  onLeave: () => void;
}) {
  const storageKey = `restivism:organization:${membership.id}:rest`;
  const [state, setState] = useLocalStorage<OrganizationRestState>(
    storageKey,
    DEFAULT_ORGANIZATION_REST_STATE,
  );

  const coverageRef = useRef<HTMLElement>(null);
  const [editingAgreement, setEditingAgreement] = useState(
    membership.role === 'leader' && state.agreement.revision === 0,
  );
  const [agreementDraft, setAgreementDraft] = useState(state.agreement);
  const [restingPerson, setRestingPerson] = useState(membership.alias);
  const [work, setWork] = useState('');
  const [coverageAction, setCoverageAction] = useState<'cover' | 'pause'>('cover');
  const [coveringPerson, setCoveringPerson] = useState('');
  const [date, setDate] = useState(localDateValue);
  const [handoffNote, setHandoffNote] = useState('');
  const [showCoverageForm, setShowCoverageForm] = useState(() => requestedFocus === 'coverage');
  const [message, setMessage] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (requestedFocus !== 'coverage') return;
    const id = window.setTimeout(() => {
      coverageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(id);
  }, [requestedFocus]);

  const saveAgreement = () => {
    if (membership.role !== 'leader') {
      setMessage('Only an organization leader can change the rest agreement.');
      return;
    }

    setState((previous) => ({
      ...previous,
      agreement: {
        ...agreementDraft,
        note: agreementDraft.note.trim(),
        revision: previous.agreement.revision + 1,
        adoptedAt: Date.now(),
      },
    }));
    setEditingAgreement(false);
    setMessage('Rest agreement saved for this organization.');
  };

  const toggleAgreementPromise = (
    field: 'protectedRest' | 'acceptedCoverage' | 'pauseWhenFull',
  ) => {
    if (membership.role !== 'leader') return;

    setAgreementDraft((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const addCoverage = (event: FormEvent) => {
    event.preventDefault();

    if (!restingPerson.trim() || !work.trim() || !date) {
      setMessage('Add who is resting, what needs attention, and the day.');
      return;
    }
    if (coverageAction === 'cover' && !coveringPerson.trim()) {
      setMessage('Add who can cover, or choose “Pause this work.”');
      return;
    }
    if (coverageAction === 'cover' && sameName(restingPerson, coveringPerson)) {
      setMessage('The person resting cannot also cover their own work.');
      return;
    }

    const item: CoverageItem = {
      id: crypto.randomUUID(),
      restingPerson: restingPerson.trim(),
      work: work.trim(),
      coveringPerson: coverageAction === 'cover' ? coveringPerson.trim() : undefined,
      date,
      note: handoffNote.trim(),
      status: coverageAction === 'pause' ? 'paused' : 'waiting',
    };

    setState((previous) => ({
      ...previous,
      coverage: [item, ...previous.coverage],
    }));

    setWork('');
    setCoveringPerson('');
    setHandoffNote('');
    setCoverageAction('cover');
    setShowCoverageForm(false);
    setMessage(
      item.status === 'paused'
        ? 'That work is paused so the rest window can stay protected.'
        : 'Coverage request added. It is not covered until the handoff is accepted.',
    );
  };

  const markCovered = (itemId: string) => {
    setState((previous) => ({
      ...previous,
      coverage: previous.coverage.map((item) => (
        item.id === itemId ? { ...item, status: 'covered' } : item
      )),
    }));
    setMessage('Coverage accepted.');
  };

  const removeCoverage = (itemId: string) => {
    setState((previous) => ({
      ...previous,
      coverage: previous.coverage.filter((item) => item.id !== itemId),
    }));
  };

  const submitAlignment = (score: AlignmentScore, responseId: string) => {
    if (membership.role !== 'member' || state.agreement.revision === 0) return;

    setState((previous) => {
      const responses = previous.alignmentResponses ?? [];
      const response = {
        id: responseId,
        agreementRevision: previous.agreement.revision,
        score,
        recordedAt: Date.now(),
      };

      return {
        ...previous,
        alignmentResponses: [
          ...responses.filter((item) => !(
            item.id === responseId &&
            item.agreementRevision === previous.agreement.revision
          )),
          response,
        ],
      };
    });
    setMessage('Your covenant alignment was recorded anonymously in the organization data.');
  };

  const recordPulse = (answer: PulseAnswer) => {
    setState((previous) => ({
      ...previous,
      pulse: {
        answer,
        recordedAt: Date.now(),
      },
    }));
    setMessage('Organization check-in saved on this device.');
  };

  const copyInvite = async () => {
    if (!membership.inviteCode) return;

    try {
      await navigator.clipboard.writeText(membership.inviteCode);
      setMessage('Invite code copied. Share the passcode separately.');
    } catch {
      setShowInvite(true);
      setMessage('Copy the invite code below and share the passcode separately.');
    }
  };

  const loadDemo = () => {
    const demo = createDemoOrganizationRestState();
    setState(demo);
    setAgreementDraft(demo.agreement);
    setEditingAgreement(false);
    setMessage('Loaded fictional Cedar / Birch demo data for this organization.');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Building2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                {membership.role === 'leader' ? 'Organization leader' : 'Organization member'}
              </p>
              <h1 className="truncate text-3xl font-semibold sm:text-4xl">{membership.name}</h1>
              <p className="text-base text-muted-foreground">You are here as {membership.alias}.</p>
            </div>
          </div>

          {memberships.length > 1 && (
            <label className="space-y-1 text-sm font-semibold text-muted-foreground">
              <span className="block">Switch organization</span>
              <select
                value={membership.id}
                onChange={(event) => onSelectOrganization(event.target.value)}
                className="rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {memberships.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {membership.role === 'leader' && membership.inviteCode && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-5">
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Clipboard className="size-4" aria-hidden />
              Copy member invite
            </button>
            <button
              type="button"
              onClick={() => setShowInvite((visible) => !visible)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showInvite ? 'Hide invite' : 'Show invite'}
            </button>
          </div>
        )}

        {showInvite && membership.inviteCode && (
          <div className="mt-4 rounded-xl bg-secondary/60 p-4">
            <p className="font-semibold">Organization invite code</p>
            <p className="mt-2 break-all font-mono text-xs leading-relaxed">{membership.inviteCode}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Send the passcode separately. The passcode is not contained in this code.
            </p>
          </div>
        )}
      </section>

      {message && (
        <div className="rounded-xl border border-primary/20 bg-secondary/50 px-4 py-3 text-base" role="status">
          {message}
        </div>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">1 · Agree</p>
            <h2 className="text-2xl font-semibold">Our rest covenant</h2>
            <p className="text-base text-muted-foreground">
              Leaders steward the covenant. Members can say how aligned they feel without attaching their name.
            </p>
          </div>
        </div>

        {membership.role === 'leader' && editingAgreement ? (
          <div className="mt-5 space-y-4">
            <AgreementPromise
              checked={agreementDraft.protectedRest}
              onChange={() => toggleAgreementPromise('protectedRest')}
              title="Rest time is protected."
              detail="We do not quietly pull someone back into the work during agreed rest."
            />
            <AgreementPromise
              checked={agreementDraft.acceptedCoverage}
              onChange={() => toggleAgreementPromise('acceptedCoverage')}
              title="Coverage must be accepted."
              detail="Naming someone does not count as coverage until they agree."
            />
            <AgreementPromise
              checked={agreementDraft.pauseWhenFull}
              onChange={() => toggleAgreementPromise('pauseWhenFull')}
              title="If nobody has capacity, the work can wait."
              detail="We pause, reduce, or postpone nonessential work instead of overloading someone else."
            />

            <label className="block space-y-2">
              <span className="font-semibold">
                One sentence in your own words <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <input
                value={agreementDraft.note}
                onChange={(event) => setAgreementDraft((previous) => ({ ...previous, note: event.target.value }))}
                maxLength={240}
                placeholder="What do we want to remember when things get busy?"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveAgreement}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Check className="size-4" aria-hidden />
                Publish covenant
              </button>
              {state.agreement.revision > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAgreementDraft(state.agreement);
                    setEditingAgreement(false);
                  }}
                  className="rounded-full px-4 py-2.5 font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : state.agreement.revision === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed px-5 py-6">
            <p className="font-semibold">The covenant has not been published yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {membership.role === 'leader'
                ? 'Create the first covenant so members have something concrete to align around.'
                : 'An organization leader needs to publish the covenant first.'}
            </p>
            {membership.role === 'leader' && (
              <button
                type="button"
                onClick={() => setEditingAgreement(true)}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Create covenant
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-secondary/55 p-4">
              <p className="font-semibold">{agreementSummary(state.agreement)}</p>
              {state.agreement.note && (
                <p className="mt-2 text-base text-muted-foreground">“{state.agreement.note}”</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {membership.role === 'leader' && (
                <button
                  type="button"
                  onClick={() => {
                    setAgreementDraft(state.agreement);
                    setEditingAgreement(true);
                  }}
                  className="rounded-full border px-4 py-2 text-sm font-bold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Edit covenant
                </button>
              )}
              <span className="text-sm text-muted-foreground">
                Revision {state.agreement.revision}
                {state.agreement.adoptedAt ? ` · ${new Date(state.agreement.adoptedAt).toLocaleDateString()}` : ''}
              </span>
            </div>

            {membership.role === 'member' ? (
              <MemberCovenantAlignment
                key={state.agreement.revision}
                organizationId={membership.id}
                membershipJoinedAt={membership.joinedAt}
                revision={state.agreement.revision}
                onSubmit={submitAlignment}
              />
            ) : (
              <LeaderAlignmentSummary
                responses={(state.alignmentResponses ?? []).filter(
                  (response) => response.agreementRevision === state.agreement.revision,
                )}
              />
            )}
          </div>
        )}
      </section>

      <section ref={coverageRef} className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
              <Handshake className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">2 · Cover</p>
              <h2 className="text-2xl font-semibold">Make room for the rest.</h2>
              <p className="text-base text-muted-foreground">
                Keep it small: who rests, what needs attention, and whether someone covers or the work waits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCoverageForm((visible) => !visible)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" aria-hidden />
            Add coverage
          </button>
        </div>

        {showCoverageForm && (
          <form onSubmit={addCoverage} className="mt-5 space-y-4 rounded-2xl border bg-background/60 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="font-semibold">Who is resting?</span>
                <input
                  value={restingPerson}
                  onChange={(event) => setRestingPerson(event.target.value)}
                  maxLength={40}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="block space-y-2">
                <span className="font-semibold">Day</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="font-semibold">What needs attention while they rest?</span>
              <input
                value={work}
                onChange={(event) => setWork(event.target.value)}
                maxLength={120}
                placeholder="Community inbox, meeting, public update…"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={coverageAction === 'cover'}
                onClick={() => setCoverageAction('cover')}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  coverageAction === 'cover' ? 'border-primary bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                <span className="block font-semibold">Someone can cover</span>
                <span className="mt-1 block text-sm text-muted-foreground">The handoff still needs to be accepted.</span>
              </button>
              <button
                type="button"
                aria-pressed={coverageAction === 'pause'}
                onClick={() => setCoverageAction('pause')}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  coverageAction === 'pause' ? 'border-primary bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                <span className="block font-semibold">Pause this work</span>
                <span className="mt-1 block text-sm text-muted-foreground">Nobody has capacity, so it waits.</span>
              </button>
            </div>

            {coverageAction === 'cover' && (
              <label className="block space-y-2">
                <span className="font-semibold">Who can cover?</span>
                <input
                  value={coveringPerson}
                  onChange={(event) => setCoveringPerson(event.target.value)}
                  maxLength={40}
                  placeholder="Birch"
                  className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            )}

            <label className="block space-y-2">
              <span className="font-semibold">One handoff note <span className="font-normal text-muted-foreground">(optional)</span></span>
              <input
                value={handoffNote}
                onChange={(event) => setHandoffNote(event.target.value)}
                maxLength={240}
                placeholder="Urgent replies only; everything else can wait."
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {coverageAction === 'pause' ? 'Pause the work' : 'Request coverage'}
              </button>
              <button
                type="button"
                onClick={() => setShowCoverageForm(false)}
                className="rounded-full px-4 py-2.5 font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 space-y-3">
          {state.coverage.length === 0 ? (
            <div className="rounded-xl border border-dashed px-5 py-8 text-center">
              <CircleDashed className="mx-auto size-6 text-muted-foreground" aria-hidden />
              <p className="mt-2 font-semibold">No coverage planned yet.</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Start with one real rest window. You do not need to build a full schedule.
              </p>
            </div>
          ) : (
            state.coverage.map((item) => (
              <CoverageRow
                key={item.id}
                item={item}
                onAccept={() => markCovered(item.id)}
                onRemove={() => removeCoverage(item.id)}
              />
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
            <UsersRound className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">3 · Reflect</p>
            <h2 className="text-2xl font-semibold">Did our rest plan hold?</h2>
            <p className="text-base text-muted-foreground">
              One shared answer for the organization. No individual wellness score.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {([
            ['yes', 'Yes'],
            ['partly', 'Partly'],
            ['no', 'No'],
          ] as const).map(([answer, label]) => (
            <button
              key={answer}
              type="button"
              aria-pressed={state.pulse?.answer === answer}
              onClick={() => recordPulse(answer)}
              className={cn(
                'rounded-xl border px-3 py-4 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                state.pulse?.answer === answer ? 'border-primary bg-secondary text-primary' : 'hover:bg-secondary/60',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {state.pulse && (
          <p className="mt-3 text-sm text-muted-foreground">
            Last organization check-in: {new Date(state.pulse.recordedAt).toLocaleString()}
          </p>
        )}
      </section>

      {membership.role === 'leader' && state.agreement.revision === 0 && state.coverage.length === 0 && (
        <button
          type="button"
          onClick={loadDemo}
          className="text-base font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Load a fictional Cedar / Birch example
        </button>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to my rest
        </Link>
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" aria-hidden />
          Leave organization on this device
        </button>
      </section>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Organization data is separated by organization ID in this browser. This branch does not yet synchronize agreements,
        coverage, or reflections between devices, so it should be treated as a local-first prototype rather than server-enforced authorization.
      </p>
    </div>
  );
}

function MemberCovenantAlignment({
  organizationId,
  membershipJoinedAt,
  revision,
  onSubmit,
}: {
  organizationId: string;
  membershipJoinedAt: number;
  revision: number;
  onSubmit: (score: AlignmentScore, responseId: string) => void;
}) {
  const storagePrefix = `restivism:alignment:${organizationId}:${membershipJoinedAt}:r${revision}`;
  const [savedScore, setSavedScore] = useLocalStorage<number>(`${storagePrefix}:score`, 0);
  const [responseId, setResponseId] = useLocalStorage<string>(`${storagePrefix}:id`, crypto.randomUUID());
  const [draftScore, setDraftScore] = useState<AlignmentScore>(
    savedScore >= 1 && savedScore <= 5 ? savedScore as AlignmentScore : 3,
  );

  const selected = ALIGNMENT_LEVELS.find((level) => level.score === draftScore) ?? ALIGNMENT_LEVELS[2];

  const submit = () => {
    setSavedScore(draftScore);
    setResponseId(responseId);
    onSubmit(draftScore, responseId);
  };

  return (
    <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
      <div className="space-y-1">
        <p className="font-semibold">How aligned do you feel with this covenant?</p>
        <p className="text-sm text-muted-foreground">
          Your name or alias is not stored with this response. You can update it anytime while this revision is current.
        </p>
      </div>

      <div className="mt-5 text-center" aria-live="polite">
        <div className="text-5xl" aria-hidden>{selected.emoji}</div>
        <p className="mt-2 font-semibold">{selected.label}</p>
      </div>

      <label className="mt-5 block">
        <span className="sr-only">Covenant alignment from 1 to 5</span>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={draftScore}
          onChange={(event) => setDraftScore(Number(event.target.value) as AlignmentScore)}
          className="w-full accent-primary"
          aria-valuetext={selected.label}
        />
      </label>

      <div className="mt-1 flex justify-between text-xl" aria-hidden>
        {ALIGNMENT_LEVELS.map((level) => <span key={level.score}>{level.emoji}</span>)}
      </div>

      <button
        type="button"
        onClick={submit}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {savedScore ? 'Update my anonymous response' : 'Share anonymously'}
      </button>
    </div>
  );
}

function LeaderAlignmentSummary({
  responses,
}: {
  responses: Array<{ score: AlignmentScore; recordedAt: number }>;
}) {
  const count = responses.length;

  if (count < ALIGNMENT_PRIVACY_THRESHOLD) {
    return (
      <div className="rounded-2xl border border-dashed p-4">
        <p className="font-semibold">Anonymous covenant alignment</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {count === 0 ? 'No member responses yet.' : `${count} anonymous response${count === 1 ? '' : 's'} received.`}
          {' '}Results appear after at least {ALIGNMENT_PRIVACY_THRESHOLD} responses to reduce the chance of identifying an individual response.
        </p>
      </div>
    );
  }

  const average = responses.reduce((sum, response) => sum + response.score, 0) / count;
  const rounded = Math.max(1, Math.min(5, Math.round(average))) as AlignmentScore;
  const summary = ALIGNMENT_LEVELS.find((level) => level.score === rounded) ?? ALIGNMENT_LEVELS[2];

  return (
    <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Anonymous covenant alignment</p>
          <p className="text-sm text-muted-foreground">{count} responses · current revision only</p>
        </div>
        <div className="text-right">
          <span className="text-3xl" aria-hidden>{summary.emoji}</span>
          <p className="text-sm font-semibold">{average.toFixed(1)} / 5</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {ALIGNMENT_LEVELS.map((level) => {
          const levelCount = responses.filter((response) => response.score === level.score).length;
          const percent = Math.round((levelCount / count) * 100);

          return (
            <div key={level.score} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-sm">
              <span aria-hidden>{level.emoji}</span>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-right text-muted-foreground">{percent}%</span>
              <span className="sr-only">{level.label}: {levelCount} responses</span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        The leader view never displays member names with ratings. This local-first prototype does not yet provide cryptographic anonymity across devices.
      </p>
    </div>
  );
}

function AgreementPromise({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked && 'border-primary/40 bg-secondary/60',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border',
          checked && 'border-primary bg-primary text-primary-foreground',
        )}
        aria-hidden
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function CoverageRow({
  item,
  onAccept,
  onRemove,
}: {
  item: CoverageItem;
  onAccept: () => void;
  onRemove: () => void;
}) {
  const status = item.status === 'covered'
    ? { label: 'Covered', icon: CheckCircle2, classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' }
    : item.status === 'paused'
      ? { label: 'Paused', icon: PauseCircle, classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' }
      : { label: 'Waiting', icon: CircleDashed, classes: 'bg-secondary text-secondary-foreground' };
  const StatusIcon = status.icon;

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {new Date(`${item.date}T12:00:00`).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <h3 className="text-xl font-semibold">{item.work}</h3>
          <p className="text-base text-muted-foreground">
            <strong className="text-foreground">{item.restingPerson}</strong> rests
            {item.coveringPerson
              ? <> · <strong className="text-foreground">{item.coveringPerson}</strong> covers</>
              : <> · this work waits</>}
          </p>
          {item.note && <p className="text-sm text-muted-foreground">{item.note}</p>}
        </div>

        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold', status.classes)}>
          <StatusIcon className="size-4" aria-hidden />
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.status === 'waiting' && (
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Mark accepted
          </button>
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
