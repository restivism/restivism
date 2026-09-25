import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { finalizeEvent } from 'nostr-tools/pure';
import type { OrganizationMembership } from '@/lib/organization';
import type { AlignmentScore, RestAgreement } from '@/lib/teamRest';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const APP_KIND = 30078;
const MULTI_KIND = 78;

interface EncryptedEnvelope {
  v: 1;
  iv: string;
  ciphertext: string;
}

interface CovenantPayload {
  type: 'covenant';
  agreement: RestAgreement;
}

interface AlignmentPayload {
  type: 'alignment';
  responseId: string;
  agreementRevision: number;
  score: AlignmentScore;
  comment?: string;
  recordedAt: number;
}

interface WeeklyBatteryPayload {
  type: 'weekly-battery';
  weekKey: string;
  average: number;
  samples: number;
  recordedAt: number;
}

export interface SyncedAlignment {
  responseId: string;
  agreementRevision: number;
  score: AlignmentScore;
  comment?: string;
  recordedAt: number;
}

export interface SyncedWeeklyBattery {
  anonymousMemberId: string;
  weekKey: string;
  average: number;
  samples: number;
  recordedAt: number;
}

type SharedPayload = CovenantPayload | AlignmentPayload | WeeklyBatteryPayload;

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[0-9a-f]{64}$/iu.test(value)) throw new Error('Invalid organization signing key.');
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

async function importSharedKey(value: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    base64UrlToBytes(value),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptPayload(syncKey: string, payload: SharedPayload): Promise<string> {
  const key = await importSharedKey(syncKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  const envelope: EncryptedEnvelope = {
    v: 1,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(envelope);
}

async function decryptPayload(syncKey: string, content: string): Promise<SharedPayload | undefined> {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const envelope = parsed as Partial<EncryptedEnvelope>;
    if (envelope.v !== 1 || typeof envelope.iv !== 'string' || typeof envelope.ciphertext !== 'string') {
      return undefined;
    }

    const key = await importSharedKey(syncKey);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlToBytes(envelope.iv) },
      key,
      base64UrlToBytes(envelope.ciphertext),
    );
    const payload: unknown = JSON.parse(decoder.decode(plaintext));
    if (!payload || typeof payload !== 'object' || typeof (payload as { type?: unknown }).type !== 'string') {
      return undefined;
    }
    return payload as SharedPayload;
  } catch {
    return undefined;
  }
}

function organizationTag(organizationId: string) {
  return `restivist-org-${organizationId}`;
}

function covenantD(organizationId: string) {
  return `restivist:${organizationId}:covenant`;
}

function batteryD(organizationId: string, weekKey: string) {
  return `restivist:${organizationId}:battery:${weekKey}`;
}

function newestByResponse(items: SyncedAlignment[]) {
  const latest = new Map<string, SyncedAlignment>();
  for (const item of items) {
    const existing = latest.get(item.responseId);
    if (!existing || item.recordedAt > existing.recordedAt) latest.set(item.responseId, item);
  }
  return [...latest.values()];
}

