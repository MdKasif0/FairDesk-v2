
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, History, BarChart, Settings } from "lucide-react";

interface BottomNavProps {
    current: 'home' | 'history' | 'stats' | 'settings';
    userId: string;
}

const navItems = [
    { id: 'home', icon: Home, label: 'Home', href: '/dashboard' },
    { id: 'history', icon: History, label: 'History', href: '/history' },
    { id: 'stats', icon: BarChart, label: 'Stats', href: '/stats' },
    { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
];

export default function BottomNav({ current, userId }: BottomNavProps) {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = current === item.id;
                    return (
                        <Link key={item.id} href={`${item.href}?user=${userId}`} passHref>
                            <Button variant="ghost" className={`flex flex-col items-center justify-center h-full w-16 rounded-none ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                <Icon className="h-6 w-6" />
                                <span className="text-xs mt-1">{item.label}</span>
                            </Button>
                        </Link>
                    )
                })}
            </div>
        </footer>
    )
}
