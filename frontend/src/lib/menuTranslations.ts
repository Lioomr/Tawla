import type { Language } from '@/store/useLanguageStore';

type MenuText = {
  name?: string;
  description?: string;
};

const EN_MENU_TEXT: Record<string, MenuText> = {
  'البركة': { name: 'Al Baraka' },
  'أهلا بيك في البركة. اختار طلبك من المنيو وهنحضرهولك على الترابيزة.': {
    description: "Welcome to Al Baraka. Choose from the menu and we'll bring it to your table.",
  },
  'أكل مصري سريع بطعم البيت': {
    description: 'Fast Egyptian comfort food with a homemade taste.',
  },
  'منيو الوجبات': { name: 'Meals' },
  'منيو الفتات': { name: 'Fattah Menu' },
  'الإضافات': { name: 'Add-ons' },
  'الصوصات': { name: 'Sauces' },
  'ربع فرخة بروستد': { name: 'Quarter Broasted Chicken' },
  'ربع فرخة بروستد مع أرز وعيش ومخلل وصوص.': {
    description: 'Quarter broasted chicken with rice, bread, pickles, and sauce.',
  },
  'وجبة سترس': { name: 'Strips Meal' },
  'قطع فراخ كرسبي مع أرز وعيش ومخلل وصوص.': {
    description: 'Crispy chicken strips with rice, bread, pickles, and sauce.',
  },
  'وجبة البركة': { name: 'Al Baraka Meal' },
  'وجبة فراخ كرسبي عائلية مع أرز وإضافات وصوصات.': {
    description: 'Family crispy chicken meal with rice, add-ons, and sauces.',
  },
  'فتة': { name: 'Fattah' },
  'فتة رز وعيش محمص وقطع فراخ مع اختيار الصوص.': {
    description: 'Rice fattah with toasted bread, chicken pieces, and your choice of sauce.',
  },
  'بسمنتو': { name: 'Basmento' },
  'بسمنتو فراخ مع رز وصوص حسب الاختيار.': {
    description: 'Chicken basmento with rice and your choice of sauce.',
  },
  'كول سلو': { name: 'Coleslaw' },
  'سلطة كول سلو.': { description: 'Coleslaw salad.' },
  'تومية': { name: 'Garlic Sauce' },
  'صوص تومية.': { description: 'Garlic sauce.' },
  'باربكيو': { name: 'BBQ Sauce' },
  'صوص باربكيو.': { description: 'BBQ sauce.' },
  'رانش': { name: 'Ranch Sauce' },
  'صوص رانش.': { description: 'Ranch sauce.' },
  'سبايسي': { name: 'Spicy Sauce' },
  'صوص سبايسي.': { description: 'Spicy sauce.' },
};

export function localizeMenuName(text: string, language: Language): string {
  if (language !== 'en') return text;
  return EN_MENU_TEXT[text]?.name || text;
}

export function localizeMenuDescription(text: string | null | undefined, language: Language): string {
  if (!text) return '';
  if (language !== 'en') return text;
  return EN_MENU_TEXT[text]?.description || text;
}
