
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const HARDCODED_USERS: User[] = [
  { id: 'user-aariz', name: 'Aariz', avatar: '/aariz.png' },
  { id: 'user-nabil', name: 'Nabil', avatar: '/nabil.png' },
  { id: 'user-yatharth', name: 'Yatharth', avatar: '/yatharth.png' },
];

export default function Home() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleContinue = () => {
    if (selectedUserId) {
      router.push(`/dashboard?user=${selectedUserId}`);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
       <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex items-center space-x-2 justify-center mb-2">
                <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-primary"
                >
                <path d="M12 22V2" />
                <path d="M5 12H19" />
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
                </svg>
                <h1 className="text-3xl font-bold text-primary">FairDesk</h1>
            </div>
          <CardTitle className="text-2xl">Who are you?</CardTitle>
          <CardDescription>Select your name to view the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                    {HARDCODED_USERS.map(user => (
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

            <Button className="w-full" onClick={handleContinue} disabled={!selectedUserId}>
              Continue
            </Button>
        </CardContent>
       </Card>
    </div>
  );
}
