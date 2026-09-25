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
["t", "restivism-org-<organization-id>"]
```

The UUID is random and does not contain the organization name.

All event `content` described below is an AES-256-GCM encrypted JSON envelope.
The plaintext organization name, covenant, alignment response, comment, and battery
summary are not published to relays.

## Covenant

Kind: `30078` (NIP-78 addressable application data)

The covenant is signed only by the leader key and is queried with that trusted
leader pubkey.

Tags:

```
["d", "restivism:<organization-id>:covenant"]
["t", "restivism-org-<organization-id>"]
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
["d", "restivism:<organization-id>:battery:<YYYY-MM-DD-week-start>"]
["t", "restivism-org-<organization-id>"]
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

## Security boundary

The organization passcode protects the invite during transfer. The invite contains
the organization sync key and leader public key but never the leader private key.
Only the leader device retains the leader signing key.

Anyone who obtains both the invite and its passcode can decrypt organization-shared
content. Passcode rotation, member revocation, and sync-key rotation are not yet
implemented and are required before treating this prototype as a hardened
high-risk deployment.
