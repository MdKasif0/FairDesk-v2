
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChangeRequest, Seat, User as UserType } from "@/lib/types";
import { ThumbsDown, ThumbsUp, ArrowRight, User, HelpCircle } from "lucide-react";
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
  const approvalsNeeded = 2; // This should ideally be a config value

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle>Pending Approvals</CardTitle>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>A swap needs {approvalsNeeded} approvals to pass.</p>
                        <p>The proposer and the person being swapped with do not vote.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
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
              const userToSwapWith = getUser(req.userToSwapWithId);
              const originalSeat = getSeat(req.originalSeatId);
              const requestedSeat = getSeat(req.requestedSeatId);

              if (!proposingUser || !userToSwapWith || !originalSeat || !requestedSeat || !currentUser) return null;
              
              const hasVoted = req.approvals.includes(currentUser.id) || req.rejections.includes(currentUser.id);
              const canVote = currentUser.id !== proposingUser.id && currentUser.id !== userToSwapWith.id;

              return (
                <div key={req.id} className="p-3 border rounded-lg bg-card space-y-3">
                  <p className="text-sm font-medium">
                    <span className="font-bold">{proposingUser.name}</span> wants to swap seats with <span className="font-bold">{userToSwapWith.name}</span> for <span className="font-bold">{format(new Date(req.date), 'MMMM do')}</span>
                  </p>
                  
                  <div className="flex items-center justify-around text-sm bg-secondary p-2 rounded-md">
                    <div className="flex items-center space-x-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={proposingUser.avatar} />
                        <AvatarFallback>{proposingUser.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{originalSeat.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center space-x-1.5">
                       <Avatar className="h-6 w-6">
                        <AvatarImage src={userToSwapWith.avatar} />
                        <AvatarFallback>{userToSwapWith.name[0]}</AvatarFallback>
                      </Avatar>
                       <span className="font-semibold">{requestedSeat.name}</span>
                    </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                           Approvals: {req.approvals.length} of {approvalsNeeded} needed
                        </span>
                        <div className="flex space-x-1 -mr-2">
                          {[...req.approvals, ...req.rejections].map(userId => {
                            const user = getUser(userId);
                            if (!user) return null;
                            const isApproval = req.approvals.includes(userId);
                            return (
                              <Tooltip key={userId}>
                                <TooltipTrigger>
                                  <Avatar className="h-6 w-6 border-2" style={{borderColor: isApproval ? 'hsl(var(--accent-foreground))' : 'hsl(var(--destructive))'}}>
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
                  
                  {canVote && (
                    <div className="flex justify-end space-x-2">
                       <Button size="sm" variant="outline" onClick={() => onReject(req.id)} disabled={hasVoted}>
                          <ThumbsDown className="h-4 w-4 mr-1" /> Reject
                       </Button>
                       <Button size="sm" onClick={() => onApprove(req.id)} disabled={hasVoted}>
                          <ThumbsUp className="h-4 w-4 mr-1" /> Approve
                       </Button>
                    </div>
                  )}

                  {!canVote && (
                    <p className="text-xs text-muted-foreground text-center">
                      {hasVoted ? "You have already voted." : "You are involved in this swap and cannot vote."}
                    </p>
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

    