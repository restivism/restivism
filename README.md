# Restivism

**Rest is resistance.**

Restivism is a rest companion for activists and organizers. It keeps the original
personal loop — check your battery, get a recharge plan, rest, and check in again —
and adds a simple organization layer so rest can be protected by the group instead
of depending on one person to push through.

## How it works

### My rest

1. **Check in.** Set your battery from 1 (running on fumes) to 5 (fully charged).
   Or say it out loud: speak for up to 30 seconds and Restivism suggests a level
   from how your voice sounds — loudness, tone (pitch movement), and emphasis.
   You confirm the suggestion or tap the level that feels true.
2. **Get a plan.** Restivism recommends play, sleep, or social time plus a few small
   acts of care.
3. **Recharge.** Start a timed rest session.
4. **Check in again.** See how your battery changed.

When a battery is low or middling, the plan can send the user directly to their
organization's coverage area so the team can make room for the rest.

### Organization rest

The optional `/team` area now begins with an organization gate.

**Organization leaders**:
1. Create an organization.
2. Choose their name or alias.
3. Create a passcode.
4. Share the generated invite code and the passcode separately.

**Members**:
1. Paste the organization invite code.
2. Enter the leader-created passcode.
3. Choose the name or alias they want to use.

The passcode is not stored inside the invite code. The invite metadata is encrypted
in the browser with a key derived from the passcode using PBKDF2-SHA-256 and
AES-256-GCM.

Once inside an organization, the experience is deliberately small:

1. **Agree — Our rest agreement.** A simple covenant with three memorable promises:
   rest time is protected; coverage only counts when accepted; and when nobody has
   capacity, nonessential work can wait. Organizations may add one short sentence
   in their own words.
2. **Cover — Make room for the rest.** Record who is resting, what needs attention,
   the day, and either who can cover or that the work should pause. A coverage
   request stays **Waiting** until someone marks it accepted.
3. **Reflect — Did our rest plan hold?** One shared organization answer:
   **Yes / Partly / No**. This is not an individual wellness score.

The coverage form has one optional handoff note instead of a multi-field handover.

## Organization data boundaries

Each organization gets a different local storage namespace:

```
restivism:organization:<organization-id>:rest
```

The UI only loads the current organization's agreement, coverage, and reflection.
Switching organizations switches the visible data set.

Organization membership is stored separately in `restivism:organizations`.
Leaving an organization removes that membership from the app on that device; the
invite + passcode are required to join it again.

### Current prototype limitation

The invite + passcode can be used to join the same organization identity on another
device, but this branch does **not yet synchronize organization data between
devices**. Agreements, coverage, and reflections are currently local-first browser
data, not server-enforced authorization.

That distinction is intentional for this iteration: the organization UX and data
isolation model can be tested without publishing sensitive operational information
to Nostr or inventing a weak shared-key sync scheme.

## Privacy

- Personal rest state stays in browser `localStorage` under `restivism:state`.
- Voice check-ins are analysed in the browser with the Web Audio API. Audio is
  never recorded, stored, or sent, and the words are never transcribed. Only the
  level the user confirms is saved.
- Organization rest records are namespaced by organization ID.
- Organization agreement, coverage, and reflection data are not published to Nostr.
- There is no analytics, streak system, leaderboard, or individual performance
  ranking.
- Browser storage itself is not encrypted. Sensitive case details, passwords,
  beneficiary identities, or precise sensitive locations should not be entered.

## Features

- Battery check-in with level-matched recharge plans
- Optional voice check-in measuring loudness, tone, and emphasis on the device
- Timed play, sleep, and social rest sessions
- Create or join an organization
- Leader-created passcode + encrypted organization invite
- Multiple organizations on one device with explicit organization switching
- Simple three-promise rest agreement / covenant
- Simple coverage request with **Waiting / Covered / Paused**
- Explicit acceptance before coverage counts
- Pause-work path when nobody has capacity
- One optional handoff note
- One organization-level reflection
- Fictional Cedar / Birch demo data
- No gamification or individual wellness scoring
- Keyboard and screen-reader friendly
- Installable web app

## Development

Requires Node.js 22 or newer.

```sh
npm run dev
npm run build
npm run test
```

Run `npm run test` before merging.

### Layout

```
src/
├── lib/rest.ts                  # Personal recharge plans and state
├── lib/organization.ts          # Passcode-protected organization invites
├── lib/teamRest.ts              # Simplified org agreement, coverage, reflection
├── components/RestProvider.tsx
├── components/rest/
└── pages/
    ├── Index.tsx
    ├── RestSession.tsx
    └── TeamRest.tsx             # Organization gate + organization rest workspace
```

## Deployment

The build is a static site. Pushes to `main` deploy to GitHub Pages
(`.github/workflows/deploy.yml`). It is also published to Nostr as the named
nsite `restivism`.
