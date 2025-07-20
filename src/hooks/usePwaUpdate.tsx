
"use client";

import { useEffect, useRef } from 'react';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';

export const usePwaUpdate = () => {
    const { toast } = useToast();
    const wb = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'workbox' in window) {
            // @ts-ignore
            wb.current = new window.workbox.Workbox('/sw.js');

            const promptForUpdate = () => {
                toast({
                    title: 'Update Available',
                    description: 'A new version of the app is available.',
                    action: (
                        <Button onClick={() => {
                            wb.current?.addEventListener('controlling', () => {
                                window.location.reload();
                            });
                            wb.current?.messageSW({ type: 'SKIP_WAITING' });
                        }}>
                            Reload
                        </Button>
                    ),
                    duration: Infinity, // Keep the toast open until the user acts
                });
            };

            wb.current?.addEventListener('waiting', promptForUpdate);

            // Register the service worker
            wb.current?.register();
        }
    }, [toast]);
};
