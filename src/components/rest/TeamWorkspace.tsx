// Product contract: team adoption, covenant ceremony, explicit torch handovers,
// aliases/local storage, print fallback, one shared pulse; no gamification or tracking.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Flame, CalendarDays, BookOpen, HeartHandshake, Settings2, ShieldCheck, Plus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowRight, Check, Clock3, Printer, LockKeyhole, Download, Upload, Trash2, Users, Leaf, Pause, NotebookPen, KeyRound, WifiOff, CheckCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar-utils';
import { toast } from '@/lib/rest-notifications';
import { Link } from 'react-router-dom';
import { RestGlyph } from '@/components/rest/RestGlyph';
import { type Team, type RestWindow, type Cover, type Frame, type View, FRAME_NAMES, PULSE_NAMES, DEFAULT_COVERAGE, DEFAULT_EXCEPTION, covenantDraft, sampleTeam, dayKey, dateOf, weekStart, addDays, renewalDate, displayTime, windowReady, coverageConflict, validateWindow, teamSchema } from '@/lib/rest-model';
import { VAULT_KEY, createVault, openVault, saveVault, seal, downloadEnvelope, parseEnvelope } from '@/lib/local-vault';
const fmt = (d: Date, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => d.toLocaleDateString('en-US', options);
const uid = () => crypto.randomUUID();
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Your current information is still here.';
const cleanOld = (t: Team): Team => ({ ...t, windows: t.windows.filter(w => w.date >= dayKey(addDays(new Date(), -7))) });
function Choice({ label, value, onChange, options, id }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: {
        value: string;
        label: string;
    }[];
    id: string;
}) { return <div className="field"><Label htmlFor={id}>{label}</Label><Select value={value ? 'value:' + value : 'empty'} onValueChange={v => onChange(v === 'empty' ? '' : v.slice(6))}><SelectTrigger id={id} className="field-control"><SelectValue /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value ? 'value:' + o.value : 'empty'}>{o.label}</SelectItem>)}</SelectContent></Select></div>; }
function ConfirmLine({ checked, onChange, children, id }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    children: React.ReactNode;
    id: string;
}) { return <div className="confirm-line"><Checkbox id={id} checked={checked} onCheckedChange={v => onChange(v === true)}/><label htmlFor={id}>{children}</label></div>; }
function Status({ w }: {
    w: RestWindow;
}) { const ready = windowReady(w), paused = w.covers.every(c => c.status === 'paused'); return <span className={`status ${ready ? 'ready' : 'pending'}`}>{ready ? (paused ? <Pause size={13}/> : <Check size={13}/>) : <Clock3 size={13}/>} {ready ? (paused ? 'Work paused' : 'Coverage agreed') : 'Handover pending'}</span>; }
function Alias({ name, small = false }: {
    name: string;
    small?: boolean;
}) { const colors = ['fern', 'ochre', 'blue', 'rose', 'plum']; let n = 0; for (const c of name)
    n += c.charCodeAt(0); return <span className={`alias-avatar ${colors[n % 5]} ${small ? 'small' : ''}`} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>; }
