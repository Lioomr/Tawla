import { useCartStore } from "@/store/useCartStore";
import { motion, AnimatePresence } from "framer-motion";

interface CartWidgetProps {
  onOpenCart: () => void;
}

export function CartWidget({ onOpenCart }: CartWidgetProps) {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const subtotal = useCartStore((state) => state.getSubtotal());

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-md mx-auto"
        >
          <button
            onClick={onOpenCart}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full py-4 px-6 shadow-xl flex items-center justify-between active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 dark:bg-black/10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                {totalItems}
              </div>
              <span className="font-semibold text-lg tracking-tight">View Cart</span>
            </div>
            <div className="font-bold text-lg">
              ${subtotal.toFixed(2)}
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
