
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User, Group } from "@/lib/types";
import { Copy, Check, LogOut, Users } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface InviteFriendsProps {
  user: User | null;
  group: Group | null;
}

export default function InviteFriends({ user, group }: InviteFriendsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<User[]>([]);

  useState(() => {
    if (!group) return;
    const q = query(collection(db, 'users'), where('groupId', '==', group.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setMembers(snapshot.docs.map(doc => doc.data() as User));
    });
    return () => unsubscribe();
  }, [group]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const copyToClipboard = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      toast({ title: "Copied!", description: "Invite code copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!group || !user) return null;

  const membersNeeded = 3 - group.members.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="text-left">
                <p className="font-medium">{user.name}</p>
                {user.role && <p className="text-xs text-muted-foreground">{user.role}</p>}
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <Card className="w-full max-w-lg text-center shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-center gap-2">
            <Users className="h-7 w-7" />
            <CardTitle className="text-3xl font-bold">{group.name}</CardTitle>
          </div>
          <CardDescription className="text-lg pt-2">
            Your group is almost ready!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <p>Share this invite code with your friends:</p>
                <div className="flex items-center justify-center gap-2">
                    <div className="text-3xl font-bold tracking-widest bg-secondary text-secondary-foreground p-3 rounded-md">
                        {group.inviteCode}
                    </div>
                    <Button variant="outline" size="icon" onClick={copyToClipboard}>
                        {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    </Button>
                </div>
            </div>
            
            <div className="space-y-3">
                <h3 className="font-semibold">Members Joined:</h3>
                <div className="flex justify-center gap-4">
                    {members.map(member => (
                        <div key={member.id} className="flex flex-col items-center gap-1">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{member.name}</span>
                            {member.role && <span className="text-xs text-muted-foreground">{member.role}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
         <CardFooter>
            <p className="text-sm text-muted-foreground mx-auto">
                Waiting for {membersNeeded} more friend{membersNeeded > 1 ? 's' : ''} to join...
            </p>
         </CardFooter>
      </Card>
    </div>
  );
}