function AppNavigation({ view, navigate }: {
    view: View;
    navigate: (v: View) => void;
}) { const { setOpenMobile } = useSidebar(); const nav = [['rota', 'Rest rota', CalendarDays], ['covenant', 'Our covenant', BookOpen], ['pulse', 'Team pulse', HeartHandshake], ['settings', 'Team & privacy', Settings2]] as const; return <SidebarMenu>{nav.map(([id, label, Icon]) => <SidebarMenuItem key={id}><SidebarMenuButton isActive={view === id} onClick={() => { navigate(id); setOpenMobile(false); }} className="app-nav-item"><Icon /><span>{label}</span>{view === id && <span className="nav-mark"/>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>; }
export default function TeamWorkspace() {
    const [initial] = useState(() => { try {
        const exists = !!localStorage.getItem(VAULT_KEY);
        return { team: exists ? null : sampleTeam(), exists, error: '' };
    }
    catch {
        return { team: sampleTeam(), exists: false, error: 'This browser blocks local storage. You can explore the sample; a saved team needs storage enabled.' };
    } });
    const [team, setTeam] = useState<Team | null>(initial.team), [demo, setDemo] = useState(!initial.exists), [hasVault, setHasVault] = useState(initial.exists), [locked, setLocked] = useState(initial.exists);
    const [view, setView] = useState<View>('rota'), [week, setWeek] = useState(() => weekStart(new Date())), [layout, setLayout] = useState('week');
    const [setup, setSetup] = useState(false), [creatingWindow, setCreatingWindow] = useState<string | null>(null), [selected, setSelected] = useState<string | null>(null), [editingCovenant, setEditingCovenant] = useState(false);
    const [saveStatus, setSaveStatus] = useState(''), [online, setOnline] = useState(() => navigator.onLine), [offlineReady, setOfflineReady] = useState(false), [confirm, setConfirm] = useState<{
        title: string;
        body: string;
        action: () => void;
    } | null>(null);
    const [importRaw, setImportRaw] = useState<string | null>(null), [storageError, setStorageError] = useState(initial.error);
    const secret = useRef<{
        key: CryptoKey;
        salt: string;
    } | null>(null), saveQueue = useRef<Promise<void>>(Promise.resolve()), saveFailed = useRef(false), teamRef = useRef<Team | null>(null), demoRef = useRef(true), viewRef = useRef<View>('rota');
    useEffect(() => { teamRef.current = team; demoRef.current = demo; viewRef.current = view; }, [team, demo, view]);
    useEffect(() => { const on = () => setOnline(navigator.onLine); window.addEventListener('online', on); window.addEventListener('offline', on); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on); }; }, []);
    useEffect(() => { if (!import.meta.env.PROD || !('serviceWorker' in navigator))
        return; const listener = (e: MessageEvent) => { if (e.data?.type === 'RESTIVISM_OFFLINE_READY')
        setOfflineReady(true); }; navigator.serviceWorker.addEventListener('message', listener); navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(r => r.active?.postMessage({ type: 'CHECK_READY' })).catch(() => setOfflineReady(false)); return () => navigator.serviceWorker.removeEventListener('message', listener); }, []);
    useEffect(() => { const before = (e: BeforeUnloadEvent) => { if (saveFailed.current || saveStatus === 'Saving…') {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before); }, [saveStatus]);
    useEffect(() => { const changed = (event: StorageEvent) => { if (event.key !== VAULT_KEY || demoRef.current)
        return; saveFailed.current = true; setSaveStatus('Not saved. Another tab changed this team.'); setStorageError('Another tab changed this team. Download a backup of your open copy, then reload to unlock the latest version.'); }; window.addEventListener('storage', changed); return () => window.removeEventListener('storage', changed); }, []);
    // WebMCP exposes only navigation and stages forms. No team data or acceptance to agents.
    useEffect(() => { const context = (document as Document & {
        modelContext?: {
            registerTool: (tool: unknown, options: unknown) => void | Promise<void>;
        };
    }).modelContext; if (!context)
        return; const controller = new AbortController(); const register = (tool: unknown) => { try {
        void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => { });
    }
    catch { /* Unsupported implementations leave the visible controls available. */ } }; register({ name: 'restivism_open_view', title: 'Open a Restivism view', description: 'Navigate to rota, covenant, pulse, or settings. Does not read or change team records.', inputSchema: { type: 'object', properties: { view: { type: 'string', enum: ['rota', 'covenant', 'pulse', 'settings'] } }, required: ['view'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: unknown) => { const x = input as {
            view?: View;
        }; if (!x || !['rota', 'covenant', 'pulse', 'settings'].includes(x.view || '') || Object.keys(x).length !== 1)
            throw new Error('Choose a supported view.'); if (!teamRef.current)
            throw new Error('Unlock the team in the interface first.'); setView(x.view!); await new Promise(r => setTimeout(r, 0)); return { opened: x.view }; } }); register({ name: 'restivism_start_rest_window', title: 'Open the rest window form', description: 'Open an empty rest-window form for a person to complete. Does not create a schedule or accept coverage.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: unknown) => { if (!input || typeof input !== 'object' || Object.keys(input).length)
            throw new Error('No arguments are accepted.'); if (!teamRef.current)
            throw new Error('Unlock the team first.'); setView('rota'); setCreatingWindow(dayKey(new Date())); await new Promise(r => setTimeout(r, 0)); return { formOpened: true, recordCreated: false }; } }); return () => controller.abort(); }, []);
    function commit(value: Team) { let next: Team; try {
        next = teamSchema.parse({ ...value, revision: value.revision + 1 });
    }
    catch {
        toast.error('Please check the fields. Changes were not saved.');
        return;
    } setTeam(next); teamRef.current = next; if (demo)
        return; const current = secret.current; if (!current) {
        toast.error('Unlock your team before saving.');
        return;
    } setSaveStatus('Saving…'); saveQueue.current = saveQueue.current.then(async () => { try {
        await saveVault(next, current.key, current.salt);
        saveFailed.current = false;
        setSaveStatus('Saved on this device');
    }
    catch {
        saveFailed.current = true;
        setSaveStatus('Not saved. Download a backup before leaving.');
        toast.error('Your browser could not save this change. Download an encrypted backup while the team is open.');
    } }); }
    async function lock() { await saveQueue.current; if (saveFailed.current) {
        toast.error('Changes are not saved. Download a backup, then reload to discard this open copy.');
        return;
    } secret.current = null; teamRef.current = null; setTeam(null); setSelected(null); setLocked(true); setDemo(false); setSaveStatus(''); }
    async function backup() { if (!team || !secret.current)
        return; try {
        downloadEnvelope(await seal(team, secret.current.key, secret.current.salt));
        toast.success('Encrypted backup downloaded. Keep the passphrase separately.');
    }
    catch (e) {
        toast.error(errorText(e));
    } }
    function printPage() { window.print(); }
    function restore(file: File) { if (file.size > 3000000) {
        toast.error('Choose a Restivism backup smaller than 3 MB.');
        return;
    } file.text().then(raw => { parseEnvelope(raw); setImportRaw(raw); }).catch(() => toast.error('That file is not a supported encrypted backup.')); }
    if (locked)
        return <><UnlockScreen onUnlock={async (pass) => { const raw = localStorage.getItem(VAULT_KEY); if (!raw)
            throw new Error('No saved team is available on this device.'); const opened = await openVault(raw, pass); secret.current = { key: opened.key, salt: opened.salt }; const cleaned = cleanOld(opened.team); await saveVault(cleaned, opened.key, opened.salt); setTeam(cleaned); setLocked(false); setDemo(false); setSaveStatus('Saved on this device'); }} onDemo={() => { secret.current = null; setTeam(sampleTeam()); setLocked(false); setDemo(true); }} onRestore={restore}/>{importRaw && <RestoreDialog exists={hasVault} onClose={() => setImportRaw(null)} onRestore={async (pass) => { const o = await openVault(importRaw, pass); secret.current = { key: o.key, salt: o.salt }; const cleaned = cleanOld(o.team); await saveVault(cleaned, o.key, o.salt); setTeam(cleaned); setDemo(false); setLocked(false); setHasVault(true); setImportRaw(null); }}/>}</>;
    if (!team)
        return null;
    const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    const windows = team.windows.filter(w => w.date >= dayKey(week) && w.date <= dayKey(addDays(week, 6))).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    const handovers = team.windows.flatMap(w => w.covers.filter(c => c.status === 'proposed' || c.status === 'declined').map(c => ({ w, c })));
    const current = team.windows.find(w => w.id === selected);
    const viewNames = { rota: 'Rest rota', covenant: 'Our covenant', pulse: 'Team pulse', settings: 'Team & privacy' };
    return <SidebarProvider style={{ '--sidebar-width': '15rem' } as CSSProperties}><Sidebar className="app-sidebar" collapsible="offcanvas"><SidebarHeader className="brand-area"><div className="brand"><span className="brand-symbol"><RestGlyph width={28} height={28}/></span><span>Restivism</span></div><span className="brand-sub">Rest is resistance.</span></SidebarHeader><SidebarContent className="side-content"><div className="workspace-name"><span className="workspace-letter">{team.name.slice(0, 1)}</span><div><strong>{team.name}</strong><span>{demo ? 'Sample team' : `${team.members.length} team ${team.identity === 'aliases' ? 'aliases' : 'members'}`}</span></div></div><div className="nav-caption">OUR SHARED SPACE</div><AppNavigation view={view} navigate={setView}/></SidebarContent><SidebarFooter className="side-footer"><div className="timer-links"><span>TIME AWAY, WITHOUT TRACKING</span><Link to="/rest/play">Play</Link><Link to="/rest/sleep">Sleep</Link><Link to="/rest/social">Connect</Link></div><div className="side-principle"><Leaf size={21}/><p>We hold the work,<br />so you can step away.</p></div><button onClick={() => setView('settings')} className="side-privacy"><ShieldCheck size={17}/><span>{demo ? 'Fictional data only' : 'Encrypted on this device'}</span><ChevronRight size={15}/></button></SidebarFooter></Sidebar>
    <a className="skip-link" href="#workspace-main">Skip to content</a><main className="app-main" id="workspace-main"><header className="topbar"><div className="crumb"><SidebarTrigger className="mobile-nav"/><span>Our shared space</span><span className="crumb-slash">/</span><strong>{viewNames[view]}</strong></div><div className="top-actions"><span className="device-status">{!online ? <WifiOff size={15}/> : <ShieldCheck size={15}/>} {!online ? 'Offline' : offlineReady ? 'Ready offline' : 'On this device'}</span>{!demo && <button className="icon-button" onClick={lock} title="Lock team" aria-label="Lock team"><LockKeyhole size={18}/></button>}</div></header>
    {demo && <div className="demo-bar"><div><span className="sample-label">SAMPLE WORKSPACE</span><span>Explore the rota. These people and handovers are fictional.</span></div><button onClick={() => hasVault ? lock() : setSetup(true)}>{hasVault ? 'Unlock your team' : 'Create your team'}<ArrowUpRight size={15}/></button></div>}
    {storageError && <p role="alert" className="error-banner">{storageError}</p>}{saveStatus.startsWith('Not saved') && <p role="alert" className="error-banner">{saveStatus} <button onClick={backup}>Download backup</button></p>}
    <div className="workspace-content">
    {view === 'rota' && <><div className="page-heading"><div><div className="eyebrow">ROOM FOR EACH OTHER</div><h1>Our rest rota</h1><p>Time away is a shared commitment. Here’s who’s holding the torch.</p></div><div className="heading-actions"><Button className="quiet-button" variant="outline" onClick={printPage}><Printer size={17}/>Print rota</Button><Button className="primary-button" onClick={() => setCreatingWindow(dayKey(new Date()))}><Plus size={18}/>Add rest window</Button></div></div>
    <Tabs value={layout} onValueChange={setLayout} className="rota-view"><div className="rota-toolbar"><div className="week-navigation"><div className="week-arrows"><button aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft size={18}/></button><button aria-label="Next week" onClick={() => setWeek(addDays(week, 7))}><ChevronRight size={18}/></button></div><h2>{fmt(week)} – {fmt(addDays(week, 6))}<span>, {week.getFullYear()}</span></h2><button className="today-button" onClick={() => setWeek(weekStart(new Date()))}>This week</button></div><TabsList className="view-toggle"><TabsTrigger value="week"><CalendarDays size={15}/>Week</TabsTrigger><TabsTrigger value="agenda"><NotebookPen size={15}/>Agenda</TabsTrigger></TabsList></div>
    <TabsContent value="week" className="calendar-wrap"><Table className="rota-calendar"><TableHeader><TableRow>{days.map(d => <TableHead key={dayKey(d)} className={dayKey(d) === dayKey(new Date()) ? 'today-column' : ''}><span>{fmt(d, { weekday: 'short' })}</span><strong>{d.getDate()}</strong>{dayKey(d) === dayKey(new Date()) && <small>Today</small>}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow>{days.map(d => <TableCell key={dayKey(d)} className={dayKey(d) === dayKey(new Date()) ? 'today-column' : ''}><div className="day-slots">{windows.filter(w => w.date === dayKey(d)).map(w => <button className={`rest-card ${windowReady(w) ? 'covered-card' : 'waiting-card'}`} key={w.id} onClick={() => setSelected(w.id)} aria-label={`Open ${w.alias} handover, ${fmt(d)}`}><div className="slot-time">{displayTime(w.start)} – {displayTime(w.end)}</div><div className="slot-person"><Alias name={w.alias}/><strong>{w.alias}</strong></div><span className="slot-rest-label">Time to rest</span><div className="slot-cover"><Flame size={13}/>{w.covers.filter(c => c.alias && c.status !== 'paused').map(c => c.alias).filter((x, i, a) => a.indexOf(x) === i).join(' & ') || 'Coverage to agree'}</div><Status w={w}/></button>)}<button className="add-day" onClick={() => setCreatingWindow(dayKey(d))} aria-label={`Add rest window on ${fmt(d)}`}><Plus size={15}/><span>Add time</span></button></div></TableCell>)}</TableRow></TableBody></Table><div className="calendar-note"><span><Flame size={15}/> A handover counts when the person covering has agreed.</span><span>Local rota · revision {team.revision}</span></div></TabsContent>
    <TabsContent value="agenda"><div className="agenda-table"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Resting</TableHead><TableHead>Time away</TableHead><TableHead>Coverage</TableHead><TableHead><span className="sr-only">Action</span></TableHead></TableRow></TableHeader><TableBody>{windows.map(w => <TableRow key={w.id}><TableCell>{fmt(dateOf(w.date), { weekday: 'short', month: 'short', day: 'numeric' })}</TableCell><TableCell><div className="inline-alias"><Alias small name={w.alias}/>{w.alias}</div></TableCell><TableCell>{displayTime(w.start)} – {displayTime(w.end)}</TableCell><TableCell><Status w={w}/></TableCell><TableCell><Button variant="ghost" onClick={() => setSelected(w.id)}>Handover<ArrowRight size={15}/></Button></TableCell></TableRow>)}{!windows.length && <TableRow><TableCell colSpan={5}><div className="empty-state"><Leaf /><h3>A little room to begin</h3><p>Agree on a rest window together, then add the coverage.</p><Button onClick={() => setCreatingWindow(dayKey(week))}>Add rest window</Button></div></TableCell></TableRow>}</TableBody></Table></div></TabsContent></Tabs>
    <div className="rota-bottom"><section className="covenant-preview"><div className="section-kicker"><BookOpen size={17}/>OUR COVENANT</div><blockquote>“{team.covenant.split('\n')[0] || 'We make room for rest together.'}”</blockquote><div className="section-bottom"><span>{team.adopted ? 'Agreed together' : 'Ready for your team’s words'}</span><button onClick={() => setView('covenant')}>Read our covenant<ArrowUpRight size={16}/></button></div></section><section className="handover-preview"><div className="panel-heading"><h2>Passing the torch</h2><Flame size={21}/></div>{handovers.length ? <><p>These handovers still need a conversation.</p>{handovers.slice(0, 2).map(({ w, c }) => <button className="pending-row" key={c.id} onClick={() => setSelected(w.id)}><Alias name={c.alias || w.alias} small/><span><strong>{c.role}</strong><small>{c.alias ? `${c.alias} to confirm` : 'Choose someone to cover'} · {fmt(dateOf(w.date))}</small></span><ArrowRight size={17}/></button>)}</> : <div className="all-agreed"><CheckCheck size={26}/><p>Your listed handovers are agreed or paused. Keep checking together as plans change.</p></div>}</section></div></>}
    {view === 'covenant' && <><div className="page-heading"><div><div className="eyebrow">PERMISSION, IN OUR OWN WORDS</div><h1>Our covenant</h1><p>An agreement we return to, and put into practice together.</p></div><div className="heading-actions"><Button variant="outline" className="quiet-button" onClick={printPage}><Printer size={17}/>Print covenant</Button><Button className="primary-button" onClick={() => setEditingCovenant(true)}><NotebookPen size={17}/>{team.adopted ? 'Renew together' : 'Begin the ceremony'}</Button></div></div><div className="covenant-layout"><article className="covenant-document"><Flame size={28}/><div className="document-kicker">{team.name}</div><h2>We make room for rest.</h2><div className="covenant-prose">{team.covenant.split('\n\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div><div className="document-agreements"><h3>When coverage is difficult</h3><p>{team.coverageRule}</p><h3>Respecting time away</h3><p>{team.exceptionRule}</p></div><footer><span>{team.adopted ? `Adopted ${fmt(dateOf(team.adopted), { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Draft for the team to discuss'}</span><span>{FRAME_NAMES[team.frame]} framing</span></footer></article><aside className="covenant-aside"><BookOpen size={25}/><h3>A ceremony, then a practice</h3><p>Read it aloud. Change what doesn’t sound like your team. Agree how you will make room for each other.</p><div className="aside-rule"/><h4>Our next renewal</h4><p>{team.renewal ? fmt(dateOf(team.renewal), { month: 'long', day: 'numeric', year: 'numeric' }) : 'Choose together when you adopt the covenant.'}</p><h4>Make the words real</h4><p>Let your first rota follow the agreement. A gap is a reason to revise the work.</p><Button variant="outline" onClick={() => setView('rota')}>Open the rota<ArrowRight size={15}/></Button></aside></div></>}
    {view === 'pulse' && <PulseView team={team} commit={commit} onClear={() => setConfirm({ title: 'Remove the shared pulse?', body: 'This removes the single team answer from this device. It does not change the rota.', action: () => commit({ ...team, pulse: null }) })}/>}
    {view === 'settings' && <SettingsView team={team} demo={demo} commit={commit} offlineReady={offlineReady} onBackup={backup} onRestore={restore} onLock={lock} onCreate={() => hasVault ? lock() : setSetup(true)} onClear={() => setConfirm({ title: demo ? 'Reset the sample team?' : 'Remove this team from this device?', body: demo ? 'The fictional covenant and rota will return to their starting point.' : 'Download an encrypted backup first if you need it. The covenant, rota and pulse on this device will be removed. Existing exports and printouts will remain.', action: async () => { await saveQueue.current; if (!demo) {
            localStorage.removeItem(VAULT_KEY);
            setHasVault(false);
        } secret.current = null; saveFailed.current = false; setTeam(sampleTeam()); setDemo(true); setView('rota'); setSaveStatus(''); } })}/>}
    </div><footer className="app-footer"><span><Leaf size={14}/>Rest is part of the work.</span><span>{demo ? 'Sample changes last until you reload.' : saveStatus || 'Encrypted on this device'}</span></footer></main>
    {setup && <TeamSetup onClose={() => setSetup(false)} onCreate={async (t, pass) => { if (localStorage.getItem(VAULT_KEY))
        throw new Error('A saved team already exists. Unlock it or remove it before creating another.'); const v = await createVault(t, pass); secret.current = v; setTeam(t); setDemo(false); setHasVault(true); setSetup(false); setView('rota'); setSaveStatus('Saved on this device'); toast.success('Your team has a shared place to begin.'); }}/>}
    {creatingWindow && <WindowDialog team={team} date={creatingWindow} onClose={() => setCreatingWindow(null)} onSave={w => { commit({ ...team, windows: [...team.windows, w] }); setWeek(weekStart(dateOf(w.date))); setCreatingWindow(null); setSelected(w.id); toast.success('Rest window added. Agree the handovers together.'); }}/>}
    {current && <HandoverSheet team={team} w={current} onClose={() => setSelected(null)} commit={commit} onDelete={() => setConfirm({ title: 'Remove this rest window?', body: 'This removes the planned window and its handover notes. Discuss changes with anyone who accepted coverage.', action: () => { commit({ ...team, windows: team.windows.filter(w => w.id !== current.id) }); setSelected(null); } })}/>}
    {editingCovenant && <CovenantDialog team={team} onClose={() => setEditingCovenant(false)} onSave={t => { commit(t); setEditingCovenant(false); toast.success(t.adopted ? 'Covenant adopted together.' : 'Covenant draft saved.'); }}/>}
    {importRaw && <RestoreDialog exists={hasVault} onClose={() => setImportRaw(null)} onRestore={async (pass) => { await saveQueue.current; const o = await openVault(importRaw, pass); const cleaned = cleanOld(o.team); await saveVault(cleaned, o.key, o.salt); secret.current = { key: o.key, salt: o.salt }; setTeam(cleaned); setDemo(false); setHasVault(true); setImportRaw(null); setSelected(null); setSaveStatus('Saved on this device'); toast.success('Your encrypted backup is open on this device.'); }}/>}
    <AlertDialog open={!!confirm} onOpenChange={open => { if (!open)
        setConfirm(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.body}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction className="danger-button" onClick={() => { confirm?.action(); setConfirm(null); }}>Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <PrintView team={team} windows={windows} view={view} week={week}/>
  </SidebarProvider>;
}
function FrameChoice({ value, onChange }: {
    value: Frame;
    onChange: (v: Frame) => void;
}) { return <div className="field"><Label>Choose your team’s framing</Label><RadioGroup className="frame-options" value={value} onValueChange={v => onChange(v as Frame)}>{(['movement', 'faith', 'secular'] as Frame[]).map(f => <label key={f} className={value === f ? 'chosen' : ''}><RadioGroupItem value={f}/><strong>{FRAME_NAMES[f]}</strong><span>{f === 'movement' ? 'Care within our cause' : f === 'faith' ? 'Care as a shared calling' : 'Care in how we work'}</span></label>)}</RadioGroup></div>; }
function TeamSetup({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (t: Team, p: string) => Promise<void>;
}) {
    const [step, setStep] = useState(0), [name, setName] = useState(''), [members, setMembers] = useState('Cedar, Birch, Ash'), [frame, setFrame] = useState<Frame>('movement'), [identity, setIdentity] = useState<'aliases' | 'names'>('aliases'), [risk, setRisk] = useState(false);
    const [text, setText] = useState(covenantDraft('movement')), [coverage, setCoverage] = useState(DEFAULT_COVERAGE), [exception, setException] = useState(DEFAULT_EXCEPTION), [agreed, setAgreed] = useState(false), [pass, setPass] = useState(''), [again, setAgain] = useState(''), [understood, setUnderstood] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const list = members.split(',').map(s => s.trim()).filter(Boolean);
    function next() { setError(''); if (step === 0) {
        if (!name.trim() || list.length < 2 || list.length > 20)
            return setError('Add a team label and between 2 and 20 comma-separated member labels.');
        if (list.some(s => s.length > 28) || new Set(list.map(s => s.toLowerCase())).size !== list.length)
            return setError('Use different member labels, each 28 characters or fewer.');
        if (identity === 'names' && !risk)
            return setError('Discuss and confirm the real-name choice together.');
    } if (step === 1 && !text.trim())
        return setError('Write a covenant your team can discuss.'); if (step === 2 && (!coverage.trim() || !exception.trim()))
        return setError('Agree both the coverage rule and how you will respect time away.'); if (step === 2 && !agreed)
        return setError('Discuss the agreement together before adopting it.'); setStep(step + 1); }
    async function finish() { setError(''); if (pass.length < 12 || pass !== again)
        return setError('Use a passphrase of at least 12 characters and enter it the same way twice.'); if (!understood)
        return setError('Confirm that you will keep the passphrase safely.'); setBusy(true); try {
        await onCreate({ schema: 1, name: name.trim(), members: list, frame, identity, covenant: text, coverageRule: coverage, exceptionRule: exception, adopted: dayKey(new Date()), renewal: renewalDate(), revision: 1, windows: [], pulse: null }, pass);
    }
    catch (e) {
        setError(errorText(e));
        setBusy(false);
    } }
    return <Dialog open onOpenChange={v => { if (!v && !busy)
        onClose(); }}><DialogContent className="wide-dialog"><DialogHeader><div className="dialog-eyebrow">A SHARED BEGINNING · {step + 1} OF 4</div><DialogTitle>{['Bring your team together', 'Put it in your own words', 'Make the agreement practical', 'Keep your team on this device'][step]}</DialogTitle><DialogDescription>{['A leader starts the space. The team makes the commitment.', 'These are general starter words. Read them aloud and make them yours.', 'Decide what you can pause, and how you will respect time away.', 'Choose a passphrase to encrypt your covenant, rota and pulse.'][step]}</DialogDescription></DialogHeader><div className="dialog-scroll">
  {step === 0 && <><div className="field"><Label htmlFor="team-name">Team label</Label><Input id="team-name" maxLength={50} autoComplete="off" placeholder="A name your team recognizes" value={name} onChange={e => setName(e.target.value)}/><p className="field-hint">An identifying organization name is optional.</p></div><div className="field"><Label htmlFor="aliases">Member {identity === 'aliases' ? 'aliases' : 'names'}</Label><Input id="aliases" maxLength={580} value={members} autoComplete="off" onChange={e => setMembers(e.target.value)}/><p className="field-hint">Separate labels with commas. Agree who each label refers to outside the app.</p></div><Choice id="identity-setup" label="Identity choice" value={identity} onChange={v => setIdentity(v as 'aliases' | 'names')} options={[{ value: 'aliases', label: 'Aliases by default' }, { value: 'names', label: 'Real names, by explicit agreement' }]}/>{identity === 'names' && <ConfirmLine id="setup-risk" checked={risk} onChange={setRisk}>Everyone affected agreed to use real names. Existing copies cannot be recalled if we change this later.</ConfirmLine>}<FrameChoice value={frame} onChange={f => { setFrame(f); setText(covenantDraft(f)); setAgreed(false); }}/></>}
  {step === 1 && <div className="field"><Label htmlFor="setup-covenant">Our covenant</Label><Textarea id="setup-covenant" className="covenant-input" maxLength={5000} value={text} onChange={e => { setText(e.target.value); setAgreed(false); }}/><p className="field-hint">General wording, not an excerpt from Seven Shifts. Evan’s curriculum remains separate.</p></div>}
  {step === 2 && <><div className="field"><Label htmlFor="setup-coverage">When nobody can cover</Label><Textarea id="setup-coverage" maxLength={700} value={coverage} onChange={e => { setCoverage(e.target.value); setAgreed(false); }}/></div><div className="field"><Label htmlFor="setup-exception">Respecting time away</Label><Textarea id="setup-exception" maxLength={700} value={exception} onChange={e => { setException(e.target.value); setAgreed(false); }}/></div><ConfirmLine id="setup-agreed" checked={agreed} onChange={setAgreed}>We discussed this as a team and agree to put it into practice. Rest does not have to be earned.</ConfirmLine></>}
  {step === 3 && <><div className="local-note"><KeyRound size={20}/><p>This is a shared-device workspace. Your team records stay in this browser. Keep an encrypted backup and protect your device.</p></div><div className="field"><Label htmlFor="setup-pass">Passphrase</Label><Input id="setup-pass" type="password" autoComplete="new-password" value={pass} onChange={e => setPass(e.target.value)} minLength={12}/></div><div className="field"><Label htmlFor="setup-pass-again">Repeat passphrase</Label><Input id="setup-pass-again" type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)}/></div><ConfirmLine id="setup-understood" checked={understood} onChange={setUnderstood}>I will keep the passphrase safely. It cannot be reset, and clearing browser data can remove this team.</ConfirmLine></>}
  {error && <p className="form-error" role="alert">{error}</p>}</div><DialogFooter><Button variant="outline" disabled={busy} onClick={() => step ? setStep(step - 1) : onClose()}>{step ? 'Back' : 'Cancel'}</Button><Button className="primary-button" disabled={busy} onClick={step === 3 ? finish : next}>{busy ? 'Protecting your team…' : step === 3 ? 'Adopt covenant & create team' : 'Continue'}{!busy && step !== 3 && <ArrowRight size={16}/>}</Button></DialogFooter></DialogContent></Dialog>;
}
function WindowDialog({ team, date, onClose, onSave }: {
    team: Team;
    date: string;
    onClose: () => void;
    onSave: (w: RestWindow) => void;
}) { const [alias, setAlias] = useState(team.members[0]), [day, setDay] = useState(date), [start, setStart] = useState('10:00'), [end, setEnd] = useState('12:00'), [roles, setRoles] = useState('Community contact\nPublic updates'), [error, setError] = useState(''); function save(e: FormEvent) { e.preventDefault(); const rs = roles.split('\n').map(s => s.trim()).filter(Boolean); if (rs.length > 8 || rs.some(r => r.length > 60))
    return setError('Use up to 8 responsibilities, each 60 characters or fewer.'); const w: RestWindow = { id: uid(), date: day, start, end, alias, covers: rs.map(role => ({ id: uid(), role, alias: '', status: 'proposed', note: '' })) }; const message = validateWindow(team, w); if (message)
    return setError(message); if (team.windows.length >= 200)
    return setError('This rota is full. Remove windows you no longer need.'); onSave(w); } return <Dialog open onOpenChange={v => { if (!v)
    onClose(); }}><DialogContent className="wide-dialog"><DialogHeader><DialogTitle>Make room for rest</DialogTitle><DialogDescription>Add the time away, then agree who can hold each responsibility.</DialogDescription></DialogHeader><form onSubmit={save}><div className="dialog-scroll"><Choice id="resting-alias" label="Who is stepping away?" value={alias} onChange={setAlias} options={team.members.map(x => ({ value: x, label: x }))}/><div className="field"><Label htmlFor="rest-day">Day</Label><Input id="rest-day" type="date" required value={day} onChange={e => setDay(e.target.value)}/></div><div className="field-row"><div className="field"><Label htmlFor="rest-start">From</Label><Input id="rest-start" type="time" required value={start} onChange={e => setStart(e.target.value)}/></div><div className="field"><Label htmlFor="rest-end">Until</Label><Input id="rest-end" type="time" required value={end} onChange={e => setEnd(e.target.value)}/></div></div><div className="field"><Label htmlFor="rest-roles">What needs a handover?</Label><Textarea id="rest-roles" value={roles} onChange={e => setRoles(e.target.value)} placeholder="One responsibility per line" maxLength={488}/><p className="field-hint">One role per line. Include public communications if they need coverage. Keep identifying details out.</p></div>{error && <p className="form-error" role="alert">{error}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button className="primary-button" type="submit">Add rest window<ArrowRight size={16}/></Button></DialogFooter></form></DialogContent></Dialog>; }
function HandoverSheet({ team, w, onClose, commit, onDelete }: {
    team: Team;
    w: RestWindow;
    onClose: () => void;
    commit: (t: Team) => void;
    onDelete: () => void;
}) { function update(c: Cover) { commit({ ...team, windows: team.windows.map(x => x.id === w.id ? { ...x, covers: x.covers.map(y => y.id === c.id ? c : y) } : x) }); } return <Sheet open onOpenChange={o => { if (!o)
    onClose(); }}><SheetContent className="handover-sheet"><SheetHeader><div className="sheet-eyebrow"><Flame size={18}/>PASSING THE TORCH</div><SheetTitle>{w.alias}’s time away</SheetTitle><SheetDescription>{fmt(dateOf(w.date), { weekday: 'long', month: 'long', day: 'numeric' })} · {displayTime(w.start)}–{displayTime(w.end)}</SheetDescription></SheetHeader><div className="sheet-body"><Status w={w}/><p className="handover-intro">Discuss each handover together. Record acceptance only after the person covering has agreed.</p>{w.covers.map(c => <CoverageEditor key={`${c.id}-${c.alias}-${c.status}`} cover={c} w={w} team={team} onChange={update}/>)}<div className="local-note"><ShieldCheck size={18}/><p>Keep notes brief. Leave identities, locations, passwords and case details in your team’s existing secure systems.</p></div><p className="field-hint">A gap is a reason to revise the work. It does not revoke the need for rest.</p><Button variant="ghost" className="text-danger" onClick={onDelete}><Trash2 size={15}/>Remove this window</Button></div></SheetContent></Sheet>; }
function CoverageEditor({ cover, w, team, onChange }: {
    cover: Cover;
    w: RestWindow;
    team: Team;
    onChange: (c: Cover) => void;
}) { const [note, setNote] = useState(cover.note), [confirmed, setConfirmed] = useState(false), [mode, setMode] = useState<'accept' | 'pause' | null>(null), [error, setError] = useState(''); function saveMode() { if (!confirmed)
    return; if (mode === 'accept') {
    const problem = coverageConflict(team, w, cover);
    if (problem) {
        setError(problem);
        return;
    }
    onChange({ ...cover, note, status: 'accepted' });
    toast.success(`${cover.alias}’s agreement is recorded.`);
}
else {
    onChange({ ...cover, note, status: 'paused' });
    toast.success('The team’s decision to pause this work is recorded.');
} setMode(null); setConfirmed(false); } return <section className="coverage-editor"><div className="coverage-heading"><h3>{cover.role}</h3><span className={`cover-state ${cover.status}`}>{cover.status === 'accepted' ? 'Accepted' : cover.status === 'paused' ? 'Pause agreed' : cover.status === 'declined' ? 'Needs a new plan' : 'To agree'}</span></div>{cover.status !== 'paused' && <Choice id={`cover-${cover.id}`} label="Holding this role" value={cover.alias} onChange={alias => { onChange({ ...cover, alias, status: 'proposed', note }); setConfirmed(false); setMode(null); }} options={[{ value: '', label: 'Choose an alias' }, ...team.members.filter(x => x !== w.alias).map(x => ({ value: x, label: x }))]}/>}<div className="field"><Label htmlFor={`note-${cover.id}`}>Brief handover note</Label><Textarea id={`note-${cover.id}`} value={note} maxLength={240} onChange={e => setNote(e.target.value)} placeholder="Current status, next action, agreed limit"/><div className="note-controls"><span>{note.length}/240</span>{note !== cover.note && <button onClick={() => { onChange({ ...cover, note, status: cover.status === 'accepted' ? 'proposed' : cover.status }); toast.success(cover.status === 'accepted' ? 'Note saved. Please reconfirm the changed handover.' : 'Note saved.'); }}>Save note</button>}</div></div>{cover.status === 'accepted' ? <div className="accepted-line"><CheckCheck size={17}/><span>{cover.alias} has agreed to cover.</span><button onClick={() => onChange({ ...cover, status: 'proposed' })}>Reopen</button></div> : cover.status === 'paused' ? <div className="accepted-line"><Pause size={17}/><span>The team agreed this can wait.</span><button onClick={() => onChange({ ...cover, status: 'proposed' })}>Reopen</button></div> : <><div className="coverage-actions"><Button size="sm" disabled={!cover.alias} onClick={() => { setMode('accept'); setConfirmed(false); setError(''); }}>Record agreement</Button><Button size="sm" variant="outline" onClick={() => { setMode('pause'); setConfirmed(false); setError(''); }}>Agree to pause</Button>{cover.status !== 'declined' && cover.alias && <Button size="sm" variant="ghost" onClick={() => onChange({ ...cover, status: 'declined', note })}>Declined</Button>}</div>{mode && <div className="accept-confirm"><ConfirmLine id={`accept-${cover.id}`} checked={confirmed} onChange={setConfirmed}>{mode === 'accept' ? `${cover.alias} explicitly agreed to this handover and its limits.` : 'The team agreed to pause this responsibility for this window.'}</ConfirmLine>{error && <p className="form-error" role="alert">{error}</p>}<div className="coverage-actions"><Button size="sm" disabled={!confirmed} onClick={saveMode}>Confirm {mode === 'accept' ? 'acceptance' : 'pause'}</Button><Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancel</Button></div></div>}</>}</section>; }
function CovenantDialog({ team, onClose, onSave }: {
    team: Team;
    onClose: () => void;
    onSave: (t: Team) => void;
}) { const [frame, setFrame] = useState(team.frame), [text, setText] = useState(team.covenant), [coverage, setCoverage] = useState(team.coverageRule), [exception, setException] = useState(team.exceptionRule), [agreed, setAgreed] = useState(false); return <Dialog open onOpenChange={o => { if (!o)
    onClose(); }}><DialogContent className="wide-dialog"><DialogHeader><div className="dialog-eyebrow">OUR COVENANT CEREMONY</div><DialogTitle>Words we can stand behind</DialogTitle><DialogDescription>Read together, revise together, then choose to adopt the agreement.</DialogDescription></DialogHeader><div className="dialog-scroll"><FrameChoice value={frame} onChange={v => { setFrame(v); setAgreed(false); }}/><div className="field"><div className="label-row"><Label htmlFor="covenant-edit">Our shared words</Label><button onClick={() => { setText(covenantDraft(frame)); setAgreed(false); }}>Use general starter wording</button></div><Textarea id="covenant-edit" className="covenant-input" maxLength={5000} value={text} onChange={e => { setText(e.target.value); setAgreed(false); }}/><p className="field-hint">Drafting runs locally from general prompts. This is not AI-generated or Seven Shifts manuscript content.</p></div><div className="field"><Label htmlFor="coverage-rule">When nobody can cover</Label><Textarea id="coverage-rule" maxLength={700} value={coverage} onChange={e => { setCoverage(e.target.value); setAgreed(false); }}/></div><div className="field"><Label htmlFor="exception-rule">Respecting time away</Label><Textarea id="exception-rule" maxLength={700} value={exception} onChange={e => { setException(e.target.value); setAgreed(false); }}/></div><ConfirmLine id="adopt-agreement" checked={agreed} onChange={setAgreed}>We discussed these words as a team and agree to put them into practice.</ConfirmLine></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!text.trim() || !coverage.trim() || !exception.trim()} className="primary-button" onClick={() => onSave({ ...team, frame, covenant: text, coverageRule: coverage, exceptionRule: exception, adopted: agreed ? dayKey(new Date()) : null, renewal: agreed ? renewalDate() : null })}>{agreed ? 'Adopt our covenant' : 'Save as a draft'}</Button></DialogFooter></DialogContent></Dialog>; }
function PulseView({ team, commit, onClear }: {
    team: Team;
    commit: (t: Team) => void;
    onClear: () => void;
}) { const [answer, setAnswer] = useState<'held' | 'partly' | 'not-held' | ''>(team.pulse?.answer || ''), [discussed, setDiscussed] = useState(false); const period = `Week of ${fmt(weekStart(new Date()))}`; return <><div className="page-heading"><div><div className="eyebrow">ONE CONVERSATION, TOGETHER</div><h1>Our team pulse</h1><p>A moment to notice what held, and what needs to change.</p></div></div><div className="pulse-layout"><section className="pulse-card"><div className="pulse-icon"><HeartHandshake size={32}/></div><span className="period-label">{period}</span><h2>Did our agreed rest rota<br />hold this period?</h2><p>Discuss it as a team. You can record one shared answer, or leave this unrecorded.</p><RadioGroup value={answer} onValueChange={v => { setAnswer(v as typeof answer); setDiscussed(false); }} className="pulse-options">{Object.entries(PULSE_NAMES).map(([value, label]) => <label key={value} className={answer === value ? 'selected' : ''}><RadioGroupItem value={value}/><span>{label}</span></label>)}</RadioGroup><ConfirmLine id="pulse-discussed" checked={discussed} onChange={setDiscussed}>We discussed this together. This is our shared answer.</ConfirmLine><Button disabled={!answer || !discussed} className="primary-button pulse-save" onClick={() => { commit({ ...team, pulse: { period, answer: answer as 'held' | 'partly' | 'not-held', recorded: dayKey(new Date()) } }); setDiscussed(false); toast.success('Your shared pulse is saved.'); }}>Save shared pulse</Button><p className="field-hint">A new answer replaces the previous one. No individual responses are collected.</p></section><aside className="pulse-aside"><h3>A conversation, without a score</h3><p>Was the time away actually usable? Did coverage put pressure on someone else? What can the team do differently?</p><p>No personal ratings, names or explanations need to be recorded here.</p>{team.pulse && <div className="last-pulse"><div className="section-kicker">OUR LAST SHARED ANSWER</div><h4>{PULSE_NAMES[team.pulse.answer]}</h4><span>{team.pulse.period}</span><button onClick={onClear}>Remove shared answer</button></div>}<div className="aside-rule"/><ShieldCheck size={23}/><p className="field-hint">In a small team, even a shared answer can reveal something. Record it only if the team is comfortable.</p></aside></div></>; }
function SettingsView({ team, demo, commit, offlineReady, onBackup, onRestore, onLock, onCreate, onClear }: {
    team: Team;
    demo: boolean;
    commit: (t: Team) => void;
    offlineReady: boolean;
    onBackup: () => void;
    onRestore: (f: File) => void;
    onLock: () => void;
    onCreate: () => void;
    onClear: () => void;
}) {
    const [alias, setAlias] = useState(''), [identityOpen, setIdentityOpen] = useState(false), [legacy, setLegacy] = useState(() => { try {
        return !!localStorage.getItem('restivism:state');
    }
    catch {
        return false;
    } }), [legacyConsent, setLegacyConsent] = useState(false);
    const file = useRef<HTMLInputElement>(null);
    return <><div className="page-heading"><div><div className="eyebrow">CARE IN HOW WE KEEP THINGS</div><h1>Team & privacy</h1><p>A small amount of information. Clear choices about where it lives.</p></div></div><div className="settings-grid">{legacy && <section className="settings-section full"><h2>Earlier personal rest data</h2><p>An earlier Restivism version saved personal check-ins, sessions and quests in this browser. This workspace does not read or add to those records.</p><ConfirmLine id="legacy-remove-consent" checked={legacyConsent} onChange={setLegacyConsent}>Remove that earlier personal history from this browser.</ConfirmLine><Button variant="outline" className="mt-4" disabled={!legacyConsent} onClick={() => { try {
        localStorage.removeItem('restivism:state');
        setLegacy(false);
        toast.success('Earlier personal history removed.');
    }
    catch {
        toast.error('This browser could not remove the earlier data.');
    } }}>Remove earlier history</Button></section>}<section className="settings-section"><h2><Users size={21}/>Our team</h2><div className="settings-label">{team.name}</div><p>{team.identity === 'aliases' ? 'Aliases are the team’s agreed labels. The app has no map to real identities.' : 'This team chose to use real names. Consider who can access this device and its copies.'}</p><div className="member-chips">{team.members.map(m => <span key={m}><Alias small name={m}/>{m}</span>)}</div><form className="add-member" onSubmit={e => { e.preventDefault(); if (!alias.trim())
        return; if (team.members.length >= 20 || team.members.some(m => m.toLowerCase() === alias.trim().toLowerCase())) {
        toast.error('Use a new label. A team can have up to 20 labels.');
        return;
    } commit({ ...team, members: [...team.members, alias.trim()] }); setAlias(''); toast.success('Team label added.'); }}><Input aria-label="New team alias" placeholder="Add a team label" value={alias} maxLength={28} onChange={e => setAlias(e.target.value)} autoComplete="off"/><Button type="submit" variant="outline"><Plus size={16}/>Add</Button></form><button className="text-link" onClick={() => setIdentityOpen(true)}>Identity choices<ArrowRight size={15}/></button></section>
    <section className="settings-section"><h2><LockKeyhole size={21}/>On this device</h2><p>{demo ? 'You are using a fictional sample. Its changes are held in memory and disappear on reload.' : 'Your team records are encrypted in this browser. The passphrase and unlocked key are not saved. Lock the team when you step away.'}</p><div className="settings-actions">{demo ? <Button onClick={onCreate}>Open your own team<ArrowRight size={15}/></Button> : <><Button variant="outline" onClick={onBackup}><Download size={16}/>Encrypted backup</Button><Button variant="outline" onClick={onLock}><LockKeyhole size={16}/>Lock team</Button></>}<Button variant="outline" onClick={() => file.current?.click()}><Upload size={16}/>Restore backup</Button><input hidden ref={file} type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f)
        onRestore(f); e.target.value = ''; }}/></div><p className="field-hint">Clearing browser data can remove your team. Backups need the original passphrase. Exports and printouts remain sensitive.</p></section>
    <section className="settings-section"><h2><ShieldCheck size={21}/>Small by design</h2><ul className="privacy-list"><li><Check size={16}/>No individual mood or engagement data</li><li><Check size={16}/>No analytics or advertising scripts</li><li><Check size={16}/>One shared pulse, with no response history</li><li><Check size={16}/>No live team data sent to AI services</li></ul><p>Rota entries older than seven days are removed when you unlock your team. Existing backups and printouts are not changed.</p><p className="field-hint">This app has not had an independent security audit. Aliases can still be identifiable, and an unlocked or compromised device can expose data.</p></section>
    <section className="settings-section"><h2><WifiOff size={21}/>A local working space</h2><p>{offlineReady ? 'The app shell is saved for offline use on this browser.' : 'Open the published app while connected to prepare its offline copy.'} You can work together on one device and print the covenant or rota.</p><p>Device-to-device synchronization is not enabled. An encrypted backup is a snapshot; restoring it replaces the local team and does not merge changes.</p><p className="field-hint">The host still handles site access and page requests. Local storage does not mean zero network metadata or zero risk.</p></section>
    <section className="settings-section full"><h2><BookOpen size={21}/>The words belong to the team</h2><p>The starter ceremony uses general editable prompts. Seven Shifts remains Evan’s curriculum. No manuscript chapters are bundled, and the app does not imitate the author’s voice. Your team can write its own covenant or use material it has permission to use.</p></section>
    <section className="settings-section full danger-section"><div><h2>{demo ? 'Reset the sample' : 'Remove local team data'}</h2><p>{demo ? 'Return the fictional team to its original state.' : 'This affects this browser only. Download a backup first if you need one.'}</p></div><Button variant="outline" className="text-danger" onClick={onClear}>{demo ? <RotateCcw size={16}/> : <Trash2 size={16}/>} {demo ? 'Reset sample' : 'Remove team'}</Button></section></div>{identityOpen && <IdentityDialog team={team} onClose={() => setIdentityOpen(false)} onSave={t => { commit(t); setIdentityOpen(false); toast.success('Identity labels updated on this device.'); }}/>}</>;
}
function IdentityDialog({ team, onClose, onSave }: {
    team: Team;
    onClose: () => void;
    onSave: (t: Team) => void;
}) { const [mode, setMode] = useState(team.identity), [labels, setLabels] = useState(team.members.join(', ')), [agreed, setAgreed] = useState(false), [error, setError] = useState(''); function choose(value: string) { const m = value as Team['identity']; setMode(m); setAgreed(false); if (m === 'aliases') {
    const names = ['Cedar', 'Birch', 'Ash', 'Willow', 'Oak', 'Maple', 'Pine', 'Elm', 'Alder', 'Hazel', 'Beech', 'Aspen', 'Juniper', 'Olive', 'Rowan', 'Spruce', 'Laurel', 'Cypress', 'Acacia', 'Walnut'];
    setLabels(team.members.map((_, i) => names[i]).join(', '));
} } function save() { const arr = labels.split(',').map(s => s.trim()); if (arr.length !== team.members.length || arr.some(x => !x || x.length > 28) || new Set(arr.map(x => x.toLowerCase())).size !== arr.length)
    return setError('Keep the same number of labels, in order, with unique labels of at most 28 characters.'); if (!agreed)
    return; const map = Object.fromEntries(team.members.map((x, i) => [x, arr[i]])); onSave({ ...team, identity: mode, members: arr, windows: team.windows.map(w => ({ ...w, alias: map[w.alias] || w.alias, covers: w.covers.map(c => ({ ...c, alias: map[c.alias] || c.alias })) })) }); } return <Dialog open onOpenChange={o => { if (!o)
    onClose(); }}><DialogContent><DialogHeader><DialogTitle>Identity choices</DialogTitle><DialogDescription>Change only with the people affected. Earlier printouts and backups cannot be recalled.</DialogDescription></DialogHeader><Choice id="identity-mode" label="How the rota labels people" value={mode} onChange={choose} options={[{ value: 'aliases', label: 'Use aliases' }, { value: 'names', label: 'Use real names by agreement' }]}/><div className="field"><Label htmlFor="identity-labels">Labels in the same order</Label><p className="field-hint">Current order: {team.members.join(', ')}</p><Textarea id="identity-labels" value={labels} onChange={e => { setLabels(e.target.value); setAgreed(false); }} maxLength={580}/></div><ConfirmLine id="identity-consent" checked={agreed} onChange={setAgreed}>The team agrees to these labels. We understand that role details and handover notes may still identify someone.</ConfirmLine>{error && <p className="form-error">{error}</p>}<DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!agreed} onClick={save}>Apply labels</Button></DialogFooter></DialogContent></Dialog>; }
