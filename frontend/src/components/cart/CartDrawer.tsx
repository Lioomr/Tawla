import { useCartStore } from "@/store/useCartStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Loader2 } from "lucide-react";
import { useCreateOrder } from "@/hooks/useOrders";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, getSubtotal } = useCartStore();
  const subtotal = getSubtotal();
  const createOrder = useCreateOrder();
  const router = useRouter();
  
  const [errorPayload, setErrorPayload] = useState<string | null>(null);

  const handleCheckout = async () => {
    setErrorPayload(null);
    try {
      const payload = {
        items: items.map((i) => ({
          menu_item_id: i.menuItem.id,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
      };
      
      const response = await createOrder.mutateAsync(payload);
      
      // Clear local cart
      clearCart();
      onClose();
      
      // Push to order status page
      router.push(`/order/${response.order_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorPayload(err.message || "Failed to place order.");
      } else {
        setErrorPayload("A network error occurred.");
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md h-[85vh] bg-zinc-50 dark:bg-zinc-950 rounded-t-3xl flex flex-col shadow-2xl"
          >
            {/* Handle bar */}
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Your Order</h2>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500">
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.cartItemId} className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.menuItem.name}</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">${(parseFloat(item.menuItem.price) * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.notes && (
                        <span className="text-zinc-500 text-sm">Note: {item.notes}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 rounded-full px-2 py-1 h-fit">
                      <button 
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center active:scale-90 transition-transform text-zinc-700 dark:text-zinc-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-3 text-center text-zinc-900 dark:text-zinc-100">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center active:scale-90 transition-transform text-zinc-700 dark:text-zinc-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {errorPayload && (
                <div className="mt-4 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium">
                  {errorPayload}
                </div>
              )}
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800/60 pb-8">
              <div className="flex justify-between mb-4 px-2 tracking-tight">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Subtotal</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">${subtotal.toFixed(2)}</span>
              </div>
              <button
                disabled={items.length === 0 || createOrder.isPending}
                onClick={handleCheckout}
                className="w-full h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold tracking-tight text-lg shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>Place Order</>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
