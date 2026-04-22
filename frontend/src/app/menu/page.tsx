"use client";

import { useMenu } from "@/hooks/useMenu";
import { useCustomerStore } from "@/store/useCustomerStore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { CategorySection } from "@/components/menu/CategorySection";
import { CartWidget } from "@/components/cart/CartWidget";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MenuPage() {
  const router = useRouter();
  const { isValid } = useCustomerStore();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (mounted && !isValid()) {
      router.replace("/session-expired");
    }
  }, [mounted, isValid, router]);

  const { data: menuData, isLoading, error, refetch } = useMenu();

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
        <p className="text-zinc-500 font-medium animate-pulse">Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Failed to load menu</h2>
        <p className="text-zinc-500 max-w-sm mb-6">{error.message}</p>
        <button 
          onClick={() => refetch()} 
          className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-semibold tracking-tight active:scale-95 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const categories = menuData?.categories || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32">
      {/* Header Placeholder - branding */}
      <header className="pt-12 pb-6 px-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tawlax.
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Order seamlessly. Relax instantly.
          </p>
        </div>
      </header>

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
            No items available right now.
          </div>
        )}
      </main>

      <CartWidget onOpenCart={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