function UnlockScreen({ onUnlock, onDemo, onRestore }: {
    onUnlock: (p: string) => Promise<void>;
    onDemo: () => void;
    onRestore: (f: File) => void;
}) { const [pass, setPass] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''); const file = useRef<HTMLInputElement>(null); async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try {
    await onUnlock(pass);
}
catch (e) {
    setError(errorText(e));
    setBusy(false);
} } return <main className="unlock-page"><div className="unlock-brand"><RestGlyph width={28} height={28}/>Restivism</div><section className="unlock-card"><div className="lock-symbol"><LockKeyhole size={28}/></div><h1>Welcome back.</h1><p>Your shared space is locked.<br />Enter the passphrase to open it on this device.</p><form onSubmit={submit}><div className="field"><Label htmlFor="unlock-pass">Team passphrase</Label><Input id="unlock-pass" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} required autoFocus/></div>{error && <p className="form-error" role="alert">{error}</p>}<Button disabled={busy || !pass} className="primary-button" type="submit">{busy ? 'Opening…' : 'Unlock team'}<ArrowRight size={16}/></Button></form><p className="field-hint">There is no online account or passphrase reset.</p><div className="unlock-links"><button onClick={onDemo}>Explore the sample team</button><button onClick={() => file.current?.click()}>Restore a backup</button><input ref={file} hidden type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f)
    onRestore(f); }}/></div></section><p className="unlock-footer">Rest belongs in how we work together.</p></main>; }
