import { useCartStore } from "@/store/useCartStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Loader2, Trash2, ShoppingBag } from "lucide-react";
import { useCreateOrder } from "@/hooks/useOrders";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { getTextDir } from "@/lib/branding";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, getSubtotal, getTotalItems } = useCartStore();
  const subtotal = getSubtotal();
  const totalItems = getTotalItems();
  const createOrder = useCreateOrder();
  const router = useRouter();
  const { t, dir } = useLanguage();

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
        setErrorPayload(err.message || t("orderFailed"));
      } else {
        setErrorPayload(t("networkError"));
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
            dir={dir}
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
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">{t("yourOrder")}</h2>
                {totalItems > 0 && (
                  <span className="text-sm font-bold" style={{ color: "var(--brand-accent)" }}>
                    {totalItems} {t("items")}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label={t("cancel")}
                className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-zinc-400 dark:text-zinc-500">
                  <ShoppingBag className="w-10 h-10" />
                  <p className="font-semibold text-zinc-500 dark:text-zinc-400">{t("cartEmpty")}</p>
                  <p className="text-sm">{t("cartEmptyHint")}</p>
                </div>
              ) : (
                items.map((item) => {
                  const unit = parseFloat(item.menuItem.price);
                  const lineTotal = unit * item.quantity;
                  return (
                    <div
                      key={item.cartItemId}
                      className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          dir={getTextDir(item.menuItem.name)}
                          className="font-bold text-zinc-900 dark:text-zinc-100 text-start leading-snug"
                        >
                          {item.menuItem.name}
                        </span>
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100 shrink-0">
                          {formatPrice(lineTotal)}
                        </span>
                      </div>

                      {item.notes && (
                        <p dir={getTextDir(item.notes)} className="text-zinc-500 text-sm mt-1 text-start">
                          {t("note")}: {item.notes}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-1 h-fit">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            aria-label="-"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-zinc-700 shadow-sm active:scale-90 transition-transform text-zinc-700 dark:text-zinc-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center text-zinc-900 dark:text-zinc-100">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            aria-label="+"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-zinc-700 shadow-sm active:scale-90 transition-transform text-zinc-700 dark:text-zinc-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {errorPayload && (
                <div className="mt-1 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium">
                  {errorPayload}
                </div>
              )}
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800/60 pb-8">
              <div className="flex items-center justify-between mb-4 px-1 tracking-tight">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t("total")}</span>
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xl">{formatPrice(subtotal)}</span>
              </div>
              <button
                disabled={items.length === 0 || createOrder.isPending}
                onClick={handleCheckout}
                style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
                className="w-full h-14 rounded-2xl font-bold tracking-tight text-lg shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("placingOrder")}
                  </>
                ) : (
                  <>{t("placeOrder")}</>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