export function useOrganizationSync(membership: OrganizationMembership) {
  const { nostr } = useNostr();
  const enabled = Boolean(membership.syncKey && membership.leaderPubkey);
  const tag = organizationTag(membership.id);

  const covenantQuery = useQuery({
    queryKey: ['restivist-org-covenant', membership.id, membership.leaderPubkey],
    enabled,
    refetchInterval: 5_000,
    queryFn: async ({ signal }) => {
      if (!membership.syncKey || !membership.leaderPubkey) return undefined;
      const events = await nostr.query([{
        kinds: [APP_KIND],
        authors: [membership.leaderPubkey],
        '#d': [covenantD(membership.id)],
        limit: 5,
      }], { signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]) });

      const sorted = [...events].sort((a, b) => b.created_at - a.created_at);
      for (const event of sorted) {
        const payload = await decryptPayload(membership.syncKey, event.content);
        if (payload?.type === 'covenant') return payload.agreement;
      }
      return undefined;
    },
  });

  const alignmentQuery = useQuery({
    queryKey: ['restivist-org-alignment', membership.id],
    enabled: enabled && membership.role === 'leader',
    refetchInterval: 5_000,
    queryFn: async ({ signal }) => {
      if (!membership.syncKey) return [];
      const events = await nostr.query([{
        kinds: [MULTI_KIND],
        '#t': [tag],
        limit: 500,
      }], { signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]) });

      const responses: SyncedAlignment[] = [];
      for (const event of events) {
        const payload = await decryptPayload(membership.syncKey, event.content);
        if (payload?.type !== 'alignment') continue;
        responses.push({
          responseId: payload.responseId,
          agreementRevision: payload.agreementRevision,
          score: payload.score,
          comment: payload.comment,
          recordedAt: payload.recordedAt,
        });
      }
      return newestByResponse(responses);
    },
  });

  const weeklyBatteryQuery = useQuery({
    queryKey: ['restivist-org-weekly-battery', membership.id],
    enabled: enabled && membership.role === 'leader',
    refetchInterval: 10_000,
    queryFn: async ({ signal }) => {
      if (!membership.syncKey) return [];
      const events = await nostr.query([{
        kinds: [APP_KIND],
        '#t': [tag],
        limit: 500,
      }], { signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]) });

      const submissions: SyncedWeeklyBattery[] = [];
      for (const event of events) {
        const payload = await decryptPayload(membership.syncKey, event.content);
        if (payload?.type !== 'weekly-battery') continue;
        submissions.push({
          anonymousMemberId: event.pubkey,
          weekKey: payload.weekKey,
          average: payload.average,
          samples: payload.samples,
          recordedAt: payload.recordedAt,
        });
      }

      const latest = new Map<string, SyncedWeeklyBattery>();
      for (const item of submissions) {
        const key = `${item.anonymousMemberId}:${item.weekKey}`;
        const existing = latest.get(key);
        if (!existing || item.recordedAt > existing.recordedAt) latest.set(key, item);
      }
      return [...latest.values()];
    },
  });

  const publishCovenant = async (agreement: RestAgreement) => {
    if (
      membership.role !== 'leader' ||
      !membership.syncKey ||
      !membership.leaderSecretKey
    ) {
      throw new Error('This organization does not have leader sync credentials.');
    }

    const content = await encryptPayload(membership.syncKey, { type: 'covenant', agreement });
    const event = finalizeEvent({
      kind: APP_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', covenantD(membership.id)],
        ['t', tag],
        ['alt', 'Encrypted Restivist organization covenant'],
      ],
      content,
    }, hexToBytes(membership.leaderSecretKey));

    await nostr.event(event, { signal: AbortSignal.timeout(5_000) });
    await covenantQuery.refetch();
  };

  const publishAlignment = async (
    agreementRevision: number,
    score: AlignmentScore,
    responseId: string,
    comment?: string,
  ) => {
    if (!membership.syncKey || !membership.memberSecretKey) {
      throw new Error('This membership does not have organization sync credentials.');
    }

    const payload: AlignmentPayload = {
      type: 'alignment',
      responseId,
      agreementRevision,
      score,
      comment: comment?.trim() || undefined,
      recordedAt: Date.now(),
    };
    const content = await encryptPayload(membership.syncKey, payload);
    const event = finalizeEvent({
      kind: MULTI_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['t', tag],
        ['d', responseId],
        ['r', String(agreementRevision)],
        ['alt', 'Encrypted Restivist covenant alignment'],
      ],
      content,
    }, hexToBytes(membership.memberSecretKey));

    await nostr.event(event, { signal: AbortSignal.timeout(5_000) });
  };

  const publishWeeklyBattery = async (
    weekKey: string,
    average: number,
    samples: number,
  ) => {
    if (!membership.syncKey || !membership.memberSecretKey) {
      throw new Error('This membership does not have organization sync credentials.');
    }

    const payload: WeeklyBatteryPayload = {
      type: 'weekly-battery',
      weekKey,
      average,
      samples,
      recordedAt: Date.now(),
    };
    const content = await encryptPayload(membership.syncKey, payload);
    const event = finalizeEvent({
      kind: APP_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', batteryD(membership.id, weekKey)],
        ['t', tag],
        ['alt', 'Encrypted Restivist anonymous weekly battery summary'],
      ],
      content,
    }, hexToBytes(membership.memberSecretKey));

    await nostr.event(event, { signal: AbortSignal.timeout(5_000) });
  };

  return {
    canSync: enabled && Boolean(membership.memberSecretKey),
    covenant: covenantQuery.data,
    covenantStatus: covenantQuery.status,
    refetchCovenant: covenantQuery.refetch,
    alignmentResponses: alignmentQuery.data ?? [],
    weeklyBattery: weeklyBatteryQuery.data ?? [],
    publishCovenant,
    publishAlignment,
    publishWeeklyBattery,
  };
}
