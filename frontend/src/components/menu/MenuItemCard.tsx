import { MenuItem } from "@/lib/api";
import { Plus, Minus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { getTextDir } from "@/lib/branding";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { localizeMenuDescription, localizeMenuName } from "@/lib/menuTranslations";
import { AnimatePresence, motion } from "framer-motion";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const isAvailable = item.is_available;
  const addItem = useCartStore((state) => state.addItem);
  const { t, dir, language } = useLanguage();
  const itemName = localizeMenuName(item.name, language);
  const itemDescription = localizeMenuDescription(item.description, language);

  const [isExpanded, setIsExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // Close the image preview with the Escape key while it is open.
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  const handleAdd = () => {
    addItem(item, quantity, notes);
    setIsExpanded(false);
    setQuantity(1);
    setNotes("");
  };

  return (
    <div className={`border-b border-zinc-100 dark:border-zinc-800/50 ${!isAvailable ? 'opacity-50' : 'bg-white dark:bg-zinc-950'}`}>
      {item.image && (
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label={t("viewImage", { name: itemName })}
            className="relative block mx-auto aspect-square w-full max-w-[260px] appearance-none p-0 overflow-hidden rounded-xl bg-white dark:bg-zinc-950 cursor-zoom-in"
            style={{ boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--brand-accent) 45%, transparent)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={itemName}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-2"
            />
            <div
              className="absolute bottom-2 start-2 rounded-full px-3 py-1 text-xs font-extrabold shadow-sm"
              style={{ backgroundColor: "var(--brand-accent)", color: "var(--brand-on-accent)" }}
            >
              {item.price} EGP
            </div>
          </button>
        </div>
      )}
      <div className="p-4 flex justify-between gap-4">
        <div className="flex flex-col flex-1 pe-2">
          <h3
            dir={getTextDir(itemName)}
            className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight text-start"
          >
            {itemName}
          </h3>
          {itemDescription && (
            <p
              dir={getTextDir(itemDescription)}
              className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 line-clamp-2 leading-relaxed text-start"
            >
              {itemDescription}
            </p>
          )}
          <div
            className="mt-2 font-extrabold text-base text-start"
            style={{ color: "var(--brand-accent)" }}
          >
            {item.price} EGP
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-end shrink-0 w-24">
          {isAvailable ? (
            <button
              type="button"
              onClick={() => {
                if (!isExpanded) setIsExpanded(true);
              }}
              style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
              className="w-full flex items-center justify-center gap-1 shadow-sm rounded-full py-1.5 px-3 transition-all active:scale-95 duration-200 hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">{t("add")}</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-md">
              {t("soldOut")}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4"
          >
            <div className="pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("quantity")}</div>
                <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-900 rounded-full p-1">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-4 text-center font-semibold text-zinc-900 dark:text-zinc-100">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 text-start">{t("notes")}</label>
                <input
                  type="text"
                  dir="auto"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100 text-start"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setIsExpanded(false)}
                  style={{ backgroundColor: "var(--brand-secondary)", color: "var(--brand-on-secondary)" }}
                  className="flex-1 py-3 rounded-xl font-medium active:scale-95 transition-transform hover:opacity-90"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleAdd}
                  style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
                  className="flex-[2] py-3 rounded-xl font-bold active:scale-95 transition-transform hover:opacity-90"
                >
                  {t("confirm")} · {formatPrice(parseFloat(item.price) * quantity)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap-to-preview food image dialog */}
      <AnimatePresence>
        {previewOpen && item.image && (
          <motion.div
            dir={dir}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={itemName}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label={t("close")}
                className="absolute top-3 end-3 z-10 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center bg-white dark:bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={itemName}
                  decoding="async"
                  className="w-full max-h-[70vh] object-contain p-4"
                />
              </div>

              <div className="px-5 pb-5 pt-1">
                <h3
                  dir={getTextDir(itemName)}
                  className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-start"
                >
                  {itemName}
                </h3>
                <div
                  className="mt-1 font-extrabold text-base text-start"
                  style={{ color: "var(--brand-accent)" }}
                >
                  {item.price} EGP
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
