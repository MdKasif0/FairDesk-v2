"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("fairdesk_user");
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // The redirect is fast, but we can show a loader just in case.
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-8 bg-background">
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
          className="h-8 w-8 text-primary"
        >
          <path d="M12 22V2" />
          <path d="M5 12H19" />
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
        <h1 className="text-3xl font-bold text-primary">FairDesk</h1>
      </div>
      <div className="space-y-2 w-64">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
