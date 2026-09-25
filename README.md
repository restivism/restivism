# Restivist

**Rest is resistance.**

Restivist is a rest companion for activists and organizers. It keeps the original
personal loop — check your battery, get a recharge plan, rest, and check in again —
and adds a simple organization layer so rest can be protected by the group instead
of depending on one person to push through.

## How it works

### My rest

1. **Check in.** Set your battery from 1 (running on fumes) to 5 (fully charged).
   Or say it out loud: speak for up to 30 seconds. Once the user opts in to
   word understanding, Restivist transcribes what they said and reads its
   sentiment on the device, and suggests a level from that; a flat, quiet voice
   can pull it lower, but tone never raises it. Without word understanding it
   shows loudness, tone (pitch movement), and emphasis but does not guess a
   level, because tone alone cannot tell tired from upset. The user always
   confirms or taps the level that feels true. If someone mentions suicide or
   self-harm, Restivist skips the reading and points them to a helpline instead.
2. **Get a plan.** Restivist recommends play, sleep, or social time plus a few small
   acts of care.
3. **Recharge.** Start a timed rest session.
4. **Check in again.** See how your battery changed.

When a battery is low or middling, the plan can send the user directly to their
organization's coverage area so the team can make room for the rest.

### The rest itself

- **You charge while you rest.** The timer is a tall battery that fills with rippling
  liquid as the session runs, with a glow that breathes at ten seconds a breath.
- **Every recharge has its own world.** Sleep is a starry night with a crescent moon
  and the occasional shooting star; play is drifting shapes of color; social time
  is warm, flickering lanterns. They are drawn live on a canvas, and hold still for
  anyone who prefers reduced motion.
- **Every recharge has its own sound.** Soft surf and a low drone for sleep, a
  wandering music box for play, slow warm chords for social time. It is all
  synthesized in the browser with the Web Audio API, so nothing is downloaded, and
  the speaker button turns it off.
- **Charging up is celebrated.** After the check-in, new bars pop into the battery
  with a burst of sparks and a rising arpeggio.
- **Rest out loud.** "Share your recharge" renders a portrait card (before → after,
  bars gained, *Rest is resistance.*) that can go straight to the share sheet or be
  saved as an image.
- **A rest record.** Once there is a session, the home page shows minutes of rest
  reclaimed, bars regained, the current rest streak, and the battery reading by
  reading.

### Demo mode

Add `?demo` to any session URL, e.g. `/rest/sleep?m=20&demo`, and each minute
passes in one second, so the whole loop fits into a live pitch.

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

1. **Agree — Our rest covenant.** Organization leaders create and revise the
   covenant. Members see it read-only and can submit a 1–5 emoji alignment response
   without attaching their name or alias. Leader results stay hidden until at least
   three responses exist for the current covenant revision.
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

New organizations now include encrypted shared-sync credentials inside the
passcode-protected invite. The app uses NIP-78 application data on the configured
Nostr relays to synchronize the leader-published covenant, anonymous covenant
alignment/comments, and anonymous weekly battery summaries between browser origins
and devices. The relay sees ciphertext and an opaque random organization identifier,
not the plaintext organization content.

Coverage/rota items and the shared reflect answer are still local-first in this
iteration. Free-text feedback can still reveal identity through writing style or
self-disclosed details, so the UI warns members not to include identifying
information.

That distinction is intentional for this iteration: the organization UX and data
isolation model can be tested without publishing sensitive operational information
to Nostr or inventing a weak shared-key sync scheme.

## Privacy

- Personal rest state stays in browser `localStorage` under `restivism:state`.
- Voice check-ins are analysed in the browser. Audio is held in memory for the
  check-in only, never stored or sent. Word understanding uses Whisper tiny.en
  and a DistilBERT sentiment model via transformers.js in a Web Worker; the
  models (about 110 MB) are downloaded from Hugging Face once, when the user
  opts in, and cached by the browser. The ONNX runtime is served from this app,
  not a CDN. Transcripts are shown back to the user and never saved. Only the
  level the user confirms is saved.
- Organization rest records are namespaced by organization ID.
- Organization agreement, coverage, and reflection data are not published to Nostr.
- There is no analytics, streak system, leaderboard, or individual performance
  ranking.
- Browser storage itself is not encrypted. Sensitive case details, passwords,
  beneficiary identities, or precise sensitive locations should not be entered.

## Features

- Battery check-in with level-matched recharge plans
- Optional voice check-in that understands what was said, on the device
- Crisis support card when a voice check-in mentions suicide or self-harm
- Timed play, sleep, and social rest sessions
- Create or join an organization
- Leader-created passcode + encrypted organization invite
- Multiple organizations on one device with explicit organization switching
- Leader-owned three-promise rest covenant
- Anonymous-to-the-UI member alignment slider with emoji feedback
- Optional anonymous free-text covenant feedback, shown to leaders without the member's name, rating, or timestamp
- Minimum 3-response threshold before leaders see covenant alignment results
- Encrypted cross-browser covenant synchronization using NIP-78
- One-time member privacy choice for automatic anonymous weekly battery sharing
- Automatic weekly contribution refresh after opted-in battery check-ins
- Leadership weekly restfulness metric after 3 anonymous contributors
- Restivist battery glyphs for the organization average and 1–5 distribution
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
├── lib/organization.ts          # Passcode-protected org invites + sync credentials
├── lib/teamRest.ts              # Simplified org agreement, coverage, reflection
├── hooks/useOrganizationSync.ts # Encrypted NIP-78 covenant/alignment/battery sync
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

## Shared organization sync

For organizations created on the shared-sync branch, the leader's passcode-encrypted
invite contains the organization symmetric sync key and the leader public signing
key. The leader private signing key stays only on the leader device.

The leader covenant is published as encrypted NIP-78 kind `30078` app data and is
accepted only from the trusted leader pubkey in the invite. Anonymous member
alignment uses NIP-78 kind `78`; weekly battery summaries use addressable kind
`30078`. Full schema details and security limitations are documented in
`NIP.md`.

The weekly leadership metric is intentionally aggregate-only. When joining an
organization, members make a one-time privacy choice: automatically contribute their
weekly battery average anonymously, or keep battery data private. Members can change
that choice later. If automatic sharing is enabled, new battery check-ins refresh the
member's single weekly contribution without another share action. Each participant
counts once, regardless of how often they checked in, and the organization result
does not appear until at least three anonymous contributors exist.

The leadership view uses the same Restivist battery glyphs for the weekly
organization average and for the 1–5 distribution. It never displays member aliases
or individual battery histories.
