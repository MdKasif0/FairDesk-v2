"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChangeRequest, Seat, User as UserType } from "@/lib/types";
import { ThumbsDown, ThumbsUp, User, MapPin, ArrowRight } from "lucide-react";
import { format } from 'date-fns';

interface PendingApprovalsProps {
  requests: ChangeRequest[];
  users: UserType[];
  seats: Seat[];
  currentUser: UserType | null;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function PendingApprovals({
  requests,
  users,
  seats,
  currentUser,
  onApprove,
  onReject,
}: PendingApprovalsProps) {
  const getUser = (userId: string) => users.find((u) => u.id === userId);
  const getSeat = (seatId: string) => seats.find((s) => s.id === seatId);

  const pendingRequests = requests.filter(req => req.status === 'pending');

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
        <CardDescription>
          Seat change requests that need your attention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending requests.
          </p>
        ) : (
          <TooltipProvider>
            {pendingRequests.map((req) => {
              const proposingUser = getUser(req.proposingUserId);
              const currentSeat = getSeat(req.currentAssignment.seatId);
              const requestedSeat = getSeat(req.requestedSeatId);

              if (!proposingUser || !currentSeat || !requestedSeat) return null;
              
              const approvalsNeeded = 2;
              const hasVoted = req.approvals.includes(currentUser?.id || '') || req.rejections.includes(currentUser?.id || '');
              
              return (
                <div key={req.id} className="p-3 border rounded-lg bg-card space-y-3">
                  <p className="text-sm font-medium">
                    <span className="font-bold">{proposingUser.name}</span> requested a change for <span className="font-bold">{format(new Date(req.date), 'MMMM do')}</span>
                  </p>
                  
                  <div className="flex items-center justify-between text-sm bg-secondary p-2 rounded-md">
                    <div className="flex items-center space-x-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={proposingUser.avatar} />
                        <AvatarFallback>{proposingUser.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{currentSeat.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center space-x-1.5">
                       <MapPin className="h-4 w-4 text-primary"/>
                       <span className="font-semibold">{requestedSeat.name}</span>
                    </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                           Approvals: {req.approvals.length} of {approvalsNeeded} needed
                        </span>
                        <div className="flex space-x-1">
                          {[...req.approvals, ...req.rejections].map(userId => {
                            const user = getUser(userId);
                            if (!user) return null;
                            const isApproval = req.approvals.includes(userId);
                            return (
                              <Tooltip key={userId}>
                                <TooltipTrigger>
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{user.name} {isApproval ? 'approved' : 'rejected'}</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                     </div>
                     <Progress value={(req.approvals.length / approvalsNeeded) * 100} className="h-2"/>
                  </div>
                  
                  {!hasVoted && currentUser && (
                    <div className="flex justify-end space-x-2">
                       <Button size="sm" variant="outline" onClick={() => onReject(req.id)}>
                          <ThumbsDown className="h-4 w-4 mr-1" /> Reject
                       </Button>
                       <Button size="sm" onClick={() => onApprove(req.id)}>
                          <ThumbsUp className="h-4 w-4 mr-1" /> Approve
                       </Button>
                    </div>
                  )}

                </div>
              );
            })}
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
