"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCustomerStore } from "@/store/useCustomerStore";
import { useBrandingStore } from "@/store/useBrandingStore";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { brandName, getTextDir } from "@/lib/branding";
import { useLanguage } from "@/lib/i18n";
import { startTableSession, ApiError, RestaurantBranding } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function TableSessionEntry() {
  const router = useRouter();
  const params = useParams();
  const tableToken = params?.tableToken as string;
  const setSession = useCustomerStore((state) => state.setSession);
  const setBranding = useBrandingStore((state) => state.setBranding);
  const clearBranding = useBrandingStore((state) => state.clearBranding);
  const { t, dir } = useLanguage();

  // Apply whatever branding is currently in the store to the loading screen.
  useBrandTheme();

  // Error kept as a language-agnostic descriptor so it re-localizes if the user
  // switches language (translation happens at render, never inside the effect).
  type ErrState = { type: 'server'; text: string } | { type: 'validate' } | { type: 'network' };
  const [error, setError] = useState<ErrState | null>(null);
  // Branding for the CURRENT scan only, tagged with the token it belongs to, so
  // a previously persisted restaurant's identity can never leak onto this screen.
  const [scan, setScan] = useState<{ token: string; restaurant: RestaurantBranding } | null>(null);

  useEffect(() => {
    if (!tableToken) {
      return;
    }

    // A new scan starts: immediately drop stale persisted branding so the
    // loading screen falls back to neutral colors until this table resolves.
    clearBranding();

    let cancelled = false;
    const initSession = async () => {
      try {
        const data = await startTableSession(tableToken);
        if (cancelled) return;
        setSession(data.session_token, data.expires_at);
        if (data.restaurant) {
          // Theme the loading screen with the real restaurant before /menu loads.
          setBranding(data.restaurant);
          setScan({ token: tableToken, restaurant: data.restaurant });
        }
        router.push("/menu");
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message ? { type: 'server', text: err.message } : { type: 'validate' });
        } else {
          setError({ type: 'network' });
        }
      }
    };

    initSession();
    return () => {
      cancelled = true;
    };
  }, [tableToken, setSession, setBranding, clearBranding, router]);

  // Only trust the resolved branding when it matches the token we're scanning.
  const name = scan && scan.token === tableToken ? brandName(scan.restaurant) : null;
  const errorText = !error
    ? null
    : error.type === 'server'
      ? error.text
      : error.type === 'validate'
        ? t('tableValidateError')
        : t('connectionError');

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-500">
        {!errorText ? (
          <>
            <Loader2
              className="h-10 w-10 animate-spin"
              style={{ color: "var(--brand-primary)" }}
            />
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("connecting")}
            </h1>
            <p className="text-sm text-zinc-500" dir={name ? getTextDir(name) : dir}>
              {name ? t("connectingHintNamed", { name }) : t("connectingHint")}
            </p>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <span className="text-red-600 dark:text-red-400 font-bold text-xl">!</span>
            </div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
              {t("connectionFailed")}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
              {errorText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
