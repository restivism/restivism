import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { normalizeOrganizationRelays, type OrganizationMembership } from '@/lib/organization';
import type { AlignmentScore, CoverageItem, RestAgreement } from '@/lib/teamRest';

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

/**
 * Signed by a fresh key per request, so the request id is that key's pubkey and only the
 * requester's device can replace it. A withdrawn request is republished without its details.
 */
type CoverageRequestPayload =
  | {
      type: 'coverage-request';
      restingPerson: string;
      work: string;
      coveringPerson?: string;
      date: string;
      note: string;
      recordedAt: number;
      withdrawn?: false;
    }
  | { type: 'coverage-request'; withdrawn: true; recordedAt: number };

/** Signed by the leader key; only the leader can confirm or remove coverage. */
interface CoverageStatusPayload {
  type: 'coverage-status';
  requestId: string;
  status: 'covered' | 'removed';
  recordedAt: number;
}

export interface CoverageRequestInput {
  restingPerson: string;
  work: string;
  coveringPerson?: string;
  date: string;
  note: string;
}

export interface SharedCoverageItem extends CoverageItem {
  requestedAt: number;
}

type SharedPayload =
  | CovenantPayload
  | AlignmentPayload
  | WeeklyBatteryPayload
  | CoverageRequestPayload
  | CoverageStatusPayload;

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
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

function coverageD(organizationId: string, requestId: string) {
  return `restivist:${organizationId}:coverage:${requestId}`;
}

function coverageStatusD(organizationId: string, requestId: string) {
  return `restivist:${organizationId}:coverage-status:${requestId}`;
}

function dTag(tags: string[][]) {
  return tags.find(([name]) => name === 'd')?.[1];
}

function boundedString(value: unknown, max: number, required: boolean): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
}

/** Event content is written by anyone holding the sync key, so check shape before rendering it. */
function isValidCoverageRequest(payload: CoverageRequestPayload): boolean {
  if (typeof payload.recordedAt !== 'number') return false;
  if (payload.withdrawn === true) return true;
  return (
    boundedString(payload.restingPerson, 40, true) &&
    boundedString(payload.work, 120, true) &&
    (payload.coveringPerson === undefined || boundedString(payload.coveringPerson, 40, true)) &&
    typeof payload.date === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(payload.date) &&
    boundedString(payload.note, 240, false)
  );
}

