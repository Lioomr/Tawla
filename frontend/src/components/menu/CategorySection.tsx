import { MenuCategory } from "@/lib/api";
import { MenuItemCard } from "./MenuItemCard";

interface CategorySectionProps {
  category: MenuCategory;
}

export function CategorySection({ category }: CategorySectionProps) {
  if (!category.items || category.items.length === 0) return null;

  return (
    <div id={`category-${category.id}`} className="pt-8 pb-4 scroll-mt-[140px]">
      <h2 className="px-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
        {category.name}
      </h2>
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
