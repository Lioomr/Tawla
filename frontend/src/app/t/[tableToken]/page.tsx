"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCustomerStore } from "@/store/useCustomerStore";
import { startTableSession, ApiError } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function TableSessionEntry() {
  const router = useRouter();
  const params = useParams();
  const tableToken = params?.tableToken as string;
  const setSession = useCustomerStore((state) => state.setSession);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableToken) {
      // Params might not be fully loaded on first tick in some cases, 
      // but if we genuinely don't have it, we should error out.
      return;
    }

    const initSession = async () => {
      try {
        const data = await startTableSession(tableToken);
        setSession(data.session_token, data.expires_at);
        router.push("/menu");
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message || "Could not validate your table. Please try again or ask a waiter.");
        } else {
          setError("A connection error occurred. Please check your internet and try again.");
        }
      }
    };

    initSession();
  }, [tableToken, setSession, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-500">
        {!error ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
              Connecting to your table...
            </h1>
            <p className="text-sm text-zinc-500">
              Tawlax will have you ordering in a moment.
            </p>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <span className="text-red-600 dark:text-red-400 font-bold text-xl">!</span>
            </div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
              Connection Failed
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
