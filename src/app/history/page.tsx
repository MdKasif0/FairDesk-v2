
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { idb } from "@/lib/db";
import type { User, Seat, Assignment } from "@/lib/types";
import BottomNav from "@/components/shared/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";

export const dynamic = 'force-dynamic';

function HistoryPageContents() {
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

    const allAssignments = useLiveQuery(() => idb.assignments.toArray(), []);
    const allUsers = useLiveQuery(() => idb.users.toArray(), []);
    const allSeats = useLiveQuery(() => idb.seats.toArray(), []);

    const groupedAssignments = useMemo(() => {
        if (!allAssignments) return {};

        const groups = allAssignments.reduce((acc, assignment) => {
            const date = assignment.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(assignment);
            return acc;
        }, {} as Record<string, Assignment[]>);

        // Sort dates in descending order
        return Object.entries(groups).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));

    }, [allAssignments]);

    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("");

    if (!currentUser || !allUsers || !allSeats || !allAssignments) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p>Loading history...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 font-sans">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-sm">
                 <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">History</h1>
                <Avatar>
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                </Avatar>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {groupedAssignments.length === 0 ? (
                    <div className="text-center text-gray-500">
                        <p>No seating history found.</p>
                        <p>Assignments will appear here as they are generated.</p>
                    </div>
                ) : (
                    groupedAssignments.map(([date, assignments]) => {
                        const formattedDate = format(parseISO(date), 'eeee, MMMM d, yyyy');
                        return (
                            <Card key={date}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{formattedDate}</CardTitle>

                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {assignments.map(assignment => {
                                            const user = allUsers.find(u => u.id === assignment.userId);
                                            const seat = allSeats.find(s => s.id === assignment.seatId);
                                            if (!user || !seat) return null;

                                            return (
                                                <li key={assignment.id} className="flex items-center justify-between p-2 rounded-md bg-gray-100 dark:bg-gray-800">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user.avatar} alt={user.name} />
                                                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{user.name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground">{seat.name}</span>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </main>
            <BottomNav current="history" userId={currentUser.id} />
        </div>
    );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HistoryPageContents />
        </Suspense>
    )
}
