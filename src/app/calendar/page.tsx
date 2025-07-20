
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import type { User, Seat, Assignment } from "@/lib/types";
import { useLiveQuery } from "dexie-react-hooks";
import { getAssignmentsForMonth, initializeData } from "@/lib/data-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { idb } from "@/lib/db";
import BottomNav from "@/components/shared/BottomNav";

const userColors = {
    'user-aariz': 'bg-green-100 text-green-800',
    'user-nabil': 'bg-orange-100 text-orange-800',
    'user-yatharth': 'bg-purple-100 text-purple-800',
};

const dayOfWeekClasses = "font-bold text-center text-muted-foreground";

export default function CalendarPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const allUsers = useLiveQuery(() => idb.users.toArray(), []);
    const allSeats = useLiveQuery(() => idb.seats.toArray(), []);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    useEffect(() => {
        const initAndFetch = async () => {
            setLoading(true);
            await initializeData();
            
            const userId = searchParams.get('user');
            if (!userId) {
                const firstUser = await idb.users.toCollection().first();
                if (firstUser) {
                    router.replace(`/calendar?user=${firstUser.id}`);
                } else {
                    router.replace('/');
                }
                return;
            }
            
            const user = await idb.users.get(userId);
            if(!user) {
                router.replace('/');
                return;
            }
            setCurrentUser(user);

            const monthAssignments = await getAssignmentsForMonth(monthStart);
            setAssignments(monthAssignments);
            
            setLoading(false);
        };
        initAndFetch();
    }, [searchParams, router, monthStart]);
    
    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("");

    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };
    
    const getAssignmentsForDay = (day: Date) => {
        return assignments.filter(a => a.date === format(day, 'yyyy-MM-dd'));
    }

    if (loading || !currentUser || !allUsers || !allSeats) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <p>Loading calendar...</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans">
            <header className="flex items-center justify-between p-4 bg-white shadow-sm">
                 <h1 className="text-xl font-bold text-gray-800">Calendar</h1>
                <Avatar>
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                </Avatar>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft />
                    </Button>
                    <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                        <ChevronRight />
                    </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-sm">
                    <div className={dayOfWeekClasses}>Sun</div>
                    <div className={dayOfWeekClasses}>Mon</div>
                    <div className={dayOfWeekClasses}>Tue</div>
                    <div className={dayOfWeekClasses}>Wed</div>
                    <div className={dayOfWeekClasses}>Thu</div>
                    <div className={dayOfWeekClasses}>Fri</div>
                    <div className={dayOfWeekClasses}>Sat</div>

                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {daysInMonth.map(day => {
                        const dayAssignments = getAssignmentsForDay(day);
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                            <div key={day.toString()} className={`p-1.5 border rounded-lg h-28 flex flex-col ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                                <div className={`font-bold ${isToday ? 'text-blue-600' : ''}`}>{format(day, 'd')}</div>
                                <div className="space-y-1 mt-1 text-xs">
                                {dayAssignments.map(assignment => {
                                    const user = allUsers.find(u => u.id === assignment.userId);
                                    const seat = allSeats.find(s => s.id === assignment.seatId);
                                    if(!user || !seat) return null;

                                    return (
                                        <div key={assignment.id} className={`p-1 rounded-md ${userColors[user.id as keyof typeof userColors]}`}>
                                            <span className="font-semibold">{user.name[0]}:</span> {seat.name.split(' ')[1]}
                                        </div>
                                    )
                                })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>
            
            <BottomNav current="calendar" userId={currentUser.id} />
        </div>
    );
}
