"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { users } from "@/lib/mock-data"; // We still use this to populate the dropdown
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

function LoginIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" x2="3" y1="12" y2="12" />
        </svg>
    )
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (selectedUserId) {
      const user = users.find((u) => u.id === selectedUserId);
      if (user) {
        setIsLoading(true);
        const email = `${user.name.toLowerCase().replace(" ", "")}@fairdesk.app`;
        const password = "password123"; // Using a mock password for all users

        try {
          // Try to sign in
          await signInWithEmailAndPassword(auth, email, password);
          router.push("/dashboard");
        } catch (error: any) {
          // If user not found, create a new user
          if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
              // After creating, sign in again
              await signInWithEmailAndPassword(auth, email, password);
              router.push("/dashboard");
            } catch (creationError: any) {
               toast({
                variant: "destructive",
                title: "Login Failed",
                description: creationError.message,
              });
            }
          } else {
             toast({
                variant: "destructive",
                title: "Login Failed",
                description: error.message,
              });
          }
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
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
                className="h-8 w-8 text-primary"
            >
                <path d="M12 22V2" />
                <path d="M5 12H19" />
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
            </svg>
            <CardTitle className="text-3xl font-bold text-primary">FairDesk</CardTitle>
          </div>
          <CardDescription>
            Select your name to access your seat plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Your Name</Label>
            <Select onValueChange={setSelectedUserId} value={selectedUserId}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Select your name" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} disabled={!selectedUserId || isLoading} className="w-full">
            {isLoading ? "Signing In..." : <>
            <LoginIcon className="mr-2 h-4 w-4" />
            Sign In
            </>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
