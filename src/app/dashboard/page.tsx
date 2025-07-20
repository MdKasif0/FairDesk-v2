"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import type { Assignment, ChangeRequest, Seat, User } from "@/lib/types";
import { users, seats, initialAssignments, initialChangeRequests } from "@/lib/mock-data";
import Header from "@/components/dashboard/Header";
import CalendarView from "@/components/dashboard/CalendarView";
import PendingApprovals from "@/components/dashboard/PendingApprovals";
import SmartSchedule from "@/components/dashboard/SmartSchedule";
import SeatChangeDialog from "@/components/dashboard/SeatChangeDialog";
import { useToast } from "@/hooks/use-toast";
import { alertSeatChangeStatus } from "@/ai/flows/alert-seat-change-status";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(initialChangeRequests);

  const [isSeatChangeDialogOpen, setSeatChangeDialogOpen] = useState(false);
  const [seatChangeDialogData, setSeatChangeDialogData] = useState<{date: Date, assignment: Assignment} | null>(null);
  
  // For Smart Schedule Dialog
  const [isSmartScheduleDialogOpen, setSmartScheduleDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const userJson = localStorage.getItem("fairdesk_user");
      if (userJson) {
        setCurrentUser(JSON.parse(userJson));
      } else {
        router.push("/login");
      }
    } catch (error) {
      router.push("/login");
    }
  }, [router]);

  const handleSeatChangeRequest = (date: Date, assignment: Assignment) => {
    setSeatChangeDialogData({ date, assignment });
    setSeatChangeDialogOpen(true);
  };
  
  const handleSeatChangeSubmit = (requestedSeatId: string) => {
    if (seatChangeDialogData && currentUser) {
      const newRequest: ChangeRequest = {
        id: `req-${Date.now()}`,
        date: format(seatChangeDialogData.date, "yyyy-MM-dd"),
        proposingUserId: currentUser.id,
        currentAssignment: seatChangeDialogData.assignment,
        requestedSeatId: requestedSeatId,
        status: "pending",
        approvals: [],
        rejections: [],
      };
      setChangeRequests(prev => [...prev, newRequest]);
      toast({
        title: "Request Submitted",
        description: "Your seat change request has been submitted for approval.",
      });
    }
  };

  const handleApproval = async (requestId: string, vote: 'approve' | 'reject') => {
    if (!currentUser) return;
    
    let updatedRequest: ChangeRequest | undefined;
    const newChangeRequests = changeRequests.map(req => {
      if (req.id === requestId) {
        updatedRequest = {
          ...req,
          approvals: vote === 'approve' ? [...req.approvals, currentUser.id] : req.approvals,
          rejections: vote === 'reject' ? [...req.rejections, currentUser.id] : req.rejections,
        };
        return updatedRequest;
      }
      return req;
    });

    if (updatedRequest) {
      const approvalsNeeded = 2;
      const isApproved = updatedRequest.approvals.length >= approvalsNeeded;
      const isRejected = updatedRequest.rejections.length >= (users.length - 1 - approvalsNeeded);

      if (isApproved || isRejected) {
        updatedRequest.status = isApproved ? 'approved' : 'rejected';

        if (isApproved) {
            // Swap seats
            const originalAssignment = updatedRequest.currentAssignment;
            const targetAssignment = assignments.find(a => a.date === updatedRequest!.date && a.seatId === updatedRequest!.requestedSeatId);

            const newAssignments = assignments.map(a => {
                if(a.date === originalAssignment.date && a.userId === originalAssignment.userId) {
                    return {...a, seatId: originalAssignment.seatId};
                }
                if(targetAssignment && a.date === targetAssignment.date && a.userId === targetAssignment.userId) {
                    return {...a, seatId: originalAssignment.seatId};
                }
                if(a.date === originalAssignment.date && a.userId === originalAssignment.userId) {
                    return {...a, seatId: updatedRequest!.requestedSeatId};
                }
                return a;
            });
            
            const a1 = assignments.find(a => a.date === updatedRequest!.date && a.userId === updatedRequest!.currentAssignment.userId);
            const a2 = assignments.find(a => a.date === updatedRequest!.date && a.seatId === updatedRequest!.requestedSeatId);

            const finalAssignments = assignments.map(a => {
              if (a.date === updatedRequest?.date) {
                if (a.userId === a1?.userId) return { ...a, seatId: a2?.seatId ?? a.seatId };
                if (a.userId === a2?.userId) return { ...a, seatId: a1?.seatId ?? a.seatId };
              }
              return a;
            });

            setAssignments(finalAssignments);
        }

        const aiAlert = await alertSeatChangeStatus({
          isApproved,
          approvalsNeeded,
          approvalsReceived: updatedRequest.approvals.length,
          proposedSeat: seats.find(s => s.id === updatedRequest!.requestedSeatId)?.name || 'Unknown',
          currentSeat: seats.find(s => s.id === updatedRequest!.currentAssignment.seatId)?.name || 'Unknown',
        });
        
        toast({
          title: `Request ${updatedRequest.status}`,
          description: aiAlert.alertMessage,
        });

      }
      setChangeRequests(newChangeRequests);
    }
  };

  const handleScheduleGenerated = (newSchedule: Record<string, string>) => {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const newAssignmentsForTomorrow: Assignment[] = Object.entries(newSchedule).map(([userName, seatName]) => {
      const user = users.find(u => u.name === userName);
      const seat = seats.find(s => s.name === seatName);
      if (!user || !seat) throw new Error("Invalid user or seat in generated schedule");
      return {
        date: tomorrow,
        userId: user.id,
        seatId: seat.id,
      };
    });
    
    // Remove any existing assignments for tomorrow and add the new ones
    setAssignments(prev => [...prev.filter(a => a.date !== tomorrow), ...newAssignmentsForTomorrow]);
  };


  if (!currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading user...</p>
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
