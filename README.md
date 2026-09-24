# Restivism

**Rest is resistance. Make it a shared practice.**

Restivism helps activist teams turn rest into a covenant, a visible rota, and
explicitly accepted handovers. This version builds on the original Restivism
React app, retaining its typography, indigo-and-ember palette, musical-rest mark,
and optional timers.

## Start together

The homepage opens a fictional **Lantern Collective** workspace. Sample edits
stay in memory and disappear on reload. **Create your team** guides a leader
through four steps: team aliases and framing; covenant wording; practical
coverage rules and team agreement; then a passphrase for encrypted storage.

- **Covenant:** movement, faith or secular framing, editable language, adoption,
  renewal and printing. The starter text is generic, not Seven Shifts material
  or AI-generated wording. Evan retains the curriculum; no manuscript is bundled.
- **Rota:** week and agenda views, rest windows, operational and public-facing
  responsibilities, short notes and print copies. Handovers are proposed until
  agreement is explicitly recorded. People can decline; the team can pause work.
  Self-coverage and overlapping accepted commitments are rejected.
- **Team pulse:** one shared answer about whether the rota held. A new answer
  replaces the previous one. No individual responses, scores or histories.
- **Local vault:** passphrase lock, encrypted backup, restore with replacement
  confirmation, and deletion from this browser.
- **Offline use:** the production app says **Ready offline** after its public
  app shell and fonts are cached successfully. Printing is an intended fallback.
- **Timers:** the original play, sleep and social timers remain optional. No
  timer results, battery ratings, quests, streaks or rewards are recorded.

Coverage never becomes permission to rest. When nobody has capacity, revise or
pause the work together. A facilitator records agreements after a conversation;
this is not an authenticated signature or proof that rest happened.

## Privacy and limits

This is a **shared-device v1**, with no peer sync or multi-device merge. Restoring
an encrypted snapshot replaces the local team. Aliases have no stored mapping
to real names; real names require an explicit choice.

Web Crypto encrypts team records using AES-GCM, a fresh nonce per save, and a
non-extractable key derived with PBKDF2 SHA-256 (600,000 iterations, random salt).
Only an encrypted envelope is saved under `restivism:team-v1`. The passphrase and
key are not persisted. Reload or **Lock team** closes access. There is no
passphrase recovery. Keep a backup and its passphrase separately; clearing site
data can remove the team.

The team workspace mounts no Nostr providers and sends no team data to relays,
analytics or AI services. Existing Nostr identifier routes retain their own
provider boundary. Hosting still sees network request metadata. Aliases can be
identifiable; an unlocked or compromised device, printout or export remains
sensitive. This hackathon implementation has **not had an independent security
audit**.

Rota entries older than seven days are removed on unlock or restore. Only the
latest pulse is retained. Backups and printed copies are not recalled or updated;
printed rotas omit handover notes. Another tab changing the vault raises a
conflict warning, and stale encrypted snapshots cannot silently overwrite it.
Download unsaved work before reloading the latest copy.

The active app no longer reads or writes the old `restivism:state` personal
history. **Team & privacy** offers explicit removal if it exists. Legacy
components remain in source for continuity but are not mounted in the new flow.

## Development

Node.js 22 or newer; existing dependencies and npm lockfile are retained.

```sh
npm ci
npm run dev
npm run test
npm run build
```

`npm run test` runs TypeScript, ESLint, existing Vitest tests and a production
build. The static output is `dist/`, including a versioned offline manifest and
service worker. Offline storage needs HTTPS (or localhost), a successful initial
load, and browser storage; the OS can evict cached data.

| File | Purpose |
| --- | --- |
| `src/components/rest/TeamWorkspace.tsx` | Covenant, rota, pulse, privacy and unlock UI |
| `src/components/rest/team-workspace.css` | Workspace, mobile and print styling |
| `src/lib/rest-model.ts` | Data validation, scheduling rules and generic prompts |
| `src/lib/local-vault.ts` | Encryption, backup validation and stale-write protection |
| `src/pages/RestSession.tsx` | Original timers, now untracked |
| `public/sw.js`, `vite.config.ts` | Versioned public app-shell caching |

Optional WebMCP tools open a view or stage an empty rest-window form. They do not
read records, unlock the vault, create a window or accept coverage. The interface
works without WebMCP support.

## Five-minute demo

1. **0:00–0:45:** Cultural permission needs practical coverage.
2. **0:45–1:30:** Open the sample covenant and its practical commitments.
3. **1:30–3:00:** Open Cedar's Thursday window. Record Ash's agreement to cover
   public updates; show that the planning meeting is paused.
4. **3:00–4:00:** Add a rest window, show the printable rota and the shared pulse.
5. **4:00–5:00:** Show aliases, encryption, backup and offline status. The next
   evaluation is whether a real team honors the rota, not app engagement.

## Deployment

The existing GitHub Pages and GitLab Pages workflows remain intact. Pushing to
`main` triggers GitHub Pages; review feature branches before merging. The
original `.nsite/config.json` remains available for Nostr static-site publishing.
Hosting the app does not publish its locally encrypted team records.
