# Restful

**Rest is resistance.**

Restful is a rest companion for activists and organizers. People who do movement
work tend to push until they burn out. Restful asks one question, "How is your
battery?", and gives you a plan to recharge before you run empty.

## How it works

1. **Check in.** Set your battery from 1 (running on fumes) to 5 (fully charged).
   The hero art and colors change to match.
2. **Get a plan.** Each level has its own plan: one recharge to do first, two
   alternatives if that one isn't possible right now, and three small care quests
   to tick off for the day.
3. **Recharge.** Start a timed session of one of three kinds:

   | Recharge        | What it is                                           | Lengths (min) |
   | --------------- | ---------------------------------------------------- | ------------- |
   | **Play time**   | Something purely for fun. It doesn't have to be useful. | 15, 30, 60    |
   | **Sleep time**  | Lie down; a soft chime wakes you at the end.        | 20, 30, 90    |
   | **Social time** | Time with someone you like, not talking about the work. | 15, 30, 60    |

   While the timer runs, gentle prompts rotate every minute. You can pause, or end
   early and still get credit for the minutes you rested.
4. **Check in again.** When the session ends, report your battery a second time so
   you can see what the rest did for you.

The plans lean on rest harder the lower you are: an empty battery gets 90 minutes
of sleep and a nudge to cancel something, while a full battery gets encouragement
to protect it. If you check in at empty, the app plays Taps (you can mute it).

## Privacy

Restful has no account, no server, and no analytics. Everything (check-ins,
sessions, completed quests, and settings) is stored in your browser's
`localStorage` under the `restful:state` key and never leaves your device.
Clearing site data resets the app.

## Features

- Battery check-in with level-matched artwork and a plan for each level
- Session timer that uses wall-clock time, so it stays accurate when the tab is in
  the background
- Screen wake lock during sessions (where the browser supports it)
- Chime and Taps synthesized with the Web Audio API, with no audio files
- Custom session lengths via `/rest/:recharge?m=<minutes>` (up to 180)
- Syncs state across open tabs
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
Nostr plumbing (Nostrify, login, relay config) is present, though the app does not
currently publish or read anything from Nostr.

### Layout

```
src/
├── lib/rest.ts              # Recharges, battery levels, per-level plans, state types
├── lib/taps.ts, chime.ts    # Web Audio synthesis
├── components/RestProvider.tsx  # localStorage-backed app state
├── components/rest/         # Battery hero, plan, check-in, progress ring, shell
└── pages/
    ├── Index.tsx            # Check-in and plan
    └── RestSession.tsx      # /rest/:practiceId timer flow
```

The copy for every plan, recharge, prompt, and care quest lives in
`src/lib/rest.ts`. That is the place to edit if you want to change what the app
says.

## Deployment

The build is a static site. Pushes to `main` deploy to GitHub Pages
(`.github/workflows/deploy.yml`); `.gitlab-ci.yml` does the same for GitLab Pages.

It is also published to Nostr as a named [nsite](https://nsyte.run), `restful`,
configured in `.nsite/config.json` and signed with a bunker:

```sh
npm run build
nsyte deploy dist -d restful -i --skip-secrets-scan
```
