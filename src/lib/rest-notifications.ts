import { toast as showToast } from '@/hooks/useToast';
// Reuse Restivism's existing accessible toast system.
export const toast = {
    success: (message: string) => showToast({ title: message, duration: 4500 }),
    error: (message: string) => showToast({ title: message, variant: 'destructive', duration: 7000 }),
};
