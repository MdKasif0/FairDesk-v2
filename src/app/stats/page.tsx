
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { idb } from "@/lib/db";
import type { User } from "@/lib/types";
import BottomNav from "@/components/shared/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = 'force-dynamic';

export default function StatsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const userId = searchParams.get('user');
        if (!userId) {
            router.replace('/');
            return;
        }
        idb.users.get(userId).then(user => {
            if (user) {
                setCurrentUser(user);
            } else {
                router.replace('/');
            }
        });
    }, [searchParams, router]);
    
    const getInitials = (name: string) => name ? name.split(" ").map((n) => n[0]).join("") : "";

    if (!currentUser) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 font-sans">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-sm">
                 <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">Stats</h1>
                <Avatar>
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                </Avatar>
            </header>
            <main className="flex-1 flex items-center justify-center text-center p-4">
                <p className="text-gray-500 dark:text-gray-400">Stats page is under construction.</p>
            </main>
            <BottomNav current="stats" userId={currentUser.id} />
        </div>
    );
}
