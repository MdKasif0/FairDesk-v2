
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, isWeekend, startOfToday, isBefore } from "date-fns";
import type { Assignment, ChangeRequest, Seat, User, Group } from "@/lib/types";
import Header from "@/components/dashboard/Header";
import CalendarView from "@/components/dashboard/CalendarView";
import PendingApprovals from "@/components/dashboard/PendingApprovals";
import SmartSchedule from "@/components/dashboard/SmartSchedule";
import SeatChangeDialog from "@/components/dashboard/SeatChangeDialog";
import { useToast } from "@/hooks/use-toast";
import { alertSeatChangeStatus } from "@/ai/flows/alert-seat-change-status";
import { idb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from 'uuid';

const HARDCODED_USERS: User[] = [
  { id: 'user-aariz', name: 'Aariz', avatar: 'https://i.pravatar.cc/150?u=aariz' },
  { id: 'user-nabil', name: 'Nabil', avatar: 'https://i.pravatar.cc/150?u=nabil' },
  { id: 'user-yatharth', name: 'Yatharth', avatar: 'https://i.pravatar.cc/150?u=yatharth' },
];
const HARDCODED_SEATS: Pick<Seat, 'name'>[] = [
    { name: "Desk 1" },
    { name: "Desk 2" },
    { name: "Desk 3" },
];


export default function DashboardPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSeatChangeDialogOpen, setSeatChangeDialogOpen] = useState(false);
  const [seatChangeDialogData, setSeatChangeDialogData] = useState<{date: Date, assignment: Assignment} | null>(null);
  
  const [isSmartScheduleDialogOpen, setSmartScheduleDialogOpen] = useState(false);

  // Dexie live queries
  const users = useLiveQuery(() => idb.users.toArray(), []);
  const seats = useLiveQuery(() => idb.seats.toArray(), []);
  const assignments = useLiveQuery(() => idb.assignments.toArray(), []);
  const changeRequests = useLiveQuery(() => idb.changeRequests.where('status').equals('pending').toArray(), []);
  const group = useLiveQuery(() => idb.groups.toCollection().first(), []);

  useEffect(() => {
    const userId = searchParams.get('user');
    if (!userId || !HARDCODED_USERS.some(u => u.id === userId)) {
        router.replace('/');
        return;
    }
    const user = HARDCODED_USERS.find(u => u.id === userId);
    if(user) setCurrentUser(user);
  }, [searchParams, router]);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      const userCount = await idb.users.count();

      if (userCount === 0) {
        console.log("No existing data found, initializing new data...");
        try {
          await idb.transaction('rw', idb.users, idb.seats, idb.groups, idb.assignments, async () => {
             // 1. Create users
             await idb.users.bulkAdd(HARDCODED_USERS);

             // 2. Create seats
             const seatIds = [];
             for (const seat of HARDCODED_SEATS) {
                const id = await idb.seats.add({ ...seat, id: uuidv4(), groupId: 'default-group' });
                seatIds.push(id);
             }

             // 3. Create group
             const newGroup = {
                id: 'default-group',
                name: "FairDesk Team",
                members: HARDCODED_USERS.map(u => u.id),
                isLocked: true,
             };
             await idb.groups.add(newGroup);

             // 4. Create initial assignment for today
             let today = startOfToday();
             if(isWeekend(today)) {
                 today = addDays(today, 1);
                 if(isWeekend(today)) today = addDays(today, 1);
             }
             const todayStr = format(today, 'yyyy-MM-dd');

             const initialAssignments = HARDCODED_USERS.map((user, index) => ({
                 id: uuidv4(),
                 date: todayStr,
                 userId: user.id,
                 seatId: seatIds[index],
                 groupId: 'default-group',
             }));
             await idb.assignments.bulkAdd(initialAssignments);
          });
          toast({ title: "Welcome!", description: "Initial data has been set up." });
        } catch (error) {
            console.error("Failed to initialize data:", error);
            toast({ variant: 'destructive', title: 'Initialization Failed', description: 'Could not set up initial user and group data.' });
        }
      }
      setLoading(false);
    };

    initializeData();
  }, []);

  const handleSeatChangeRequest = (date: Date, assignment: Assignment) => {
    if (isBefore(date, startOfToday())) return;
    setSeatChangeDialogData({ date, assignment });
    setSeatChangeDialogOpen(true);
  };
  
  const handleSeatChangeSubmit = async (requestedSeatId: string) => {
    if (seatChangeDialogData && currentUser && group && assignments) {
       const userToSwapWith = assignments.find(a => a.date === format(seatChangeDialogData.date, "yyyy-MM-dd") && a.seatId === requestedSeatId)?.userId;

      if (!userToSwapWith) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find the user to swap with. The seat might be unassigned.",
        });
        return;
      }
      
      const newRequestData: ChangeRequest = {
        id: uuidv4(),
        date: format(seatChangeDialogData.date, "yyyy-MM-dd"),
        proposingUserId: currentUser.id,
        userToSwapWithId: userToSwapWith,
        originalSeatId: seatChangeDialogData.assignment.seatId,
        requestedSeatId: requestedSeatId,
        status: "pending",
        approvals: [],
        rejections: [],
        groupId: group.id,
      };
      
      try {
        await idb.changeRequests.add(newRequestData);
        toast({
          title: "Request Submitted",
          description: "Your seat change request has been submitted for approval.",
        });
        setSeatChangeDialogOpen(false);
      } catch (error) {
        console.error("Error submitting request:", error);
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: "Could not submit your request.",
        });
      }
    }
  };

  const handleApproval = async (requestId: string, vote: 'approve' | 'reject') => {
    if (!currentUser || !changeRequests || !assignments) return;
    
    const request = changeRequests.find(r => r.id === requestId);
    if (!request) return;

    if(request.approvals.includes(currentUser.id) || request.rejections.includes(currentUser.id)) {
        toast({
            variant: "default",
            title: "Already Voted",
            description: "You have already voted on this request.",
        });
        return;
    }

    const newApprovals = vote === 'approve' ? [...request.approvals, currentUser.id] : request.approvals;
    const newRejections = vote === 'reject' ? [...request.rejections, currentUser.id] : request.rejections;
    
    const approvalsNeeded = 1;
    const isApproved = newApprovals.length >= approvalsNeeded;
    const isRejected = newRejections.length >= 1;

    const newStatus = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

    try {
        await idb.transaction('rw', idb.changeRequests, idb.assignments, async () => {
             const updatePayload: Partial<ChangeRequest> = {
                approvals: newApprovals,
                rejections: newRejections,
            };
            
            if (newStatus !== 'pending') {
                updatePayload.status = newStatus;
            }
            
            await idb.changeRequests.update(requestId, updatePayload);
            
            if (newStatus === 'approved') {
                const assignment1 = assignments.find(a => a.date === request.date && a.userId === request.proposingUserId);
                const assignment2 = assignments.find(a => a.date === request.date && a.userId === request.userToSwapWithId);

                if (assignment1 && assignment2) {
                    await idb.assignments.update(assignment1.id, { seatId: request.requestedSeatId });
                    await idb.assignments.update(assignment2.id, { seatId: request.originalSeatId });
                } else {
                     throw new Error("Could not find assignments to swap.");
                }
            }
        });
        
        if (newStatus !== 'pending') {
             const aiAlert = await alertSeatChangeStatus({
              isApproved,
              approvalsNeeded,
              approvalsReceived: newApprovals.length,
              proposedSeat: seats?.find(s => s.id === request.requestedSeatId)?.name || 'Unknown',
              currentSeat: seats?.find(s => s.id === request.originalSeatId)?.name || 'Unknown',
            });
            
            toast({
              title: `Request ${newStatus}`,
              description: aiAlert.alertMessage,
            });
        } else {
            toast({
                title: "Vote Cast",
                description: "Your vote has been recorded.",
            });
        }

    } catch(error) {
        console.error("Error handling approval: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "There was an issue processing the approval."
        })
    }
  };

  const handleScheduleGenerated = async (newSchedule: Record<string, string>) => {
    if(!group || !users || !seats) return;

    let nextDay = addDays(new Date(), 1);
    while (isWeekend(nextDay)) {
        nextDay = addDays(nextDay, 1);
    }
    const nextWorkingDay = format(nextDay, 'yyyy-MM-dd');

    try {
       await idb.transaction('rw', idb.assignments, async () => {
         const existingAssignments = await idb.assignments.where('date').equals(nextWorkingDay).toArray();
         if(existingAssignments.length > 0) {
            await idb.assignments.bulkDelete(existingAssignments.map(a => a.id));
         }

         const newAssignments: Assignment[] = [];
         Object.entries(newSchedule).forEach(([userName, seatName]) => {
           const user = users.find(u => u.name === userName);
           const seat = seats.find(s => s.name === seatName);
           if (!user || !seat) throw new Error(`Invalid user ${userName} or seat ${seatName}`);
           
           newAssignments.push({
             id: uuidv4(),
             date: nextWorkingDay,
             userId: user.id,
             seatId: seat.id,
             groupId: group.id,
           });
         });
         await idb.assignments.bulkAdd(newAssignments);
       });
      
      toast({
        title: "Success",
        description: `New smart schedule has been applied for ${nextWorkingDay}.`,
      });

    } catch (error) {
      console.error("Error applying schedule: ", error);
      toast({
        variant: 'destructive',
        title: 'Schedule Failed',
        description: 'Could not apply the new schedule.'
      });
    }
  };

  const handleUserSwitch = (userId: string) => {
    const user = HARDCODED_USERS.find(u => u.id === userId);
    if(user) {
      setCurrentUser(user);
      router.push(`/dashboard?user=${userId}`);
    }
  }

  const dataIsLoading = !users || !seats || !assignments || !changeRequests || !group;

  if (loading || dataIsLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading user and data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen">
      <Header 
        user={currentUser} 
        allUsers={HARDCODED_USERS}
        onUserSwitch={handleUserSwitch}
        groupName={group?.name} 
        onSmartScheduleClick={() => setSmartScheduleDialogOpen(true)} 
      />
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CalendarView
            assignments={assignments}
            users={users}
            seats={seats}
            changeRequests={changeRequests}
            onSeatChangeRequest={handleSeatChangeRequest}
            currentUser={currentUser}
          />
        </div>

        <div className="space-y-8">
          <PendingApprovals
            requests={changeRequests}
            users={users}
            seats={seats}
            currentUser={currentUser}
            group={group}
            onApprove={(id) => handleApproval(id, 'approve')}
            onReject={(id) => handleApproval(id, 'reject')}
          />
          <SmartSchedule 
            users={users}
            seats={seats}
            onScheduleGenerated={handleScheduleGenerated} 
            assignments={assignments}
            group={group}
          />
        </div>
      </main>

      {seatChangeDialogData && (
        <SeatChangeDialog
          isOpen={isSeatChangeDialogOpen}
          onOpenChange={setSeatChangeDialogOpen}
          date={seatChangeDialogData.date}
          assignment={seatChangeDialogData.assignment}
          user={currentUser}
          seats={seats}
          users={users}
          currentAssignmentsForDay={assignments.filter(a => a.date === format(seatChangeDialogData.date, 'yyyy-MM-dd'))}
          onSubmit={handleSeatChangeSubmit}
        />
      )}
    </div>
  );
}
