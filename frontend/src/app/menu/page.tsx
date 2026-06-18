"use client";

import { useMenu } from "@/hooks/useMenu";
import { useCustomerStore } from "@/store/useCustomerStore";
import { useBrandingStore } from "@/store/useBrandingStore";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { brandName, DEFAULT_BRAND, getTextDir } from "@/lib/branding";
import { useLanguage } from "@/lib/i18n";
import { BrandMark } from "@/components/branding/BrandMark";
import { LanguageToggle } from "@/components/menu/LanguageToggle";
import { localizeMenuDescription, localizeMenuName } from "@/lib/menuTranslations";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { CategorySection } from "@/components/menu/CategorySection";
import { CartWidget } from "@/components/cart/CartWidget";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { LobbyBar } from "@/components/lobby/LobbyBar";
import { ActiveOrdersPanel } from "@/components/menu/ActiveOrdersPanel";
import { TableRequestActions } from "@/components/menu/TableRequestActions";
import { GuestJoinedToast } from "@/components/lobby/GuestJoinedToast";
import { GuestNameDialog } from "@/components/lobby/GuestNameDialog";
import { useOrderWebSocket } from "@/hooks/useOrderWebSocket";
import { useSessionRoster } from "@/hooks/useSessionRoster";
import { useLobbyStore } from "@/store/useLobbyStore";
import { isLobbyMode } from "@/lib/lobby";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MenuPage() {
  const router = useRouter();
  const { isValid } = useCustomerStore();
  const { t, dir, language } = useLanguage();
  const setBranding = useBrandingStore((s) => s.setBranding);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isManualNameOpen, setIsManualNameOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Lobby state: drives the shared-table UI and the "set your name" prompt.
  const lobbyActive = isLobbyMode(useLobbyStore((s) => s.mode));
  const hasCustomName = useLobbyStore((s) => s.hasCustomName);
  const namePromptDismissed = useLobbyStore((s) => s.namePromptDismissed);
  const dismissNamePrompt = useLobbyStore((s) => s.dismissNamePrompt);

  // Customer session socket: also carries guest_joined/guest_updated so a solo
  // device flips into lobby mode the moment a second guest scans the table.
  useOrderWebSocket();

  // Authoritative table roster: hydrates the participant list from the backend
  // (not just realtime deltas) and keeps mode/guest identity in sync.
  useSessionRoster();

  useEffect(() => {
    if (mounted && !isValid()) {
      router.replace("/session-expired");
    }
  }, [mounted, isValid, router]);

  // Open the name dialog when (a) the guest taps "add/edit name", or (b) lobby
  // mode is active and they have not yet named themselves nor dismissed the
  // prompt. Derived during render — solo users never see it, and no effect
  // writes state. Closing dismisses the auto-prompt for the rest of the session.
  const shouldAutoPromptName = mounted && lobbyActive && !hasCustomName && !namePromptDismissed;
  const isNameDialogOpen = isManualNameOpen || shouldAutoPromptName;

  const closeNameDialog = () => {
    setIsManualNameOpen(false);
    // Don't auto-reopen this session; the lobby bar still offers a manual entry.
    dismissNamePrompt();
  };

  const { data: menuData, isLoading, error, refetch } = useMenu();

  // Persist branding so the theme survives navigation/reload, then apply it.
  useEffect(() => {
    if (menuData?.restaurant) {
      setBranding(menuData.restaurant);
    }
  }, [menuData?.restaurant, setBranding]);
  useBrandTheme();

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div dir={dir} className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: "var(--brand-accent)" }} />
        <p className="text-zinc-500 font-medium animate-pulse">{t("loadingMenu")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div dir={dir} className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{t("failedToLoad")}</h2>
        <p className="text-zinc-500 max-w-sm mb-6">{error.message}</p>
        <button
          onClick={() => refetch()}
          style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
          className="px-6 py-2 rounded-full font-semibold tracking-tight active:scale-95 transition-all"
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  const categories = menuData?.categories || [];
  const restaurant = menuData?.restaurant;
  const displayName = localizeMenuName(brandName(restaurant), language);
  const rawSubtitle =
    restaurant?.welcome_message?.trim() ||
    restaurant?.tagline?.trim() ||
    DEFAULT_BRAND.tagline;
  const subtitle = localizeMenuDescription(rawSubtitle, language);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32" dir={dir}>
      {/* Banner */}
      {restaurant?.banner_image && (
        <div className="w-full max-w-md mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurant.banner_image}
            alt={`${displayName} banner`}
            className="w-full h-40 object-cover"
            loading="eager"
          />
        </div>
      )}

      {/* Restaurant branding header */}
      <header
        className={`px-4 bg-zinc-50 dark:bg-zinc-950 ${restaurant?.banner_image ? "pt-5 pb-6" : "pt-12 pb-6"}`}
      >
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between gap-3">
            {restaurant?.logo ? (
              <BrandMark branding={restaurant} displayName={displayName} size={48} />
            ) : (
              <h1
                className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 min-w-0 break-words"
                dir={getTextDir(displayName)}
              >
                {displayName}
              </h1>
            )}
            <LanguageToggle className="mt-1" />
          </div>
          <p
            className="mt-2 font-bold text-lg text-start"
            style={{ color: "var(--brand-accent)" }}
            dir={getTextDir(subtitle)}
          >
            {subtitle}
          </p>
        </div>
      </header>

      <LobbyBar onEditName={() => setIsManualNameOpen(true)} />

      <ActiveOrdersPanel onViewOrder={(orderId) => router.push(`/order/${orderId}`)} />

      <TableRequestActions />

      <CategoryNav categories={categories} />

      <main className="max-w-md mx-auto bg-white dark:bg-zinc-950 min-h-screen">
        <AnimatePresence>
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
            >
              <CategorySection 
                category={cat} 
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {categories.length === 0 && (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            {t("noItems")}
          </div>
        )}
      </main>

      <CartWidget onOpenCart={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <GuestJoinedToast />
      <GuestNameDialog isOpen={isNameDialogOpen} onClose={closeNameDialog} />
    </div>
  );
}
