"use client";

import { useEffect, useState } from "react";
import { MenuCategory } from "@/lib/api";
import { getTextDir } from "@/lib/branding";

interface CategoryNavProps {
  categories: MenuCategory[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const [activeCategory, setActiveCategory] = useState<number>(categories[0]?.id || 0);

  useEffect(() => {
    const handleScroll = () => {
      let currentCategoryId = categories[0]?.id;
      for (const cat of categories) {
        const el = document.getElementById(`category-${cat.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Sticky offset + padding consideration
          if (rect.top <= 140) {
            currentCategoryId = cat.id;
          }
        }
      }
      setActiveCategory(currentCategoryId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initialize state
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const scrollToCategory = (id: number) => {
    const el = document.getElementById(`category-${id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="sticky top-0 z-20 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="max-w-md mx-auto">
        <ul className="flex overflow-x-auto snap-x snap-mandatory py-4 px-4 gap-3 whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <li key={cat.id} className="snap-start shrink-0">
                <button
                  type="button"
                  dir={getTextDir(cat.name)}
                  onClick={() => scrollToCategory(cat.id)}
                  style={
                    isActive
                      ? { backgroundColor: "var(--brand-accent)", color: "var(--brand-on-accent)" }
                      : { color: "var(--brand-accent)", borderColor: "var(--brand-accent)" }
                  }
                  className={`px-5 py-2 rounded-full text-sm font-extrabold tracking-tight border transition-all duration-300 ease-out ${
                    isActive
                      ? "shadow-md shadow-zinc-200 dark:shadow-none"
                      : "bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
