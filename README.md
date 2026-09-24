# Restivism

**Rest is resistance.**

Restivism is a rest companion for activists and organizers. It keeps the original
personal loop — check your battery, get a recharge plan, rest, and check in again —
and adds a small team layer so rest can be protected in practice rather than left
as an individual intention.

## How it works

### My rest

1. **Check in.** Set your battery from 1 (running on fumes) to 5 (fully charged).
   The hero art and colors change to match.
2. **Get a plan.** Each level has its own plan: one recharge to do first, two
   alternatives if that one isn't possible right now, and three small care quests.
3. **Recharge.** Start a timed play, sleep, or social session.
4. **Check in again.** Report your battery after the session so you can see what
   the rest did for you.

### Team rest

The optional `/team` flow is deliberately simple:

1. **Agree.** Write a short team agreement about protected rest and what happens
   when nobody has capacity. Movement, secular, and faith framings are available.
2. **Cover.** Use aliases by default, propose a bounded handoff, and require the
   receiving person to explicitly accept it. If nobody can cover nonessential work,
   pause it instead of silently returning it to the person who is resting.
3. **Reflect.** Record one shared team answer to “Did our coverage plan hold?” or
   choose not to record an answer.

Handoffs are optional and intentionally minimal: current status, next bounded
action, agreed limit, and an essential reference the receiver already has access to.

## Privacy

Restivism has no analytics and the personal-rest state stays in browser
`localStorage` under `restivism:state`.

The team-rest layer is also local by default, stored separately under
`restivism:team-rest`. Team agreements, aliases, coverage plans, handoffs, and
the team pulse are **not published to Nostr**. Browser storage is not encrypted, so
the UI recommends aliases and warns users not to store passwords, beneficiary
identities, case histories, or precise sensitive locations.

Clearing site data resets the app.

## Features

- Battery check-in with level-matched artwork and a plan for each level
- Session timer with wall-clock timing and screen wake lock where supported
- Chime and Taps synthesized with Web Audio
- Team agreement with revision tracking
- Alias-first coverage planning
- Explicit proposed → accepted coverage state
- Overlap protection for accepted coverage assigned to the same alias
- “Pause work” path when nobody has capacity
- Optional minimal handoff notes
- One shared team-level reflection, not individual mood or performance tracking
- Fictional Cedar / Birch / Ash demo data for presentations
- No streaks, points, badges, leaderboards, or individual wellness scoring
- Syncs local state across open tabs
- Respects `prefers-reduced-motion`; keyboard and screen-reader friendly
- Installable as a web app via the manifest

## Development

Requires Node.js 22 or newer.

```sh
npm run dev     # start the Vite dev server
npm run build   # production build into dist/
npm run test    # type check, lint, unit tests, and build
```

Run `npm run test` before committing; it must pass.

### Stack

React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui on Radix, React Router, and
TanStack Query. The project is built on [MKStack](https://soapbox.pub/mkstack), so
Nostr plumbing (Nostrify, login, relay config) is present. The team-rest feature
intentionally does not publish its sensitive operational data to Nostr.

### Layout

```
src/
├── lib/rest.ts                   # Personal recharge plans and state types
├── lib/teamRest.ts               # Team agreement, coverage, pulse domain model
├── components/RestProvider.tsx   # localStorage-backed personal state
├── components/rest/              # Battery, plan, timer shell
└── pages/
    ├── Index.tsx                 # Personal check-in and recharge plan
    ├── RestSession.tsx           # /rest/:practiceId timer flow
    └── TeamRest.tsx              # /team Agree → Cover → Reflect flow
```

## Deployment

The build is a static site. Pushes to `main` deploy to GitHub Pages
(`.github/workflows/deploy.yml`); `.gitlab-ci.yml` does the same for GitLab Pages.

It is also published to Nostr as a named [nsite](https://nsyte.run), `restivism`,
configured in `.nsite/config.json`.
