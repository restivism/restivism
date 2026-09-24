import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PBKDF2_ITERATIONS = 150_000;

function getWebCrypto(): Crypto {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.getRandomValues || !webCrypto.subtle) {
    const insecureHint = globalThis.isSecureContext === false
      ? ' Open Restivism over HTTPS or use http://localhost when developing.'
      : '';
    throw new Error(`Secure browser cryptography is unavailable.${insecureHint}`);
  }
  return webCrypto;
}

function createId(): string {
  const webCrypto = getWebCrypto();
  if (typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID();

  const bytes = webCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type OrganizationRole = 'leader' | 'member';

export interface OrganizationMembership {
  id: string;
  name: string;
  alias: string;
  role: OrganizationRole;
  joinedAt: number;
  /** Shared organization encryption key, delivered inside the passcode-protected invite. */
  syncKey?: string;
  /** Public key that is allowed to publish leader-owned organization state. */
  leaderPubkey?: string;
  /** Only present for leaders; never included in member invites. */
  leaderSecretKey?: string;
  /** Anonymous per-membership signing key for alignment and restfulness submissions. */
  memberSecretKey?: string;
  /** Leaders keep the encrypted invite so they can share it again. */
  inviteCode?: string;
}

export interface OrganizationDirectory {
  version: 1;
  memberships: OrganizationMembership[];
  currentOrganizationId?: string;
}

export const DEFAULT_ORGANIZATION_DIRECTORY: OrganizationDirectory = {
  version: 1,
  memberships: [],
};

interface InviteEnvelope {
  v: 1;
  id: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

interface InvitePayload {
  name: string;
  createdAt: number;
  syncKey: string;
  leaderPubkey: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeEnvelope(envelope: InviteEnvelope): string {
  return bytesToBase64Url(encoder.encode(JSON.stringify(envelope)));
}

function decodeEnvelope(inviteCode: string): InviteEnvelope {
  const decoded = decoder.decode(base64UrlToBytes(inviteCode.trim()));
  const parsed: unknown = JSON.parse(decoded);

  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid organization invite.');
  const envelope = parsed as Partial<InviteEnvelope>;
  if (
    envelope.v !== 1 ||
    typeof envelope.id !== 'string' ||
    typeof envelope.salt !== 'string' ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.ciphertext !== 'string'
  ) {
    throw new Error('Invalid organization invite.');
  }

  return envelope as InviteEnvelope;
}

async function deriveInviteKey(passcode: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const webCrypto = getWebCrypto();
  const material = await webCrypto.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return webCrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Builds an invite that can be shared separately from the leader-created passcode.
 * The passcode is not embedded in the invite; it is required to decrypt the org metadata.
 */
export async function createOrganizationInvite(name: string, passcode: string) {
  const webCrypto = getWebCrypto();
  const id = createId();
  const leaderSecret = generateSecretKey();
  const memberSecret = generateSecretKey();
  const syncKey = webCrypto.getRandomValues(new Uint8Array(32));
  const salt = webCrypto.getRandomValues(new Uint8Array(16));
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveInviteKey(passcode, salt);

  const payload: InvitePayload = {
    name: name.trim(),
    createdAt: Date.now(),
    syncKey: bytesToBase64Url(syncKey),
    leaderPubkey: getPublicKey(leaderSecret),
  };

  const encrypted = await webCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  const inviteCode = encodeEnvelope({
    v: 1,
    id,
    salt: bytesToBase64Url(salt),
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
  });

  return {
    organization: {
      id,
      name: payload.name,
      createdAt: payload.createdAt,
      syncKey: payload.syncKey,
      leaderPubkey: payload.leaderPubkey,
      leaderSecretKey: bytesToHex(leaderSecret),
      memberSecretKey: bytesToHex(memberSecret),
    },
    inviteCode,
  };
}

export async function openOrganizationInvite(inviteCode: string, passcode: string) {
  try {
    const envelope = decodeEnvelope(inviteCode);
    const salt = base64UrlToBytes(envelope.salt);
    const iv = base64UrlToBytes(envelope.iv);
    const ciphertext = base64UrlToBytes(envelope.ciphertext);
    const key = await deriveInviteKey(passcode, salt);

    const webCrypto = getWebCrypto();
    const decrypted = await webCrypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    const parsed: unknown = JSON.parse(decoder.decode(decrypted));
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid organization invite.');
    const payload = parsed as Partial<InvitePayload>;

    if (
      typeof payload.name !== 'string' ||
      typeof payload.createdAt !== 'number' ||
      typeof payload.syncKey !== 'string' ||
      typeof payload.leaderPubkey !== 'string'
    ) {
      throw new Error('Invalid organization invite.');
    }

    return {
      id: envelope.id,
      name: payload.name,
      createdAt: payload.createdAt,
      syncKey: payload.syncKey,
      leaderPubkey: payload.leaderPubkey,
      memberSecretKey: bytesToHex(generateSecretKey()),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Secure browser cryptography is unavailable.')) {
      throw error;
    }
    throw new Error('That invite code and passcode do not match.', { cause: error });
  }
}
