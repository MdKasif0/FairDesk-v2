
"use client";

import { useEffect, useState } from 'react';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';

export const usePwaUpdate = () => {
    const { toast } = useToast();
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        const handleUpdate = (registration: ServiceWorkerRegistration) => {
            setWaitingWorker(registration.waiting);
        };
        
        const registerServiceWorker = async () => {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration && registration.waiting) {
                        setWaitingWorker(registration.waiting);
                    }
                    
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                         // This event fires when the new service worker has taken control.
                         // At this point, it's safe to reload the page.
                         window.location.reload();
                    });

                    // Listen for updates to the service worker.
                    if(registration) {
                       registration.addEventListener('updatefound', () => {
                         const newWorker = registration.installing;
                         if (newWorker) {
                           newWorker.addEventListener('statechange', () => {
                             if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                               setWaitingWorker(newWorker);
                             }
                           });
                         }
                       });
                    }

                } catch (error) {
                    console.error('Service Worker registration failed: ', error);
                }
            }
        };

        registerServiceWorker();
    }, []);

    useEffect(() => {
        if (waitingWorker) {
            toast({
                title: 'Update Available',
                description: 'A new version of the app is available.',
                action: (
                    <Button onClick={() => {
                        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                    }}>
                        Reload
                    </Button>
                ),
                duration: Infinity, // Keep the toast open until the user acts
            });
        }
    }, [waitingWorker, toast]);
};
