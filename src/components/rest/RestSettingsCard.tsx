import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useRest } from '@/hooks/useRest';
import { playChime, primeAudio } from '@/lib/chime';
import { formatMinutes } from '@/lib/rest';

const REMINDER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60, label: 'Every hour' },
  { value: 90, label: 'Every 90 minutes' },
  { value: 120, label: 'Every 2 hours' },
  { value: 180, label: 'Every 3 hours' },
];

export function RestSettingsCard() {
  const { state, updateSettings, resetAll } = useRest();
  const { dailyGoal, reminderMinutes, chime } = state.settings;
  const [permission, setPermission] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const handleReminderChange = async (value: string) => {
    const minutes = Number(value);
    updateSettings({ reminderMinutes: minutes });
    if (minutes > 0 && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      setPermission(await Notification.requestPermission());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Your rest rules</CardTitle>
        <CardDescription className="text-base">Everything is stored privately on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="daily-goal" className="text-base">Daily rest goal</Label>
            <span className="font-display text-2xl font-semibold tabular-nums">{formatMinutes(dailyGoal)}</span>
          </div>
          <Slider
            id="daily-goal"
            min={10}
            max={120}
            step={5}
            value={[dailyGoal]}
            onValueChange={([v]) => updateSettings({ dailyGoal: v })}
            aria-label="Daily rest goal in minutes"
          />
          <p className="text-sm text-muted-foreground">Start small. You can always raise it.</p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="reminders" className="text-base">Nudge me to rest</Label>
          <Select value={String(reminderMinutes)} onValueChange={handleReminderChange}>
            <SelectTrigger id="reminders" className="h-11 w-full text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {permission === 'denied'
              ? 'Notifications are blocked, so reminders will only appear while Restful is open.'
              : 'Reminders arrive between 8am and 11pm while Restful is open in a tab, counting from your last rest.'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="chime" className="text-base">Chime at start and end</Label>
            <button
              type="button"
              onClick={() => {
                primeAudio();
                playChime();
              }}
              className="block text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Preview the chime
            </button>
          </div>
          <Switch id="chime" checked={chime} onCheckedChange={(v) => updateSettings({ chime: v })} />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              Reset my journey
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start over?</AlertDialogTitle>
              <AlertDialogDescription>
                This erases your rest history, embers, streaks, and badges from this device. It cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my journey</AlertDialogCancel>
              <AlertDialogAction onClick={resetAll} className="bg-destructive text-white hover:bg-destructive/90">
                Erase everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
