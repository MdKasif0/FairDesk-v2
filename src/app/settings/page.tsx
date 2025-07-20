
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { idb } from "@/lib/db";
import type { User } from "@/lib/types";
import BottomNav from "@/components/shared/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Users, LogOut, Moon, Sun } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [theme, setTheme] = useState('light');

    const allUsers = useLiveQuery(() => idb.users.toArray(), []);

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
        
        const storedTheme = localStorage.getItem('theme') || 'light';
        setTheme(storedTheme);
        document.documentElement.classList.toggle('dark', storedTheme === 'dark');

    }, [searchParams, router]);

    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }

    const handleUserSwitch = (newUserId: string) => {
        if (newUserId) {
            router.push(`/settings?user=${newUserId}`);
        }
    }

    const handleLogout = () => {
        router.push('/');
    }

    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("");

    if (!currentUser || !allUsers) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p>Loading...</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 font-sans">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-sm">
                 <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">Settings</h1>
                <Avatar>
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                </Avatar>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                <Card>
                    <CardHeader>
                        <CardTitle>Current User</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                            <AvatarFallback className="text-2xl">{getInitials(currentUser.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-xl font-semibold">{currentUser.name}</p>
                            <p className="text-sm text-muted-foreground">{currentUser.id}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Appearance</CardTitle>
                        </div>
                        <CardDescription>Customize the look and feel of the app.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center space-x-4">
                        <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => handleThemeChange('light')} className="w-full">
                            <Sun className="mr-2 h-4 w-4" /> Light
                        </Button>
                        <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => handleThemeChange('dark')} className="w-full">
                           <Moon className="mr-2 h-4 w-4" /> Dark
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                         <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Account</CardTitle>
                        </div>
                        <CardDescription>Manage your account settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Select onValueChange={handleUserSwitch} value={currentUser.id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Switch user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                       <div className="flex items-center gap-2">
                                         <Avatar className="h-6 w-6">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                         </Avatar>
                                         <span>{user.name}</span>
                                       </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="w-full" onClick={handleLogout}>
                           <LogOut className="mr-2 h-4 w-4" /> Log Out
                        </Button>
                    </CardContent>
                </Card>
            </main>
            <BottomNav current="settings" userId={currentUser.id} />
        </div>
    );
}
