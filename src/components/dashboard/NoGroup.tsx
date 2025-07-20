
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User } from "@/lib/types";
import { LogOut, PlusCircle, LogIn } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface NoGroupProps {
  user: User | null;
}

export default function NoGroup({ user }: NoGroupProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/login");
    }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
       <div className="absolute top-4 right-4 flex items-center gap-4">
          {user && (
             <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <span>{user.name}</span>
             </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
       </div>
      <Card className="w-full max-w-lg text-center shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome, {user?.name}!</CardTitle>
          <CardDescription className="text-lg">
            To get started, you can either create a new group for your team or join an existing one.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => router.push('/dashboard/create-group')}>
                <PlusCircle className="mr-2 h-5 w-5" />
                Create a Group
            </Button>
            <span className="font-bold text-muted-foreground">OR</span>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={() => router.push('/dashboard/join-group')}>
                <LogIn className="mr-2 h-5 w-5" />
                Join a Group
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
