'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useLanguageStore, type Language } from '@/store/useLanguageStore';

// Lightweight UI-chrome translations only. Menu/category/item content always
// comes from the backend; we never translate restaurant data here.
const EN = {
  // menu chrome
  loadingMenu: 'Loading menu…',
  failedToLoad: 'Failed to load menu',
  tryAgain: 'Try Again',
  noItems: 'No items available right now.',
  // item card
  add: 'Add',
  soldOut: 'Sold Out',
  quantity: 'Quantity',
  notes: 'Notes',
  notesPlaceholder: 'e.g. no onions, extra spicy…',
  cancel: 'Cancel',
  confirm: 'Confirm',
  close: 'Close',
  viewImage: 'View image of {name}',
  // cart
  viewCart: 'View Cart',
  yourOrder: 'Your Order',
  cartEmpty: 'Your cart is empty.',
  cartEmptyHint: 'Add items from the menu to get started.',
  note: 'Note',
  remove: 'Remove',
  subtotal: 'Subtotal',
  total: 'Total',
  items: 'items',
  placeOrder: 'Place Order',
  placingOrder: 'Placing order…',
  orderFailed: 'Failed to place order.',
  networkError: 'A network error occurred.',
  // table entry
  connecting: 'Connecting to your table…',
  connectingHint: "You'll be ordering in a moment.",
  connectingHintNamed: '{name} will have you ordering in a moment.',
  connectionFailed: 'Connection Failed',
  tableValidateError: 'Could not validate your table. Please try again or ask a waiter.',
  connectionError: 'A connection error occurred. Please check your internet and try again.',
  // session expired
  sessionExpired: 'Session Expired',
  sessionExpiredBody: 'Your table session has timed out.',
  sessionExpiredBodyNamed: 'Your table session at {name} has timed out.',
  sessionExpiredScan: 'Please scan the QR code on your table to start a new session.',
  scanToContinue: "Scan your table's QR code to continue",
  // order status
  orderStatus: 'Order Status',
  trackingDetails: 'Tracking Details',
  receiptSummary: 'Receipt Summary',
  orderNotFound: 'Order Not Found',
  orderNotFoundBody: "We couldn't track down this order. It may have expired or is invalid.",
  returnToMenu: 'Return to Menu',
  locatingOrder: 'Locating order…',
  statusNew: 'Order Placed',
  statusNewDesc: 'Sent to the kitchen',
  statusPreparing: 'Preparing',
  statusPreparingDesc: 'Being made fresh',
  statusReady: 'Ready',
  statusReadyDesc: 'Waiting for waiter',
  statusServed: 'Served',
  statusServedDesc: 'Enjoy your meal!',
  statusCancelled: 'Cancelled',
  // shared table lobby
  lobbySharedTable: 'Shared table',
  lobbyAtThisTable: '{count} at this table',
  lobbyYou: 'You',
  lobbyTableLabel: 'Table',
  lobbyMoreGuests: '+{count} more',
  lobbyAddYourName: 'Add your name',
  lobbyEditName: 'Edit name',
  lobbyGuestJoined: '{name} joined the table',
  lobbyNameTitle: 'What should we call you?',
  lobbyNameSubtitle: 'Your name shows to others sharing this table. Totally optional.',
  lobbyNameLabel: 'Display name',
  lobbyNamePlaceholder: 'e.g. Omar',
  lobbyNameSave: 'Save name',
  lobbyNameSaving: 'Saving…',
  lobbyNameSkip: 'Skip for now',
  lobbyNameErrorUnsafe: 'Please remove special characters like < and >.',
  lobbyNameErrorTooLong: 'That name is too long (40 characters max).',
  lobbyNameError: 'Could not save your name. Please try again.',
  lobbyYourItems: 'Your items',
  lobbyTableOrders: 'Ordered at this table',
  lobbyTableOrdersEmpty: 'No orders placed at this table yet.',
  lobbyTableOrdersHint: 'Orders from everyone at this table show here. View only.',
  lobbyTableOrdersError: 'Could not load the table orders.',
  lobbyViewOrder: 'View',
  lobbyOrderShort: 'Order',
  // active order progress (menu page)
  activeOrdersTitle: 'Active orders',
  activeOrderYours: 'Your order',
  activeOrderProgressLabel: 'Order progress',
  activeOrdersEarlier: 'Earlier orders ({count})',
  tableRequestsTitle: 'Need service?',
  tableRequestCallWaiter: 'Call waiter',
  tableRequestBill: 'Request bill',
  tableRequestHelp: 'Need help',
  tableRequestSending: 'Sending request...',
  tableRequestOpen: '{type} sent. A waiter will see it.',
  tableRequestResolved: '{type} resolved.',
  tableRequestError: 'Could not send request. Please try again.',
  // language toggle
  english: 'English',
  arabic: 'العربية',
} as const;

export type TranslationKey = keyof typeof EN;

