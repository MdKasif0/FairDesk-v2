"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import type { Assignment, ChangeRequest, Seat, User } from "@/lib/types";
import { users as mockUsers, seats as mockSeats } from "@/lib/mock-data";
import Header from "@/components/dashboard/Header";
import CalendarView from "@/components/dashboard/CalendarView";
import PendingApprovals from "@/components/dashboard/PendingApprovals";
import SmartSchedule from "@/components/dashboard/SmartSchedule";
import SeatChangeDialog from "@/components/dashboard/SeatChangeDialog";
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
  Timestamp
} from "firebase/firestore";
import { useLiveQuery } from 'dexie-react-hooks';
import { idb } from '@/lib/db';

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Data from IndexedDB, kept in sync with Firestore
  const users = useLiveQuery(() => idb.users.toArray(), []);
  const seats = useLiveQuery(() => idb.seats.toArray(), []);
  const assignments = useLiveQuery(() => idb.assignments.toArray(), []);
  const changeRequests = useLiveQuery(() => idb.changeRequests.toArray(), []);


  const [isSeatChangeDialogOpen, setSeatChangeDialogOpen] = useState(false);
  const [seatChangeDialogData, setSeatChangeDialogData] = useState<{date: Date, assignment: Assignment} | null>(null);
  
  // For Smart Schedule Dialog
  const [isSmartScheduleDialogOpen, setSmartScheduleDialogOpen] = useState(false);

  // Auth and Data Loading Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // This is a simplified user mapping. In a real app, you might fetch a full user profile.
        const matchedUser = mockUsers.find(u => user.email?.startsWith(u.name.toLowerCase().replace(" ", "")));
        if (matchedUser) {
            setCurrentUser(matchedUser);
        } else {
             // Fallback if email doesn't match
            setCurrentUser({ id: user.uid, name: user.email || "User", avatar: "" });
        }
        
        // Sync Firestore data to IndexedDB
        await syncFirestoreToIdb();

      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Sync data from firestore to IDB
  const syncFirestoreToIdb = async () => {
    try {
        const collections = ['users', 'seats', 'assignments', 'changeRequests'];
        const [usersSnapshot, seatsSnapshot, assignmentsSnapshot, changeRequestsSnapshot] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'seats')),
            getDocs(collection(db, 'assignments')),
            getDocs(collection(db, 'changeRequests'))
        ]);

        const batch = idb.transaction('rw', idb.users, idb.seats, idb.assignments, idb.changeRequests, async () => {
            idb.users.clear();
            idb.users.bulkAdd(usersSnapshot.docs.map(d => ({...d.data(), id: d.id } as User)));
            idb.seats.clear();
            idb.seats.bulkAdd(seatsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Seat)));
            idb.assignments.clear();
            idb.assignments.bulkAdd(assignmentsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Assignment)));
            idb.changeRequests.clear();
            idb.changeRequests.bulkAdd(changeRequestsSnapshot.docs.map(d => ({...d.data(), id: d.id } as ChangeRequest)));
        });

        await batch;

    } catch (error) {
        console.error("Error syncing data:", error);
        toast({
            variant: "destructive",
            title: "Data Sync Failed",
            description: "Could not sync data with the server.",
        });
    }
  };


  const handleSeatChangeRequest = (date: Date, assignment: Assignment) => {
    setSeatChangeDialogData({ date, assignment });
    setSeatChangeDialogOpen(true);
  };
  
  const handleSeatChangeSubmit = async (requestedSeatId: string) => {
    if (seatChangeDialogData && currentUser) {
      const newRequestData = {
        date: format(seatChangeDialogData.date, "yyyy-MM-dd"),
        proposingUserId: currentUser.id,
        currentAssignment: seatChangeDialogData.assignment,
        requestedSeatId: requestedSeatId,
        status: "pending" as const,
        approvals: [],
        rejections: [],
      };
      
      try {
        const docRef = await addDoc(collection(db, "changeRequests"), newRequestData);
        await idb.changeRequests.add({...newRequestData, id: docRef.id});
        toast({
          title: "Request Submitted",
          description: "Your seat change request has been submitted for approval.",
        });
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

    const newApprovals = vote === 'approve' ? [...request.approvals, currentUser.id] : request.approvals;
    const newRejections = vote === 'reject' ? [...request.rejections, currentUser.id] : request.rejections;

    const approvalsNeeded = 2;
    const isApproved = newApprovals.length >= approvalsNeeded;
    const isRejected = newRejections.length >= ((users?.length ?? 0) - 1 - approvalsNeeded);

    const newStatus = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

    const requestRef = doc(db, "changeRequests", requestId);
    
    try {
        await updateDoc(requestRef, {
            approvals: newApprovals,
            rejections: newRejections,
            status: newStatus
        });

        await idb.changeRequests.update(requestId, {
            approvals: newApprovals,
            rejections: newRejections,
            status: newStatus
        });
        
        if (newStatus === 'approved') {
            const a1 = assignments?.find(a => a.date === request.date && a.userId === request.currentAssignment.userId);
            const a2 = assignments?.find(a => a.date === request.date && a.seatId === request.requestedSeatId);

            if (a1 && a2) {
              const batch = writeBatch(db);
              const a1Ref = doc(db, "assignments", a1.id);
              const a2Ref = doc(db, "assignments", a2.id);

              batch.update(a1Ref, { seatId: a2.seatId });
              batch.update(a2Ref, { seatId: a1.seatId });
              
              await batch.commit();

              // Update IndexedDB
              await idb.transaction('rw', idb.assignments, async () => {
                  idb.assignments.update(a1.id, { seatId: a2.seatId });
                  idb.assignments.update(a2.id, { seatId: a1.seatId });
              });
            }
        }
        
        if (newStatus !== 'pending') {
             const aiAlert = await alertSeatChangeStatus({
              isApproved,
              approvalsNeeded,
              approvalsReceived: newApprovals.length,
              proposedSeat: seats?.find(s => s.id === request.requestedSeatId)?.name || 'Unknown',
              currentSeat: seats?.find(s => s.id === request.currentAssignment.seatId)?.name || 'Unknown',
            });
            
            toast({
              title: `Request ${newStatus}`,
              description: aiAlert.alertMessage,
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
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    try {
      const batch = writeBatch(db);

      // Delete existing assignments for tomorrow
      const q = query(collection(db, "assignments"), where("date", "==", tomorrow));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Add new assignments
      const newAssignmentsForTomorrow: Omit<Assignment, 'id'>[] = Object.entries(newSchedule).map(([userName, seatName]) => {
        const user = users?.find(u => u.name === userName);
        const seat = seats?.find(s => s.name === seatName);
        if (!user || !seat) throw new Error(`Invalid user ${userName} or seat ${seatName}`);
        
        const newAssignment = {
          date: tomorrow,
          userId: user.id,
          seatId: seat.id,
        };
        const newDocRef = doc(collection(db, "assignments"));
        batch.set(newDocRef, newAssignment);
        return newAssignment;
      });

      await batch.commit();
      // Re-sync after a major change
      await syncFirestoreToIdb();
      
      toast({
        title: "Success",
        description: "New smart schedule has been applied for tomorrow.",
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


  if (!currentUser || !users || !seats || !assignments || !changeRequests) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading user and data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen">
      <Header user={currentUser} onSmartScheduleClick={() => setSmartScheduleDialogOpen(true)} />
      
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
            onApprove={(id) => handleApproval(id, 'approve')}
            onReject={(id) => handleApproval(id, 'reject')}
          />
          <SmartSchedule onScheduleGenerated={handleScheduleGenerated} />
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
          currentAssignmentsForDay={assignments.filter(a => format(new Date(a.date), 'yyyy-MM-dd') === format(seatChangeDialogData.date, 'yyyy-MM-dd'))}
          onSubmit={handleSeatChangeSubmit}
        />
      )}
    </div>
  );
}
