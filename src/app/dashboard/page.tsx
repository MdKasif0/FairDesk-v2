
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import type { User, Seat, Assignment } from "@/lib/types";
import { useLiveQuery } from "dexie-react-hooks";
import { initializeData, getTodaysAssignments, randomizeTodaysAssignments, toggleSeatLock } from "@/lib/data-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Menu, User as UserIcon, Bell, Shuffle, Upload, MessageSquare, History, MoveRight, Lock, LockOpen } from "lucide-react";
import { idb } from "@/lib/db";
import BottomNav from "@/components/shared/BottomNav";
import { toast } from "@/hooks/use-toast";

const userCardColors = [
    'bg-green-100 dark:bg-green-900/50',
    'bg-orange-100 dark:bg-orange-900/50',
    'bg-purple-100 dark:bg-purple-900/50'
];

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRandomizing, setIsRandomizing] = useState(false);

  const todaysAssignments = useLiveQuery(async () => {
      return getTodaysAssignments();
  }, [], []);

  const allUsers = useLiveQuery(() => idb.users.toArray(), []);
  const allSeats = useLiveQuery(() => idb.seats.toArray(), []);

  useEffect(() => {
    const initAndFetch = async () => {
      setLoading(true);
      await initializeData();
      
      const userId = searchParams.get('user');
      if (!userId) {
          router.replace('/');
          return;
      }
      
      const user = await idb.users.get(userId);
      if(!user) {
          router.replace('/');
          return;
      }

      setCurrentUser(user);
      setLoading(false);
    };

    initAndFetch();
  }, [searchParams, router]);
  
  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("");
  };

  const getUserForAssignment = (assignment: Assignment): User | undefined => {
    return allUsers?.find(u => u.id === assignment.userId);
  }

  const getSeatForAssignment = (assignment: Assignment): Seat | undefined => {
      return allSeats?.find(s => s.id === assignment.seatId);
  }

  const handleRandomize = async () => {
    setIsRandomizing(true);
    try {
        await randomizeTodaysAssignments();
        toast({ title: "Seats Randomized!", description: "The seats have been successfully shuffled."});
    } catch (error) {
        console.error("Failed to randomize seats:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not randomize seats."});
    } finally {
        setIsRandomizing(false);
    }
  }

  const handleLockToggle = async (assignmentId: string, isLocked: boolean) => {
      try {
          await toggleSeatLock(assignmentId);
          toast({ title: isLocked ? "Seat Unlocked" : "Seat Locked", description: `The seat has been ${isLocked ? 'unlocked' : 'locked'} for today.` });
      } catch (error) {
           console.error("Failed to toggle lock:", error);
           toast({ variant: "destructive", title: "Error", description: "Could not update seat lock status."});
      }
  }

  if (loading || !currentUser || !allUsers || !allSeats) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Loading user and data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-background font-sans">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-sm">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">FairDesk</h1>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/settings?user=${currentUser.id}`)}>
            <UserIcon className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        <div>
          <p className="text-lg text-gray-600 dark:text-gray-400">{format(new Date(), 'eeee, MMMM d, yyyy')}</p>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Today's Seating</h2>
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-2 -mx-4 px-4">
          {todaysAssignments?.map((assignment, index) => {
            const user = getUserForAssignment(assignment);
            const seat = getSeatForAssignment(assignment);
            if (!user || !seat) return null;

            return (
              <Card key={user.id} className={`relative w-36 flex-shrink-0 text-center shadow-md border-0 ${userCardColors[index % userCardColors.length]}`}>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <Avatar className="w-16 h-16 mb-2 border-2 border-white shadow-lg">
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint={user['data-ai-hint']}/>
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{user.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">- {seat.name}</p>
                </CardContent>
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => handleLockToggle(assignment.id, !!assignment.isLocked)}>
                    {assignment.isLocked ? <Lock className="h-4 w-4 text-yellow-600" /> : <LockOpen className="h-4 w-4 text-gray-500" />}
                </Button>
              </Card>
            )
          })}
        </div>

        <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Calendar Preview</h3>
            <Card className="shadow-md bg-white dark:bg-gray-900">
                <CardContent className="p-2">
                    <Calendar 
                        mode="single"
                        selected={new Date()}
                        className="w-full"
                    />
                </CardContent>
            </Card>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400"></span><span>Notes</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400"></span><span>Present</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-600"></span><span>Overrides</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400"></span><span>Locked days</span></div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 bg-white dark:bg-gray-900 justify-start text-base"><MoveRight className="mr-2 h-5 w-5 text-green-500" />Request Override</Button>
            <Button variant="outline" className="h-14 bg-white dark:bg-gray-900 justify-start text-base" onClick={handleRandomize} disabled={isRandomizing}>
                <Shuffle className="mr-2 h-5 w-5 text-blue-500" />
                {isRandomizing ? 'Shuffling...' : 'Randomize Seats'}
            </Button>
            <Button variant="outline" className="h-14 bg-white dark:bg-gray-900 justify-start text-base"><Upload className="mr-2 h-5 w-5 text-purple-500" />Upload Photo</Button>
            <Button variant="outline" className="h-14 bg-white dark:bg-gray-900 justify-start text-base"><MessageSquare className="mr-2 h-5 w-5 text-orange-500" />Add Comment</Button>
            <Button variant="outline" className="h-14 bg-white dark:bg-gray-900 justify-start text-base"><Bell className="mr-2 h-5 w-5 text-teal-500" />Remind Me</Button>
            <Button variant="outline" className="h-14 bg-white dark:bg-gray-900 justify-start text-base" onClick={() => router.push(`/stats?user=${currentUser.id}`)}>View Fairness Stats &gt;</Button>
        </div>
      </main>

      <BottomNav current="home" userId={currentUser.id} />
    </div>
  );
}
