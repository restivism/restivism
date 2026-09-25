# Restivist Nostr application data

Restivist uses the existing NIP-78 application-specific data kinds for encrypted
organization synchronization. No new Nostr event kind is introduced.

## Organization channel

Each organization has:

- a random organization UUID;
- a 256-bit symmetric sync key delivered inside the passcode-encrypted invite;
- a leader-only Nostr signing key whose public key is included in the invite;
- a per-membership anonymous signing key generated locally for member submissions.

Relay-visible organization grouping uses:

```
["t", "restivist-org-<organization-id>"]
```

The UUID is random and does not contain the organization name.

All event `content` described below is an AES-256-GCM encrypted JSON envelope.
The plaintext organization name, covenant, coverage, alignment response, comment,
and battery summary are not published to relays.

## Covenant

Kind: `30078` (NIP-78 addressable application data)

The covenant is signed only by the leader key and is queried with that trusted
leader pubkey.

Tags:

```
["d", "restivist:<organization-id>:covenant"]
["t", "restivist-org-<organization-id>"]
["alt", "Encrypted Restivist organization covenant"]
```

Encrypted payload:

```json
{
  "type": "covenant",
  "agreement": {
    "protectedRest": true,
    "acceptedCoverage": true,
    "pauseWhenFull": true,
    "note": "...",
    "revision": 1,
    "adoptedAt": 0
  }
}
```

## Anonymous covenant alignment

Kind: `78` (NIP-78 normal application data)

A membership signs with its anonymous local membership key. The key is not mapped
to the member alias in shared organization data.

Tags include the organization `t` tag, a response id in `d`, the covenant
revision in `r`, and an `alt` description.

Encrypted payload:

```json
{
  "type": "alignment",
  "responseId": "...",
  "agreementRevision": 1,
  "score": 4,
  "comment": "optional anonymous feedback",
  "recordedAt": 0
}
```

Clients keep only the newest event per response id when aggregating.

## Anonymous weekly battery summary

Kind: `30078`

Each membership publishes one replaceable weekly summary under its anonymous
membership key.

Tags:

```
["d", "restivist:<organization-id>:battery:<YYYY-MM-DD-week-start>"]
["t", "restivist-org-<organization-id>"]
["alt", "Encrypted Restivist anonymous weekly battery summary"]
```

Encrypted payload:

```json
{
  "type": "weekly-battery",
  "weekKey": "2026-09-21",
  "average": 3.6,
  "samples": 4,
  "recordedAt": 0
}
```

The leadership UI does not display anonymous member pubkeys. It aggregates one
weekly average per anonymous membership and withholds the organization metric until
at least three contributors are present.

## Organization relays

The invite payload carries the organization's relay list:

```json
{ "relays": ["wss://relay.ditto.pub", "wss://relay.dreamith.to", "wss://nos.lol"] }
```

Every organization event is published to, and queried from, exactly these relays,
independent of the user's personal NIP-65 relay list. Invites created before this
field existed fall back to the same default list.

## Coverage request

Kind: `30078`

Each request is signed by a fresh key generated for that request alone. Its public
key is the request id, so only the requesting device can replace the request, and
requests cannot be linked to the anonymous membership key used for alignment and
battery summaries.

Tags:

```
["d", "restivist:<organization-id>:coverage:<request-pubkey>"]
["t", "restivist-org-<organization-id>"]
["alt", "Encrypted Restivist coverage request"]
```

Encrypted payload:

```json
{
  "type": "coverage-request",
  "restingPerson": "Cedar",
  "work": "Community inbox",
  "coveringPerson": "Birch",
  "date": "2026-09-25",
  "note": "Urgent replies only",
  "recordedAt": 0
}
```

`coveringPerson` is omitted when the work is paused. Clients ignore a request whose
`d` tag does not name its own signing pubkey. The requester withdraws a request by
replacing it with `{ "type": "coverage-request", "withdrawn": true, "recordedAt": 0 }`.

## Coverage status

Kind: `30078`, signed only by the leader key and trusted only from that pubkey.

Tags:

```
["d", "restivist:<organization-id>:coverage-status:<request-pubkey>"]
["t", "restivist-org-<organization-id>"]
["alt", "Encrypted Restivist coverage status"]
```

Encrypted payload:

```json
{ "type": "coverage-status", "requestId": "<request-pubkey>", "status": "covered", "recordedAt": 0 }
```

`status` is `covered` (the leader confirmed the handoff) or `removed` (hidden for
everyone). Without a leader status, a request is `waiting`, or `paused` when it has
no `coveringPerson`.

Unlike alignment and battery summaries, coverage contains names. They are encrypted
with the organization sync key, so anyone holding the invite and passcode can read them.

## Security boundary

The organization passcode protects the invite during transfer. The invite contains
the organization sync key and leader public key but never the leader private key.
Only the leader device retains the leader signing key.

Anyone who obtains both the invite and its passcode can decrypt organization-shared
content. Passcode rotation, member revocation, and sync-key rotation are not yet
implemented and are required before treating this prototype as a hardened
high-risk deployment.