function RestoreDialog({ exists, onClose, onRestore }: {
    exists: boolean;
    onClose: () => void;
    onRestore: (p: string) => Promise<void>;
}) { const [pass, setPass] = useState(''), [agreed, setAgreed] = useState(!exists), [busy, setBusy] = useState(false), [error, setError] = useState(''); return <Dialog open onOpenChange={o => { if (!o && !busy)
    onClose(); }}><DialogContent><DialogHeader><DialogTitle>Restore an encrypted backup</DialogTitle><DialogDescription>The original passphrase is required. This snapshot replaces the local team; it does not merge rotas.</DialogDescription></DialogHeader><div className="field"><Label htmlFor="restore-pass">Backup passphrase</Label><Input id="restore-pass" type="password" autoComplete="off" value={pass} onChange={e => setPass(e.target.value)}/></div>{exists && <ConfirmLine id="restore-confirm" checked={agreed} onChange={setAgreed}>I have kept anything I need from the current team and agree to replace it on this device.</ConfirmLine>}{error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button disabled={!agreed || !pass || busy} onClick={async () => { setBusy(true); setError(''); try {
    await onRestore(pass);
}
catch (e) {
    setError(errorText(e));
    setBusy(false);
} }}>{busy ? 'Opening backup…' : 'Restore team'}</Button></DialogFooter></DialogContent></Dialog>; }
function PrintView({ team, windows, view, week }: {
    team: Team;
    windows: RestWindow[];
    view: View;
    week: Date;
}) { return <div className="print-view"><h1>Restivism</h1><p>{team.name} · Revision {team.revision} · Printed {fmt(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}</p>{view === 'covenant' ? <><h2>Our covenant</h2><div className="print-prose">{team.covenant}</div><h3>When nobody can cover</h3><p>{team.coverageRule}</p><h3>Respecting time away</h3><p>{team.exceptionRule}</p><p>{team.adopted ? `Adopted ${team.adopted}` : 'Draft for discussion'}</p></> : <><h2>Rest rota: {fmt(week)} – {fmt(addDays(week, 6))}</h2><table><thead><tr><th>Day & time</th><th>Resting</th><th>Responsibility</th><th>Covering</th><th>State</th></tr></thead><tbody>{windows.flatMap(w => w.covers.map(c => <tr key={c.id}><td>{w.date}<br />{w.start}–{w.end}</td><td>{w.alias}</td><td>{c.role}</td><td>{c.alias || 'Unfilled'}</td><td>{c.status === 'paused' ? 'Pause agreed' : c.status}</td></tr>))}</tbody></table><p>Confirm handovers together. A gap is a reason to revise the work.</p></>}<footer>Private team copy. Keep it with trusted people. This snapshot will not update automatically. Handover notes are omitted.</footer></div>; }
