import { MenuItem } from "@/lib/api";
import { Plus, Minus, X } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { AnimatePresence, motion } from "framer-motion";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const isAvailable = item.is_available;
  const addItem = useCartStore((state) => state.addItem);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    addItem(item, quantity, notes);
    setIsExpanded(false);
    setQuantity(1);
    setNotes("");
  };

  return (
    <div className={`border-b border-zinc-100 dark:border-zinc-800/50 ${!isAvailable ? 'opacity-50' : 'bg-white dark:bg-zinc-950'}`}>
      <div className="p-4 flex justify-between gap-4">
        <div className="flex flex-col flex-1 pr-2">
          <h3 className="font-medium text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
          <div className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            ${item.price}
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-end shrink-0 w-24">
          {isAvailable ? (
            <button 
              type="button"
              onClick={() => {
                if (!isExpanded) setIsExpanded(true);
              }}
              className="w-full flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-sm rounded-full py-1.5 px-3 transition-colors active:scale-95 duration-200"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-md">
              Sold Out
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
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Quantity</div>
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
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 text-left">Notes</label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., No ice, extra spicy..." 
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl font-medium active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-[2] py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold active:scale-95 transition-transform"
                >
                  Confirm ${(parseFloat(item.price) * quantity).toFixed(2)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
