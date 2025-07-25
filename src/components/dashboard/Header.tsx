
"use client";

import { User } from "@/lib/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Bot, Users, Check } from "lucide-react";

interface HeaderProps {
  user: User | null;
  allUsers: User[];
  onUserSwitch: (userId: string) => void;
  groupName?: string;
  onSmartScheduleClick: () => void;
}

export default function Header({ user, allUsers, onUserSwitch, groupName, onSmartScheduleClick }: HeaderProps) {

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  return (
    <header className="flex items-center justify-between p-4 bg-card rounded-lg shadow-md">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-primary"
            >
                <path d="M12 22V2" />
                <path d="M5 12H19" />
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
            </svg>
            <h1 className="text-2xl font-bold text-primary">FairDesk</h1>
        </div>
        {groupName && (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span className="font-medium">{groupName}</span>
            </div>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <Button onClick={onSmartScheduleClick}>
          <Bot className="mr-2 h-4 w-4" />
          Smart Schedule
        </Button>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
                <Avatar>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <p>Viewing as: {user.name}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={user.id} onValueChange={onUserSwitch}>
                {allUsers.map(u => (
                  <DropdownMenuRadioItem key={u.id} value={u.id} className="cursor-pointer">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                    </Avatar>
                    <span>{u.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
