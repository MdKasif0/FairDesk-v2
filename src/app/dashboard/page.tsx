
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
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  where,
  addDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

const HARDCODED_USERS: User[] = [
  { id: 'user-aariz', name: 'Aariz', avatar: 'https://i.pravatar.cc/150?u=aariz' },
  { id: 'user-nabil', name: 'Nabil', avatar: 'https://i.pravatar.cc/150?u=nabil' },
  { id: 'user-yatharth', name: 'Yatharth', avatar: 'https://i.pravatar.cc/150?u=yatharth' },
];
const HARDCODED_GROUP_ID = 'default-fairdesk-group';
const HARDCODED_SEATS = ["Desk 1", "Desk 2", "Desk 3"];


export default function DashboardPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSeatChangeDialogOpen, setSeatChangeDialogOpen] = useState(false);
  const [seatChangeDialogData, setSeatChangeDialogData] = useState<{date: Date, assignment: Assignment} | null>(null);
  
  const [isSmartScheduleDialogOpen, setSmartScheduleDialogOpen] = useState(false);

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
      const groupDocRef = doc(db, "groups", HARDCODED_GROUP_ID);
      const groupDocSnap = await getDoc(groupDocRef);

      if (!groupDocSnap.exists()) {
        console.log("No existing group found, initializing new data...");
        try {
          const batch = writeBatch(db);
          
          // 1. Create users
          HARDCODED_USERS.forEach(user => {
            batch.set(doc(db, "users", user.id), user);
          });
          
          // 2. Create seats
          const seatIds = HARDCODED_SEATS.map(seatName => {
              const seatRef = doc(collection(db, "seats"));
              batch.set(seatRef, {
                  id: seatRef.id,
                  name: seatName,
                  groupId: HARDCODED_GROUP_ID
              });
              return seatRef.id;
          });

          // 3. Create group
           const newGroup = {
                id: HARDCODED_GROUP_ID,
                name: "FairDesk Team",
                members: HARDCODED_USERS.map(u => u.id),
                isLocked: true,
            };
           batch.set(groupDocRef, newGroup);
           
           // 4. Create initial assignment for today
           let today = startOfToday();
           if(isWeekend(today)) {
               today = addDays(today, 1);
               if(isWeekend(today)) today = addDays(today, 1);
           }
           const todayStr = format(today, 'yyyy-MM-dd');
           HARDCODED_USERS.forEach((user, index) => {
               const assignmentRef = doc(collection(db, "assignments"));
               batch.set(assignmentRef, {
                   id: assignmentRef.id,
                   date: todayStr,
                   userId: user.id,
                   seatId: seatIds[index],
                   groupId: HARDCODED_GROUP_ID,
               });
           });
           
          await batch.commit();
          toast({ title: "Welcome!", description: "Initial data has been set up." });
        } catch (error) {
            console.error("Failed to initialize data:", error);
            toast({ variant: 'destructive', title: 'Initialization Failed', description: 'Could not set up initial user and group data.' });
        }
      }

      // Setup listeners
      const unsubscribes = [
        onSnapshot(doc(db, 'groups', HARDCODED_GROUP_ID), (doc) => {
          if(doc.exists()){
              setGroup({ ...doc.data(), id: doc.id } as Group);
          }
        }),
        onSnapshot(query(collection(db, 'users'), where('id', 'in', HARDCODED_USERS.map(u => u.id))), (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
        }),
        onSnapshot(query(collection(db, 'seats'), where('groupId', '==', HARDCODED_GROUP_ID)), (snapshot) => {
          setSeats(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Seat)));
        }),
        onSnapshot(query(collection(db, 'assignments'), where('groupId', '==', HARDCODED_GROUP_ID)), (snapshot) => {
          setAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
        }),
        onSnapshot(query(collection(db, 'changeRequests'), where('groupId', '==', HARDCODED_GROUP_ID), where('status', '==', 'pending')), (snapshot) => {
          setChangeRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChangeRequest)));
        }),
      ];
      
      setLoading(false);
      return () => unsubscribes.forEach(unsub => unsub());
    };

    initializeData();
  }, []);

  const handleSeatChangeRequest = (date: Date, assignment: Assignment) => {
    if (isBefore(date, startOfToday())) return;
    setSeatChangeDialogData({ date, assignment });
    setSeatChangeDialogOpen(true);
  };
  
  const handleSeatChangeSubmit = async (requestedSeatId: string) => {
    if (seatChangeDialogData && currentUser && group) {
       const userToSwapWith = assignments.find(a => a.date === format(seatChangeDialogData.date, "yyyy-MM-dd") && a.seatId === requestedSeatId)?.userId;

      if (!userToSwapWith) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find the user to swap with. The seat might be unassigned.",
        });
        return;
      }
      
      const newRequestData = {
        date: format(seatChangeDialogData.date, "yyyy-MM-dd"),
        proposingUserId: currentUser.id,
        userToSwapWithId: userToSwapWith,
        originalSeatId: seatChangeDialogData.assignment.seatId,
        requestedSeatId: requestedSeatId,
        status: "pending" as const,
        approvals: [],
        rejections: [],
        groupId: group.id,
      };
      
      try {
        await addDoc(collection(db, "changeRequests"), newRequestData);
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
    if (!currentUser || !changeRequests) return;
    
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
    
    // In a 3-person group, 1 vote is needed (the person not involved).
    const approvalsNeeded = 1;
    const isApproved = newApprovals.length >= approvalsNeeded;
    const isRejected = newRejections.length >= 1;

    const newStatus = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

    const requestRef = doc(db, "changeRequests", requestId);
    
    try {
        const updatePayload: any = {
            approvals: newApprovals,
            rejections: newRejections,
        };
        
        if (newStatus !== 'pending') {
            updatePayload.status = newStatus;
        }
        
        await updateDoc(requestRef, updatePayload);
        
        if (newStatus === 'approved') {
            const batch = writeBatch(db);

            const assignment1Query = query(collection(db, "assignments"), 
                where("date", "==", request.date), 
                where("userId", "==", request.proposingUserId),
                where("groupId", "==", request.groupId)
            );
            const assignment2Query = query(collection(db, "assignments"), 
                where("date", "==", request.date), 
                where("userId", "==", request.userToSwapWithId),
                where("groupId", "==", request.groupId)
            );

            const [assignment1Snap, assignment2Snap] = await Promise.all([
                getDocs(assignment1Query),
                getDocs(assignment2Query)
            ]);

            if (!assignment1Snap.empty && !assignment2Snap.empty) {
                const assignment1Ref = assignment1Snap.docs[0].ref;
                const assignment2Ref = assignment2Snap.docs[0].ref;

                batch.update(assignment1Ref, { seatId: request.requestedSeatId });
                batch.update(assignment2Ref, { seatId: request.originalSeatId });

                await batch.commit();
            } else {
                 throw new Error("Could not find assignments to swap.");
            }
        }
        
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
    if(!group) return;

    let nextDay = addDays(new Date(), 1);
    while (isWeekend(nextDay)) {
        nextDay = addDays(nextDay, 1);
    }
    const nextWorkingDay = format(nextDay, 'yyyy-MM-dd');

    try {
      const batch = writeBatch(db);
      
      const q = query(collection(db, "assignments"), where("date", "==", nextWorkingDay), where("groupId", "==", group.id));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      Object.entries(newSchedule).forEach(([userName, seatName]) => {
        const user = users.find(u => u.name === userName);
        const seat = seats.find(s => s.name === seatName);
        if (!user || !seat) throw new Error(`Invalid user ${userName} or seat ${seatName}`);
        
        const newAssignment = {
          date: nextWorkingDay,
          userId: user.id,
          seatId: seat.id,
          groupId: group.id,
        };
        const newDocRef = doc(collection(db, "assignments"));
        batch.set(newDocRef, newAssignment);
      });

      await batch.commit();
      
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

  if (loading || !currentUser) {
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
