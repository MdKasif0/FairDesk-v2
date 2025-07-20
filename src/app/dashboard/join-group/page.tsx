
"use client";

import { useState } from "react";
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
import { doc, getDocs, query, where, writeBatch, collection, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { User } from "@/lib/types";
import { onAuthStateChanged } from "firebase/auth";

export default function JoinGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useState(() => {
    onAuthStateChanged(auth, async (user) => {
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
  });

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      toast({
        variant: "destructive",
        title: "Missing field",
        description: "Please enter an invite code.",
      });
      return;
    }
     if (!currentUser) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "You must be logged in to join a group.",
        });
        return;
    }

    setIsLoading(true);
    try {
        const q = query(collection(db, "groups"), where("inviteCode", "==", code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid invite code. Please check and try again.");
        }

        const groupDoc = querySnapshot.docs[0];
        const groupData = groupDoc.data();

        if (groupData.isLocked || groupData.members.length >= 3) {
            throw new Error("This group is already full.");
        }
        
        if (groupData.members.includes(currentUser.id)) {
            throw new Error("You are already in this group.");
        }

        const batch = writeBatch(db);

        // 1. Update group members
        const newMembers = [...groupData.members, currentUser.id];
        const groupRef = groupDoc.ref;
        const updatePayload: any = { members: newMembers };

        if (newMembers.length === 3) {
            updatePayload.isLocked = true;
        }
        batch.update(groupRef, updatePayload);
        
        // 2. Update user's groupId
        const userRef = doc(db, "users", currentUser.id);
        batch.update(userRef, { groupId: groupDoc.id });

        await batch.commit();

        toast({
            title: "Welcome to the group!",
            description: `You have successfully joined ${groupData.name}.`,
        });

        router.push("/dashboard");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Join Group",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-4">
            <LogIn className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Join a Group</CardTitle>
          </div>
          <CardDescription>
            Enter the invite code you received from your friend to join their group.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoinGroup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                type="text"
                placeholder="ABCXYZ"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                disabled={isLoading}
                className="uppercase tracking-widest text-center"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Joining..." : "Join Group"}
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