const AR: Record<TranslationKey, string> = {
  loadingMenu: 'جارٍ تحميل القائمة…',
  failedToLoad: 'تعذّر تحميل القائمة',
  tryAgain: 'إعادة المحاولة',
  noItems: 'لا توجد أصناف متاحة حاليًا.',
  add: 'أضف',
  soldOut: 'غير متوفر',
  quantity: 'الكمية',
  notes: 'ملاحظات',
  notesPlaceholder: 'مثال: بدون بصل، حار إضافي…',
  cancel: 'إلغاء',
  confirm: 'تأكيد',
  close: 'إغلاق',
  viewImage: 'عرض صورة {name}',
  viewCart: 'عرض السلة',
  yourOrder: 'طلبك',
  cartEmpty: 'سلتك فارغة.',
  cartEmptyHint: 'أضف أصنافًا من القائمة للبدء.',
  note: 'ملاحظة',
  remove: 'حذف',
  subtotal: 'المجموع الفرعي',
  total: 'الإجمالي',
  items: 'أصناف',
  placeOrder: 'تأكيد الطلب',
  placingOrder: 'جارٍ إرسال الطلب…',
  orderFailed: 'تعذّر إرسال الطلب.',
  networkError: 'حدث خطأ في الشبكة.',
  connecting: 'جارٍ الاتصال بطاولتك…',
  connectingHint: 'ستتمكن من الطلب خلال لحظات.',
  connectingHintNamed: '{name} ستجهّزك للطلب خلال لحظات.',
  connectionFailed: 'فشل الاتصال',
  tableValidateError: 'تعذّر التحقق من طاولتك. حاول مرة أخرى أو اطلب مساعدة النادل.',
  connectionError: 'حدث خطأ في الاتصال. تحقق من الإنترنت وحاول مرة أخرى.',
  sessionExpired: 'انتهت الجلسة',
  sessionExpiredBody: 'انتهت مهلة جلسة طاولتك.',
  sessionExpiredBodyNamed: 'انتهت مهلة جلسة طاولتك في {name}.',
  sessionExpiredScan: 'يرجى مسح رمز QR على طاولتك لبدء جلسة جديدة.',
  scanToContinue: 'امسح رمز QR الخاص بطاولتك للمتابعة',
  orderStatus: 'حالة الطلب',
  trackingDetails: 'تفاصيل التتبع',
  receiptSummary: 'ملخص الفاتورة',
  orderNotFound: 'الطلب غير موجود',
  orderNotFoundBody: 'تعذّر العثور على هذا الطلب. ربما انتهت صلاحيته أو أنه غير صالح.',
  returnToMenu: 'العودة إلى القائمة',
  locatingOrder: 'جارٍ تحديد الطلب…',
  statusNew: 'تم استلام الطلب',
  statusNewDesc: 'أُرسل إلى المطبخ',
  statusPreparing: 'قيد التحضير',
  statusPreparingDesc: 'يُحضّر طازجًا',
  statusReady: 'جاهز',
  statusReadyDesc: 'بانتظار النادل',
  statusServed: 'تم التقديم',
  statusServedDesc: 'بالهناء والشفاء!',
  statusCancelled: 'ملغى',
  lobbySharedTable: 'طاولة مشتركة',
  lobbyAtThisTable: '{count} على هذه الطاولة',
  lobbyYou: 'أنت',
  lobbyTableLabel: 'الطاولة',
  lobbyMoreGuests: '+{count} آخرون',
  lobbyAddYourName: 'أضف اسمك',
  lobbyEditName: 'تعديل الاسم',
  lobbyGuestJoined: 'انضم {name} إلى الطاولة',
  lobbyNameTitle: 'بماذا نناديك؟',
  lobbyNameSubtitle: 'يظهر اسمك لمن يشاركونك هذه الطاولة. اختياري تمامًا.',
  lobbyNameLabel: 'الاسم المعروض',
  lobbyNamePlaceholder: 'مثال: عمر',
  lobbyNameSave: 'حفظ الاسم',
  lobbyNameSaving: 'جارٍ الحفظ…',
  lobbyNameSkip: 'تخطٍّ الآن',
  lobbyNameErrorUnsafe: 'يرجى إزالة الرموز الخاصة مثل < و >.',
  lobbyNameErrorTooLong: 'الاسم طويل جدًا (40 حرفًا كحد أقصى).',
  lobbyNameError: 'تعذّر حفظ اسمك. حاول مرة أخرى.',
  lobbyYourItems: 'أصنافك',
  lobbyTableOrders: 'طلبات هذه الطاولة',
  lobbyTableOrdersEmpty: 'لا توجد طلبات على هذه الطاولة بعد.',
  lobbyTableOrdersHint: 'تظهر هنا طلبات الجميع على هذه الطاولة. للعرض فقط.',
  lobbyTableOrdersError: 'تعذّر تحميل طلبات الطاولة.',
  lobbyViewOrder: 'عرض',
  lobbyOrderShort: 'طلب',
  activeOrdersTitle: 'الطلبات النشطة',
  activeOrderYours: 'طلبك',
  activeOrderProgressLabel: 'تقدّم الطلب',
  activeOrdersEarlier: 'طلبات سابقة ({count})',
  tableRequestsTitle: 'تحتاج خدمة؟',
  tableRequestCallWaiter: 'استدعاء النادل',
  tableRequestBill: 'طلب الحساب',
  tableRequestHelp: 'أحتاج مساعدة',
  tableRequestSending: 'جارٍ إرسال الطلب...',
  tableRequestOpen: 'تم إرسال {type}. سيراه النادل.',
  tableRequestResolved: 'تم إنهاء {type}.',
  tableRequestError: 'تعذّر إرسال الطلب. حاول مرة أخرى.',
  english: 'English',
  arabic: 'العربية',
};

const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = { en: EN, ar: AR };

export type TFunction = (key: TranslationKey, vars?: Record<string, string>) => string;

function makeT(language: Language): TFunction {
  return (key, vars) => {
    let str = TRANSLATIONS[language][key] ?? EN[key] ?? key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(`{${k}}`, vars[k]);
      }
    }
    return str;
  };
}

// Returns the active customer language, but only after client mount so SSR and
// the first hydration render match (default 'en'/LTR), then the persisted value
// takes over. Mirrors the useHydratedBranding pattern.
export function useLanguage() {
  const stored = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const toggle = useLanguageStore((s) => s.toggle);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const language: Language = mounted ? stored : 'en';
  const dir: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
    }
  }, [mounted, dir, language]);

  return { language, dir, t: makeT(language), setLanguage, toggle };
}