function isValidCoverageStatus(payload: CoverageStatusPayload): boolean {
  return (
    /^[0-9a-f]{64}$/u.test(payload.requestId) &&
    (payload.status === 'covered' || payload.status === 'removed') &&
    typeof payload.recordedAt === 'number'
  );
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
  const relayKey = normalizeOrganizationRelays(membership.relays).join(' ');
  // Every organization device uses the same relays, whatever its personal relay list says.
  const pool = useMemo(() => nostr.group(relayKey.split(' ')), [nostr, relayKey]);
  const [coverageKeys, setCoverageKeys] = useLocalStorage<Record<string, string>>(
    `restivist:organization:${membership.id}:coverage-keys`,
    {},
  );

  const covenantQuery = useQuery({
    queryKey: ['restivist-org-covenant', membership.id, membership.leaderPubkey, relayKey],
    enabled,
    refetchInterval: 5_000,
    queryFn: async ({ signal }) => {
      if (!membership.syncKey || !membership.leaderPubkey) return undefined;
      const events = await pool.query([{
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
    queryKey: ['restivist-org-alignment', membership.id, relayKey],
    enabled: enabled && membership.role === 'leader',
    refetchInterval: 5_000,
    queryFn: async ({ signal }) => {
      if (!membership.syncKey) return [];
      const events = await pool.query([{
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

  // Weekly battery summaries and coverage share one relay filter, so fetch them together.
  const appDataQuery = useQuery({
    queryKey: ['restivist-org-app-data', membership.id, membership.leaderPubkey, relayKey],
    enabled,
    refetchInterval: 10_000,
    queryFn: async ({ signal }) => {
      if (!membership.syncKey) return { weeklyBattery: [], coverage: [] };
      const events = await pool.query([{
        kinds: [APP_KIND],
        '#t': [tag],
        limit: 500,
      }], { signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]) });

      const submissions: SyncedWeeklyBattery[] = [];
      const requests = new Map<string, CoverageRequestPayload>();
      const statuses = new Map<string, CoverageStatusPayload>();

      for (const event of events) {
        const payload = await decryptPayload(membership.syncKey, event.content);
        const d = dTag(event.tags);

        if (payload?.type === 'weekly-battery') {
          submissions.push({
            anonymousMemberId: event.pubkey,
            weekKey: payload.weekKey,
            average: payload.average,
            samples: payload.samples,
            recordedAt: payload.recordedAt,
          });
        } else if (
          payload?.type === 'coverage-request' &&
          d === coverageD(membership.id, event.pubkey) &&
          isValidCoverageRequest(payload)
        ) {
          const existing = requests.get(event.pubkey);
          if (!existing || payload.recordedAt > existing.recordedAt) requests.set(event.pubkey, payload);
        } else if (
          payload?.type === 'coverage-status' &&
          event.pubkey === membership.leaderPubkey &&
          isValidCoverageStatus(payload) &&
          d === coverageStatusD(membership.id, payload.requestId)
        ) {
          const existing = statuses.get(payload.requestId);
          if (!existing || payload.recordedAt > existing.recordedAt) statuses.set(payload.requestId, payload);
        }
      }

      const latest = new Map<string, SyncedWeeklyBattery>();
      for (const item of submissions) {
        const key = `${item.anonymousMemberId}:${item.weekKey}`;
        const existing = latest.get(key);
        if (!existing || item.recordedAt > existing.recordedAt) latest.set(key, item);
      }

      const coverage: SharedCoverageItem[] = [];
      for (const [id, request] of requests) {
        if (request.withdrawn) continue;
        const leaderStatus = statuses.get(id)?.status;
        if (leaderStatus === 'removed') continue;
        coverage.push({
          id,
          restingPerson: request.restingPerson,
          work: request.work,
          coveringPerson: request.coveringPerson,
          date: request.date,
          note: request.note,
          status: leaderStatus === 'covered' ? 'covered' : request.coveringPerson ? 'waiting' : 'paused',
          requestedAt: request.recordedAt,
        });
      }
      coverage.sort((a, b) => b.requestedAt - a.requestedAt);

      return { weeklyBattery: [...latest.values()], coverage };
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

    await pool.event(event, { signal: AbortSignal.timeout(5_000) });
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

    await pool.event(event, { signal: AbortSignal.timeout(5_000) });
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

    await pool.event(event, { signal: AbortSignal.timeout(5_000) });
  };

  const publishCoverageRequestEvent = async (
    requestId: string,
    secretHex: string,
    payload: CoverageRequestPayload,
  ) => {
    if (!membership.syncKey) return;
    const content = await encryptPayload(membership.syncKey, payload);
    const event = finalizeEvent({
      kind: APP_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', coverageD(membership.id, requestId)],
        ['t', tag],
        ['alt', 'Encrypted Restivist coverage request'],
      ],
      content,
    }, hexToBytes(secretHex));

    await pool.event(event, { signal: AbortSignal.timeout(5_000) });
  };

  const publishCoverageRequest = async (input: CoverageRequestInput) => {
    if (!membership.syncKey) {
      throw new Error('This membership does not have organization sync credentials.');
    }

    const secret = generateSecretKey();
    const requestId = getPublicKey(secret);
    const secretHex = bytesToHex(secret);
    const payload: CoverageRequestPayload = {
      type: 'coverage-request',
      ...input,
      recordedAt: Date.now(),
    };
    // Keep the key even if publishing only partly succeeds, so the request can still be withdrawn.
    setCoverageKeys({ ...coverageKeys, [requestId]: secretHex });
    await publishCoverageRequestEvent(requestId, secretHex, payload);
    await appDataQuery.refetch();
  };

  const withdrawCoverage = async (requestId: string) => {
    const secretHex = coverageKeys[requestId];
    if (!membership.syncKey || !secretHex) {
      throw new Error('Only the device that requested this coverage can withdraw it.');
    }

    await publishCoverageRequestEvent(requestId, secretHex, {
      type: 'coverage-request',
      withdrawn: true,
      recordedAt: Date.now(),
    });
    await appDataQuery.refetch();
  };

  const setCoverageStatus = async (requestId: string, status: CoverageStatusPayload['status']) => {
    if (
      membership.role !== 'leader' ||
      !membership.syncKey ||
      !membership.leaderSecretKey
    ) {
      throw new Error('Only the organization leader can confirm or remove coverage.');
    }

    const payload: CoverageStatusPayload = {
      type: 'coverage-status',
      requestId,
      status,
      recordedAt: Date.now(),
    };
    const content = await encryptPayload(membership.syncKey, payload);
    const event = finalizeEvent({
      kind: APP_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', coverageStatusD(membership.id, requestId)],
        ['t', tag],
        ['alt', 'Encrypted Restivist coverage status'],
      ],
      content,
    }, hexToBytes(membership.leaderSecretKey));

    await pool.event(event, { signal: AbortSignal.timeout(5_000) });
    await appDataQuery.refetch();
  };

  return {
    canSync: enabled && Boolean(membership.memberSecretKey),
    covenant: covenantQuery.data,
    covenantStatus: covenantQuery.status,
    refetchCovenant: covenantQuery.refetch,
    alignmentResponses: alignmentQuery.data ?? [],
    weeklyBattery: membership.role === 'leader' ? appDataQuery.data?.weeklyBattery ?? [] : [],
    coverage: appDataQuery.data?.coverage ?? [],
    ownsCoverage: (requestId: string) => requestId in coverageKeys,
    publishCoverageRequest,
    withdrawCoverage,
    setCoverageStatus,
    publishCovenant,
    publishAlignment,
    publishWeeklyBattery,
  };
}
