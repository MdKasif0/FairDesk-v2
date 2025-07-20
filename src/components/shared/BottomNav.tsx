
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Calendar as CalendarIcon, History, BarChart, Settings } from "lucide-react";

interface BottomNavProps {
    current: 'home' | 'calendar' | 'history' | 'stats' | 'settings';
    userId: string;
}

const navItems = [
    { id: 'home', icon: Home, label: 'Home', href: '/dashboard' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calendar', href: '/calendar' },
    { id: 'history', icon: History, label: 'History', href: '/history' },
    { id: 'stats', icon: BarChart, label: 'Stats', href: '/stats' },
    { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
];

export default function BottomNav({ current, userId }: BottomNavProps) {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                {navItems.map(item => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.id} href={`${item.href}?user=${userId}`} passHref>
                            <Button variant="ghost" className={`flex flex-col h-full ${current === item.id ? 'text-primary' : 'text-gray-500'}`}>
                                <Icon />
                                <span className="text-xs">{item.label}</span>
                            </Button>
                        </Link>
                    )
                })}
            </div>
        </footer>
    )
}
