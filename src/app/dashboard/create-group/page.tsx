
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, writeBatch, collection, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Check, Copy } from "lucide-react";
import Link from "next/link";
import { User } from "@/lib/types";
import { onAuthStateChanged } from "firebase/auth";

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groupCreated, setGroupCreated] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                setCurrentUser(userDoc.data() as User);
            } else {
                router.push("/login");
            }
        } else {
            router.push("/login");
        }
    });
    return () => unsubscribe();
  }, [router]);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };
  
  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast({ title: "Copied!", description: "Invite code copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing field",
        description: "Please enter a group name.",
      });
      return;
    }
    if (!currentUser) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "You must be logged in to create a group.",
        });
        return;
    }

    setIsLoading(true);
    try {
        const batch = writeBatch(db);
        
        // 1. Create new group
        const newGroupRef = doc(collection(db, "groups"));
        const newInviteCode = generateInviteCode();
        const newGroup = {
            id: newGroupRef.id,
            name: groupName,
            creatorId: currentUser.id,
            members: [currentUser.id],
            inviteCode: newInviteCode,
            isLocked: false,
        };
        batch.set(newGroupRef, newGroup);

        // 2. Update user's groupId and assign role
        const userRef = doc(db, "users", currentUser.id);
        batch.update(userRef, { groupId: newGroup.id, role: 'User 1' });
        
        // 3. Create default seats for the group
        const defaultSeats = ["Desk 1", "Desk 2", "Desk 3"];
        defaultSeats.forEach(seatName => {
            const newSeatRef = doc(collection(db, "seats"));
            batch.set(newSeatRef, {
                id: newSeatRef.id,
                name: seatName,
                groupId: newGroup.id
            });
        });

        await batch.commit();

        toast({
            title: "Group Created!",
            description: "Your group has been created. Now invite your friends!",
        });

        setInviteCode(newInviteCode);
        setGroupCreated(true);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Group Creation Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (groupCreated) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md shadow-2xl text-center">
                <CardHeader>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <Users className="h-8 w-8 text-primary" />
                        <CardTitle className="text-3xl font-bold">{groupName}</CardTitle>
                    </div>
                    <CardDescription>
                        Your group has been created! Share this invite code with your friends.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <p>Your invite code is:</p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="text-3xl font-bold tracking-widest bg-secondary text-secondary-foreground p-3 rounded-md">
                                {inviteCode}
                            </div>
                            <Button variant="outline" size="icon" onClick={copyToClipboard}>
                                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => router.push('/dashboard')} className="w-full">
                        Continue to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
            <div className="flex items-center space-x-2 mb-4">
               <Users className="h-8 w-8 text-primary" />
               <CardTitle className="text-3xl font-bold">Create Your Group</CardTitle>
            </div>
          <CardDescription>
            Give your group a name to get started. You'll get an invite code to share with your friends after.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateGroup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                type="text"
                placeholder="e.g., Team 401 Desks"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Creating Group..." : "Create Group"}
            </Button>
            <Button variant="link" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
