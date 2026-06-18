import { MenuCategory } from "@/lib/api";
import { getTextDir } from "@/lib/branding";
import { useLanguage } from "@/lib/i18n";
import { localizeMenuName } from "@/lib/menuTranslations";
import { MenuItemCard } from "./MenuItemCard";

interface CategorySectionProps {
  category: MenuCategory;
}

export function CategorySection({ category }: CategorySectionProps) {
  const { language } = useLanguage();
  if (!category.items || category.items.length === 0) return null;
  const categoryName = localizeMenuName(category.name, language);

  return (
    <div id={`category-${category.id}`} className="pt-8 pb-4 scroll-mt-[140px]">
      <div className="px-4 mb-4 flex items-center gap-3">
        {category.image && (
          <div
            className="shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 ring-2"
            style={{ borderColor: "var(--brand-accent)", boxShadow: "0 0 0 1px var(--brand-accent)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain p-1"
            />
          </div>
        )}
        <h2
          dir={getTextDir(categoryName)}
          className="text-2xl font-extrabold tracking-tight text-start"
          style={{ color: "var(--brand-accent)" }}
        >
          {categoryName}
        </h2>
      </div>
      <div className="flex flex-col">
        {category.items.map((item) => (
          <MenuItemCard 
            key={item.id} 
            item={item} 
          />
        ))}
      </div>
    </div>
  );
}
