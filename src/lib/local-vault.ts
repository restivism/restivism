import { teamSchema, type Team } from './rest-model';
// User brief: explicitly local persistence. Standard Web Crypto, no persisted key.
export const VAULT_KEY = 'restivism:team-v1';
const ITERATIONS = 600000;
// Compare the encrypted snapshot before writing, so another tab cannot silently
// replace an open team's edits. Web Locks also serialize cooperating tabs.
let expectedSnapshot: string | null = null;
export type Envelope = {
    v: 1;
    salt: string;
    iv: string;
    data: string;
    iterations: number;
};
const b64 = (bytes: Uint8Array) => { let s = ''; for (const b of bytes)
    s += String.fromCharCode(b); return btoa(s); };
const bytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export function parseEnvelope(raw: string): Envelope { if (raw.length > 3000000)
    throw new Error('This backup is too large.'); const v = JSON.parse(raw); if (v.v !== 1 || v.iterations !== ITERATIONS || typeof v.salt !== 'string' || typeof v.iv !== 'string' || typeof v.data !== 'string')
    throw new Error('This is not a supported Restivism backup.'); if (bytes(v.salt).length !== 16 || bytes(v.iv).length !== 12 || bytes(v.data).length < 16)
    throw new Error('This backup is incomplete.'); return v; }
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> { if (!crypto.subtle)
    throw new Error('Encrypted storage needs a secure browser connection.'); const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
export async function seal(team: Team, key: CryptoKey, salt: string): Promise<Envelope> { const iv = crypto.getRandomValues(new Uint8Array(12)); const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(teamSchema.parse(team)))); return { v: 1, salt, iv: b64(iv), data: b64(new Uint8Array(data)), iterations: ITERATIONS }; }
export async function createVault(team: Team, passphrase: string) { const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await deriveKey(passphrase, salt); const salt64 = b64(salt); const e = await seal(team, key, salt64); if (localStorage.getItem(VAULT_KEY))
    throw new Error('A team was created in another tab. Reload to unlock it.'); expectedSnapshot = JSON.stringify(e); localStorage.setItem(VAULT_KEY, expectedSnapshot); return { key, salt: salt64 }; }
export async function openVault(raw: string, passphrase: string) { const snapshot = localStorage.getItem(VAULT_KEY); const e = parseEnvelope(raw); const key = await deriveKey(passphrase, bytes(e.salt)); let plain: ArrayBuffer; try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(e.iv) as BufferSource }, key, bytes(e.data) as BufferSource);
}
catch {
    throw new Error('That passphrase did not open the team. Check it, or restore a backup.');
} const team = teamSchema.parse(JSON.parse(new TextDecoder().decode(plain))); expectedSnapshot = snapshot; return { team, key, salt: e.salt }; }
export async function saveVault(team: Team, key: CryptoKey, salt: string) {
    const next = JSON.stringify(await seal(team, key, salt));
    const write = () => { if (localStorage.getItem(VAULT_KEY) !== expectedSnapshot)
        throw new Error('The team changed in another tab. Reload and unlock its latest copy.'); localStorage.setItem(VAULT_KEY, next); expectedSnapshot = next; };
    if (typeof navigator !== 'undefined' && navigator.locks)
        await navigator.locks.request('restivism-team-write', write);
    else
        write();
}
export function downloadEnvelope(e: Envelope) { const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(e)], { type: 'application/json' })); a.href = url; a.download = 'restivism-encrypted-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
