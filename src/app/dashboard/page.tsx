
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import type { User, Seat, Assignment } from "@/lib/types";
import { useLiveQuery } from "dexie-react-hooks";
import { initializeData, getTodaysAssignments } from "@/lib/data-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Menu, User as UserIcon, Bell, Shuffle, Upload, MessageSquare, BarChart, Settings, Home, Calendar as CalendarIcon, History, MoveRight } from "lucide-react";
import { idb } from "@/lib/db";

// Colors for user cards
const userCardColors = [
    'bg-green-100',
    'bg-orange-100',
    'bg-purple-100'
];

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [todaysAssignments, setTodaysAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const allUsers = useLiveQuery(() => idb.users.toArray(), []);
  const allSeats = useLiveQuery(() => idb.seats.toArray(), []);

  useEffect(() => {
    const initAndFetch = async () => {
      setLoading(true);
      await initializeData();
      const assignments = await getTodaysAssignments();
      setTodaysAssignments(assignments);
      
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

  if (loading || !currentUser || !allUsers || !allSeats) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <p>Loading user and data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="flex items-center justify-between p-4 bg-white shadow-sm">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-gray-800">FairDesk</h1>
        <div className="relative">
          <Button variant="ghost" size="icon">
            <UserIcon className="h-6 w-6" />
          </Button>
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        <div>
          <p className="text-lg text-gray-600">{format(new Date(), 'eeee, MMMM d, yyyy')}</p>
          <h2 className="text-2xl font-bold text-gray-800">Today's Seating</h2>
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-2 -mx-4 px-4">
          {todaysAssignments.map((assignment, index) => {
            const user = getUserForAssignment(assignment);
            const seat = getSeatForAssignment(assignment);
            if (!user || !seat) return null;

            return (
              <Card key={user.id} className={`w-36 flex-shrink-0 text-center shadow-md border-0 ${userCardColors[index]}`}>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <Avatar className="w-16 h-16 mb-2 border-2 border-white shadow-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-500">- {seat.name}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Calendar Preview</h3>
            <Card className="shadow-md">
                <CardContent className="p-2">
                    <Calendar 
                        mode="single"
                        selected={new Date()}
                        className="w-full"
                    />
                </CardContent>
            </Card>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 mt-2">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400"></span><span>Notes</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400"></span><span>Present</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-600"></span><span>Overrides</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400"></span><span>Locked days</span></div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 bg-white justify-start text-base"><MoveRight className="mr-2 h-5 w-5 text-green-500" />Request Override</Button>
            <Button variant="outline" className="h-14 bg-white justify-start text-base"><Shuffle className="mr-2 h-5 w-5 text-blue-500" />Randomize Seats</Button>
            <Button variant="outline" className="h-14 bg-white justify-start text-base"><Upload className="mr-2 h-5 w-5 text-purple-500" />Upload Photo</Button>
            <Button variant="outline" className="h-14 bg-white justify-start text-base"><MessageSquare className="mr-2 h-5 w-5 text-orange-500" />Add Comment</Button>
            <Button variant="outline" className="h-14 bg-white justify-start text-base"><Bell className="mr-2 h-5 w-5 text-teal-500" />Remind Me</Button>
            <Button variant="outline" className="h-14 bg-white justify-start text-base">View Fairness Stats &gt;</Button>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
            <Button variant="ghost" className="flex flex-col h-full text-primary">
                <Home />
                <span className="text-xs">Home</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-full text-gray-500">
                <CalendarIcon />
                <span className="text-xs">Calendar</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-full text-gray-500">
                <History />
                <span className="text-xs">History</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-full text-gray-500">
                <BarChart />
                <span className="text-xs">Stats</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-full text-gray-500">
                <Settings />
                <span className="text-xs">Settings</span>
            </Button>
        </div>
      </footer>
    </div>
  );
}
