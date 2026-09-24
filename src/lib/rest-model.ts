import { z } from 'zod';
// User brief: only operational aliases, covenant, rota and one team pulse.
// No mood, engagement, attendance or individual activity histories.
export const coverSchema = z.object({ id: z.string().max(80), role: z.string().trim().min(1).max(60), alias: z.string().max(28), status: z.enum(['proposed', 'accepted', 'declined', 'paused']), note: z.string().max(240) });
export const windowSchema = z.object({ id: z.string().max(80), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/), alias: z.string().trim().min(1).max(28), covers: z.array(coverSchema).max(8) });
export const teamSchema = z.object({ schema: z.literal(1), name: z.string().trim().min(1).max(50), frame: z.enum(['movement', 'faith', 'secular']), identity: z.enum(['aliases', 'names']), members: z.array(z.string().trim().min(1).max(28)).min(2).max(20), covenant: z.string().trim().min(1).max(5000), coverageRule: z.string().trim().min(1).max(700), exceptionRule: z.string().trim().min(1).max(700), adopted: z.string().max(10).nullable(), renewal: z.string().max(10).nullable(), revision: z.number().int().nonnegative(), windows: z.array(windowSchema).max(200), pulse: z.object({ period: z.string().max(40), answer: z.enum(['held', 'partly', 'not-held']), recorded: z.string().max(10) }).nullable() }).superRefine((team, ctx) => {
    if (new Set(team.members.map(m => m.toLowerCase())).size !== team.members.length)
        ctx.addIssue({ code: 'custom', message: 'Team labels must be unique.' });
    const ids = new Set<string>();
    for (const window of team.windows) {
        if (ids.has(window.id))
            ctx.addIssue({ code: 'custom', message: 'Duplicate rest window.' });
        ids.add(window.id);
        const date = new Date(`${window.date}T12:00:00`);
        if (!Number.isFinite(date.getTime()) || dayKey(date) !== window.date || !team.members.includes(window.alias) || window.start >= window.end || !/^([01]\d|2[0-3]):[0-5]\d$/.test(window.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(window.end) || !window.covers.length)
            ctx.addIssue({ code: 'custom', message: 'Invalid rest window.' });
        for (const cover of window.covers) {
            if (ids.has(cover.id))
                ctx.addIssue({ code: 'custom', message: 'Duplicate coverage record.' });
            ids.add(cover.id);
            if ((cover.alias && !team.members.includes(cover.alias)) || (cover.status === 'accepted' && (!cover.alias || cover.alias === window.alias)))
                ctx.addIssue({ code: 'custom', message: 'Invalid covering alias.' });
        }
    }
});
export type Team = z.infer<typeof teamSchema>;
export type RestWindow = z.infer<typeof windowSchema>;
export type Cover = z.infer<typeof coverSchema>;
export type Frame = Team['frame'];
export type View = 'rota' | 'covenant' | 'pulse' | 'settings';
export const FRAME_NAMES = { movement: 'Movement', faith: 'Faith', secular: 'Secular' };
export const PULSE_NAMES = { held: 'Yes, our rota held', partly: 'Partly, we need an adjustment', 'not-held': 'No, we need to revisit it' };
export const DEFAULT_COVERAGE = 'We ask for explicit agreement before passing a role. When nobody has capacity, we reduce, postpone or pause the work together.';
export const DEFAULT_EXCEPTION = 'We agree a narrow emergency contact before each handover. Routine questions can wait. A coverage gap does not cancel someone’s need for rest.';
// Original generic prompts, not Seven Shifts excerpts. Evan retains curriculum ownership.
export function covenantDraft(frame: Frame) { const intro = { movement: 'Rest is essential to the work we share. Our commitment to the cause includes care for the people carrying it.', faith: 'We make room for rest as an expression of care for one another. Our shared work leaves space for renewal and the whole of life.', secular: 'Rest is an essential part of how we work together. Every person deserves time that is genuinely their own.' }[frame]; return `${intro}\n\nWe share responsibility for making rest possible. We plan coverage, accept handovers explicitly, and respect time away.\n\nWhen nobody has capacity, we decide what can wait. We do not require someone to solve every gap before stepping away.\n\nWe remain part of this team while resting. We return to this agreement together when our needs change.`; }
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dateOf = (s: string) => new Date(`${s}T12:00:00`);
export function weekStart(date: Date) { const d = new Date(date); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
export function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
export function renewalDate() { const d = new Date(); d.setMonth(d.getMonth() + 3); return dayKey(d); }
export const displayTime = (s: string) => { const [h, m] = s.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? 'pm' : 'am'}`; };
export const windowReady = (w: RestWindow) => w.covers.length > 0 && w.covers.every(c => c.status === 'accepted' || c.status === 'paused');
const overlaps = (a: RestWindow, b: RestWindow) => a.date === b.date && a.start < b.end && b.start < a.end;
// Explicit acceptance and declared conflicts only. Never infer health or actual capacity.
export function coverageConflict(team: Team, w: RestWindow, c: Cover): string | null { if (!c.alias)
    return 'Choose an alias before accepting coverage.'; if (c.alias === w.alias)
    return 'The person resting cannot cover their own handover.'; if (!team.members.includes(c.alias))
    return 'Choose an alias from this team.'; for (const o of team.windows) {
    if (!overlaps(w, o))
        continue;
    if (o.alias === c.alias)
        return `${c.alias} has a rest window at that time.`;
    if (o.covers.some(x => x.id !== c.id && x.alias === c.alias && x.status === 'accepted'))
        return `${c.alias} already has accepted coverage at that time. Revise the plan together.`;
} return null; }
export function validateWindow(team: Team, w: RestWindow): string | null { if (!team.members.includes(w.alias))
    return 'Choose a team alias.'; const d = dateOf(w.date); if (!Number.isFinite(d.getTime()) || dayKey(d) !== w.date)
    return 'Choose a valid date.'; if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(w.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(w.end) || w.start >= w.end)
    return 'The end time must be later on the same day.'; if (!w.covers.length || w.covers.some(c => !c.role.trim()))
    return 'Add at least one responsibility.'; const other = team.windows.find(o => o.id !== w.id && overlaps(w, o) && (o.alias === w.alias || o.covers.some(c => c.alias === w.alias && c.status === 'accepted'))); if (other)
    return `${w.alias} already has rest or accepted coverage in that window. Revise that commitment first.`; return null; }
export function sampleTeam(): Team { const mon = weekStart(new Date()); const mk = (n: number, alias: string, start: string, end: string, covers: Cover[]): RestWindow => ({ id: `sample-${n}-${alias}`, date: dayKey(addDays(mon, n)), start, end, alias, covers }); return { schema: 1, name: 'The Lantern Collective', frame: 'movement', identity: 'aliases', members: ['Cedar', 'Birch', 'Ash', 'Willow', 'Oak'], covenant: covenantDraft('movement'), coverageRule: DEFAULT_COVERAGE, exceptionRule: DEFAULT_EXCEPTION, adopted: dayKey(addDays(mon, -7)), renewal: renewalDate(), revision: 1, pulse: null, windows: [mk(0, 'Willow', '09:00', '12:00', [{ id: 'c1', role: 'Community contact', alias: 'Oak', status: 'accepted', note: 'Hold routine questions for the afternoon. Use the agreed contact list.' }]), mk(1, 'Oak', '13:00', '16:00', [{ id: 'c2', role: 'Volunteer enquiries', alias: 'Willow', status: 'accepted', note: 'The welcome information is ready. Anything else can wait.' }]), mk(3, 'Cedar', '10:00', '12:00', [{ id: 'c3', role: 'Community contact', alias: 'Birch', status: 'accepted', note: 'The current brief is in the team’s usual secure place.' }, { id: 'c4', role: 'Public updates', alias: 'Ash', status: 'proposed', note: 'Please review the approved update before sharing it.' }, { id: 'c5', role: 'Planning meeting', alias: '', status: 'paused', note: 'The team agreed to move this meeting to next week.' }]), mk(4, 'Birch', '10:00', '13:00', [{ id: 'c6', role: 'Community contact', alias: 'Cedar', status: 'accepted', note: 'Routine questions can wait until Birch returns.' }])] }; }
