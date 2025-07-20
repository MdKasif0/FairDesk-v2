
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, isWeekend, startOfToday } from "date-fns";
import type { Assignment, ChangeRequest, Seat, User, Group } from "@/lib/types";
import Header from "@/components/dashboard/Header";
import CalendarView from "@/components/dashboard/CalendarView";
import PendingApprovals from "@/components/dashboard/PendingApprovals";
import SmartSchedule from "@/components/dashboard/SmartSchedule";
import SeatChangeDialog from "@/components/dashboard/SeatChangeDialog";
import NoGroup from "@/components/dashboard/NoGroup";
import InviteFriends from "@/components/dashboard/InviteFriends";
import { useToast } from "@/hooks/use-toast";
import { alertSeatChangeStatus } from "@/ai/flows/alert-seat-change-status";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
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
} from "firebase/firestore";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSeatChangeDialogOpen, setSeatChangeDialogOpen] = useState(false);
  const [seatChangeDialogData, setSeatChangeDialogData] = useState<{date: Date, assignment: Assignment} | null>(null);
  
  // For Smart Schedule Dialog
  const [isSmartScheduleDialogOpen, setSmartScheduleDialogOpen] = useState(false);

  // Auth and initial user data loading
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = { ...userDocSnap.data(), id: userDocSnap.id } as User;
          setCurrentUser(userData);
          if (!userData.groupId) {
            setLoading(false); // No group, so no more data to load
          }
        } else {
          console.error("No user document found for authenticated user.");
          auth.signOut();
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Real-time data listeners for group data
   useEffect(() => {
    if (!currentUser?.groupId) {
        if (currentUser) setLoading(false);
        return;
    };
    
    setLoading(true);

    const groupDocRef = doc(db, 'groups', currentUser.groupId);

    const unsubscribes = [
      onSnapshot(groupDocRef, (doc) => {
        if(doc.exists()){
            setGroup({ ...doc.data(), id: doc.id } as Group);
        } else {
            // Handle case where group is deleted or user has invalid groupId
            setGroup(null);
        }
      }),
      onSnapshot(query(collection(db, 'users'), where('groupId', '==', currentUser.groupId)), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
      }),
      onSnapshot(query(collection(db, 'seats'), where('groupId', '==', currentUser.groupId)), (snapshot) => {
        setSeats(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Seat)));
      }),
      onSnapshot(query(collection(db, 'assignments'), where('groupId', '==', currentUser.groupId)), (snapshot) => {
        setAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
      }),
      onSnapshot(query(collection(db, 'changeRequests'), where('groupId', '==', currentUser.groupId), where('status', '==', 'pending')), (snapshot) => {
        setChangeRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChangeRequest)));
      }),
    ];
    
    setTimeout(() => setLoading(false), 500);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser?.groupId]);


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

    const totalVoters = (group?.members.length || 0) - 2; 
    const approvalsNeeded = 2;
    const isApproved = newApprovals.length >= approvalsNeeded;
    const isRejected = newRejections.length > (totalVoters - approvalsNeeded);

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
      const userList = users || [];
      const seatList = seats || [];
      
      const q = query(collection(db, "assignments"), where("date", "==", nextWorkingDay), where("groupId", "==", group.id));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      Object.entries(newSchedule).forEach(([userName, seatName]) => {
        const user = userList.find(u => u.name === userName);
        const seat = seatList.find(s => s.name === seatName);
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


  if (loading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading user and data...</p>
      </div>
    );
  }

  // User has no group
  if (!currentUser.groupId) {
    return <NoGroup user={currentUser} />;
  }

  // User has a group, but it's not full yet
  if (group && !group.isLocked) {
    return <InviteFriends group={group} user={currentUser} />;
  }

  // User has a full group, show the main dashboard
  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen">
      <Header user={currentUser} groupName={group?.name} onSmartScheduleClick={() => setSmartScheduleDialogOpen(true)} />
      
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
