const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PBKDF2_ITERATIONS = 150_000;

export type OrganizationRole = 'leader' | 'member';

export interface OrganizationMembership {
  id: string;
  name: string;
  alias: string;
  role: OrganizationRole;
  joinedAt: number;
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
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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

async function deriveInviteKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
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
  const id = crypto.randomUUID();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveInviteKey(passcode, salt);

  const payload: InvitePayload = {
    name: name.trim(),
    createdAt: Date.now(),
  };

  const encrypted = await crypto.subtle.encrypt(
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

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    const parsed: unknown = JSON.parse(decoder.decode(decrypted));
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid organization invite.');
    const payload = parsed as Partial<InvitePayload>;

    if (typeof payload.name !== 'string' || typeof payload.createdAt !== 'number') {
      throw new Error('Invalid organization invite.');
    }

    return {
      id: envelope.id,
      name: payload.name,
      createdAt: payload.createdAt,
    };
  } catch {
    throw new Error('That invite code and passcode do not match.');
  }
}
