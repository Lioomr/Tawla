import type { Language } from '@/store/useLanguageStore';

// TODO: Replace with the real Tawlax WhatsApp number. Placeholder: +20 XXX XXX XXXX
export const WHATSAPP_NUMBER = '201013530963';
export const WHATSAPP_DISPLAY = '+20 101 353 0963';

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export type LivePhaseKey = 'placed' | 'preparing' | 'ready' | 'paid';

export interface LivePhase {
  key: LivePhaseKey;
  /** Wall-clock time of the event — Latin digits in both languages, like real receipts. */
  time: string;
  label: string;
  customerLine: string;
  kitchenStatus: string;
  waiterLine: string;
}

interface LeadItem {
  lead: string;
  body: string;
}

interface SurfaceRole {
  tag: string;
  title: string;
  lines: string[];
}

export interface MarketingCopy {
  meta: {
    skipToContent: string;
  };
  nav: {
    problem: string;
    how: string;
    product: string;
    contact: string;
  };
  cta: {
    startFreeTrial: string;
    seeHowItWorks: string;
    whatsappMessage: string;
  };
  hero: {
    headline: string;
    sub: string;
    /** Short, true product facts shown as a spec strip under the hero CTAs. */
    proof: string[];
  };
  live: {
    /** Mono header of the strip, reads like a service log line. */
    logLine: string;
    liveWord: string;
    tableTag: string;
    kitchenTag: string;
    waiterTag: string;
    /** Human names for the three screens, so a visitor instantly knows whose screen each panel is. */
    customerRole: string;
    kitchenRole: string;
    waiterRole: string;
    orderLines: { qty: number; name: string }[];
    note: string;
    totalLabel: string;
    total: string;
    phases: LivePhase[];
    caption: string;
  };
  problem: {
    metaLine: string;
    heading: string;
    imageAlt: string;
    items: LeadItem[];
    closer: string;
  };
  cinematic: {
    kicker: string;
    line: string;
    imageAlt: string;
  };
  timeline: {
    metaLine: string;
    heading: string;
    steps: { time: string; title: string; body: string }[];
  };
  surfaces: {
    heading: string;
    roles: SurfaceRole[];
  };
  fit: {
    metaLine: string;
    heading: string;
    imageAlt: string;
    points: LeadItem[];
  };
  outcomes: {
    heading: string;
    items: LeadItem[];
  };
  contact: {
    heading: string;
    body: string;
    note: string;
  };
  footer: {
    description: string;
    productTitle: string;
    contactTitle: string;
    whatsappLabel: string;
    rights: string;
    madeFor: string;
  };
  mock: {
    restaurantName: string;
    tableLabel: string;
    menuCategories: string[];
    items: { name: string; price: string }[];
    addLabel: string;
    viewCart: string;
    cartCount: string;
    currency: string;
    kitchenTitle: string;
    statusNew: string;
    statusPreparing: string;
    statusReady: string;
    minutesShort: string;
    waiterTitle: string;
    tableShort: string;
    statusEmpty: string;
    statusOrdering: string;
    statusServed: string;
    readyBanner: string;
    adminTitle: string;
    adminNav: string[];
    ordersToday: string;
    activeTables: string;
    popularItems: string;
    cashCollected: string;
  };
}

const en: MarketingCopy = {
  meta: {
    skipToContent: 'Skip to content',
  },
  nav: {
    problem: 'The problem',
    how: 'How it works',
    product: 'The screens',
    contact: 'Contact',
  },
  cta: {
    startFreeTrial: 'Start free trial',
    seeHowItWorks: 'See how it works',
    whatsappMessage: 'I want to start a Tawlax free trial',
  },
  hero: {
    headline: 'Run your restaurant in real time.',
    sub: 'Tawlax moves orders from the table to the kitchen the second they’re placed. Customers order by QR or NFC from their seat, waiters know what’s ready, and you see the whole floor — live.',
    proof: ['QR & NFC ordering', 'No app to install', 'Cash-first', 'العربية + English'],
  },
  live: {
    logLine: 'FRIDAY SERVICE · 21:05',
    liveWord: 'LIVE',
    tableTag: 'TABLE 12',
    kitchenTag: 'KITCHEN',
    waiterTag: 'WAITER',
    customerRole: 'CUSTOMER’S PHONE',
    kitchenRole: 'KITCHEN DISPLAY',
    waiterRole: 'WAITER’S SCREEN',
    orderLines: [
      { qty: 2, name: 'Mixed grill' },
      { qty: 1, name: 'Lemon mint' },
    ],
    note: '“extra spicy”',
    totalLabel: 'Total',
    total: '395 EGP',
    phases: [
      {
        key: 'placed',
        time: '21:05:02',
        label: 'Placed',
        customerLine: 'Order sent from the table',
        kitchenStatus: 'NEW',
        waiterLine: 'Table 12 is ordering',
      },
      {
        key: 'preparing',
        time: '21:05:41',
        label: 'Preparing',
        customerLine: 'In the kitchen',
        kitchenStatus: 'PREPARING',
        waiterLine: 'Table 12 waiting on kitchen',
      },
      {
        key: 'ready',
        time: '21:18:24',
        label: 'Ready',
        customerLine: 'Ready — on its way',
        kitchenStatus: 'READY',
        waiterLine: 'Serve table 12 now',
      },
      {
        key: 'paid',
        time: '21:47:10',
        label: 'Paid',
        customerLine: 'Paid in cash — thank you',
        kitchenStatus: 'DONE',
        waiterLine: 'Cash recorded · table free',
      },
    ],
    caption: 'One order, exactly as the system moves it. No screenshots — this is the flow.',
  },
  problem: {
    metaLine: 'FRIDAY · 21:00 · FULL HOUSE',
    heading: 'The rush is where restaurants lose money.',
    imageAlt: 'A waiter carries a loaded tray through a crowded dining room on a busy night.',
    items: [
      {
        lead: 'Ten minutes to order.',
        body: 'A full table waits for a waiter with a notepad. The first impression becomes the wait — while the kitchen sits idle.',
      },
      {
        lead: 'Orders arrive secondhand.',
        body: 'Handwriting, shouting, memory. Somewhere between the floor and the pass, “no onions” disappears.',
      },
      {
        lead: 'Wrong dishes cost twice.',
        body: 'The plate comes back, the replacement jumps the queue, and the next table waits longer.',
      },
      {
        lead: 'Slow tables, lost covers.',
        body: 'Every minute spent waiting to order is a minute the table isn’t turning — while the queue at the door gives up.',
      },
    ],
    closer: 'None of this is a staff problem. It’s a system problem.',
  },
  cinematic: {
    kicker: 'FRIDAY · 21:07 · PEAK SERVICE',
    line: 'This is the moment Tawlax was built for.',
    imageAlt: 'A busy restaurant dining room during the Friday-night dinner rush.',
  },
  timeline: {
    metaLine: 'ORDER #347 · TABLE 12',
    heading: 'Follow one order through Tawlax.',
    steps: [
      {
        time: '21:04:37',
        title: 'Scan',
        body: 'The customer scans the QR code on table 12. The menu opens in the browser — no app, no sign-up. Tawlax already knows the table.',
      },
      {
        time: '21:05:02',
        title: 'Order',
        body: 'Two mains, a drink, one note: “extra spicy.” The order goes in exactly as the customer typed it.',
      },
      {
        time: '21:05:02',
        title: 'On the board',
        body: 'The same second, the ticket is on the kitchen display — items, quantities, and the note.',
      },
      {
        time: '21:18:24',
        title: 'Ready',
        body: 'The kitchen taps ready. The waiter’s screen pings: serve table 12.',
      },
      {
        time: '21:20:51',
        title: 'Served',
        body: 'Dishes on the table. The customer watched every status change from their phone instead of asking.',
      },
      {
        time: '21:47:10',
        title: 'Paid',
        body: 'The waiter records the cash payment. Table 12 shows free, and the next party sits down.',
      },
    ],
  },
  surfaces: {
    heading: 'Four screens run the whole service.',
    roles: [
      {
        tag: 'CUSTOMER',
        title: 'Ordering from the seat',
        lines: [
          'The menu opens in the browser, in Arabic or English.',
          'Photos, prices, and item notes — sent without waving anyone down.',
          'Order status live on their phone: placed, preparing, ready.',
        ],
      },
      {
        tag: 'KITCHEN',
        title: 'A board instead of paper',
        lines: [
          'Every ticket appears the second it’s placed.',
          'Items, quantities, and customer notes — readable across the line.',
          'One tap moves it along: new, preparing, ready.',
        ],
      },
      {
        tag: 'WAITER',
        title: 'Know before they wave',
        lines: [
          'Every table’s state on one screen.',
          'A ping the moment dishes are ready to go out.',
          'Record cash and free the table in two taps.',
        ],
      },
      {
        tag: 'OWNER',
        title: 'The floor in one view',
        lines: [
          'Edit the menu and prices — changes go live immediately.',
          'Tables, staff roles, and permissions in one place.',
          'Tonight’s orders and what’s selling, as it happens.',
        ],
      },
    ],
  },
  fit: {
    metaLine: 'EGYPT · MENA',
    heading: 'Built for service here, not adapted to it.',
    imageAlt:
      'An Egyptian-Levantine dinner spread — grilled platter, mezze, fresh bread, and lemon-mint — set on a dark table under warm evening light.',
    points: [
      {
        lead: 'Cash first.',
        body: 'Cash at the table is the primary flow, recorded properly. Online payment can come later.',
      },
      {
        lead: 'No app to install.',
        body: 'Customers order in the browser. Nothing to download, nothing to teach.',
      },
      {
        lead: 'Any format.',
        body: 'Cafés, mid-sized restaurants, premium dining, multi-branch chains.',
      },
      {
        lead: 'Made for the rush.',
        body: 'The kitchen board and waiter screens are built for the busiest two hours of the night.',
      },
      {
        lead: 'One shift to learn.',
        body: 'If your staff can use WhatsApp, they can use Tawlax.',
      },
    ],
  },
  outcomes: {
    heading: 'What changes in week one.',
    items: [
      {
        lead: 'Ordering starts at seating.',
        body: 'Not when a waiter becomes free.',
      },
      {
        lead: 'The kitchen reads the customer’s words.',
        body: 'Not a retelling of them.',
      },
      {
        lead: 'Tables turn on food speed.',
        body: 'Not on waiting to order and waiting to pay.',
      },
      {
        lead: 'You see tonight, tonight.',
        body: 'Orders, tables, and cash — live, not tomorrow morning.',
      },
    ],
  },
  contact: {
    heading: 'Put your restaurant on Tawlax.',
    body: 'Message us on WhatsApp. We set up your menu, tables, and staff with you — your first live order can happen this week.',
    note: 'No pricing tables. No long contracts.',
  },
  footer: {
    description:
      'Tawlax is a real-time Restaurant Operating System: QR and NFC ordering at the table, a live kitchen board, waiter coordination, and the owner’s view of the whole floor. Built for Egypt and MENA.',
    productTitle: 'Product',
    contactTitle: 'Contact',
    whatsappLabel: 'WhatsApp',
    rights: 'All rights reserved.',
    madeFor: 'Built for restaurants in Egypt & MENA.',
  },
  mock: {
    restaurantName: 'Nile Grill',
    tableLabel: 'Table 12',
    menuCategories: ['Grills', 'Mains', 'Drinks'],
    items: [
      { name: 'Mixed grill', price: '240' },
      { name: 'Grilled chicken', price: '120' },
      { name: 'Lemon mint', price: '35' },
    ],
    addLabel: 'Add',
    viewCart: 'View cart',
    cartCount: '2 items',
    currency: 'EGP',
    kitchenTitle: 'Kitchen board',
    statusNew: 'New',
    statusPreparing: 'Preparing',
    statusReady: 'Ready',
    minutesShort: 'min',
    waiterTitle: 'Tables',
    tableShort: 'T',
    statusEmpty: 'Empty',
    statusOrdering: 'Ordering',
    statusServed: 'Served',
    readyBanner: 'Table 12 — order ready',
    adminTitle: 'Dashboard',
    adminNav: ['Menu', 'Tables', 'Staff', 'Orders', 'Analytics'],
    ordersToday: 'Orders today',
    activeTables: 'Active tables',
    popularItems: 'Popular items',
    cashCollected: 'Cash collected',
  },
};

const ar: MarketingCopy = {
  meta: {
    skipToContent: 'تخطَّ إلى المحتوى',
  },
  nav: {
    problem: 'المشكلة',
    how: 'كيف يعمل',
    product: 'الشاشات',
    contact: 'تواصل معنا',
  },
  cta: {
    startFreeTrial: 'ابدأ تجربة مجانية',
    seeHowItWorks: 'شاهد كيف يعمل',
    whatsappMessage: 'أريد بدء تجربة مجانية مع Tawlax',
  },
  hero: {
    headline: 'أدِر مطعمك في الوقت الفعلي.',
    sub: 'ينقل Tawlax الطلب من الطاولة إلى المطبخ في اللحظة التي يُرسل فيها. يطلب العميل من مكانه عبر QR أو NFC، ويعرف النادل ما الذي جهز، وترى أنت الصالة كاملة — مباشرة.',
    proof: ['طلب عبر QR و NFC', 'بدون تطبيق', 'الكاش أولًا', 'عربي + English'],
  },
  live: {
    logLine: 'خدمة الجمعة · 21:05',
    liveWord: 'مباشر',
    tableTag: 'طاولة 12',
    kitchenTag: 'المطبخ',
    waiterTag: 'النادل',
    customerRole: 'هاتف العميل',
    kitchenRole: 'شاشة المطبخ',
    waiterRole: 'شاشة النادل',
    orderLines: [
      { qty: 2, name: 'مشاوي مشكلة' },
      { qty: 1, name: 'ليمون بالنعناع' },
    ],
    note: '«حار زيادة»',
    totalLabel: 'الإجمالي',
    total: '395 ج.م',
    phases: [
      {
        key: 'placed',
        time: '21:05:02',
        label: 'أُرسل',
        customerLine: 'أُرسل الطلب من الطاولة',
        kitchenStatus: 'جديد',
        waiterLine: 'طاولة 12 تطلب الآن',
      },
      {
        key: 'preparing',
        time: '21:05:41',
        label: 'يُحضَّر',
        customerLine: 'في المطبخ الآن',
        kitchenStatus: 'قيد التحضير',
        waiterLine: 'طاولة 12 بانتظار المطبخ',
      },
      {
        key: 'ready',
        time: '21:18:24',
        label: 'جاهز',
        customerLine: 'جاهز — في الطريق',
        kitchenStatus: 'جاهز',
        waiterLine: 'قدّم لطاولة 12 الآن',
      },
      {
        key: 'paid',
        time: '21:47:10',
        label: 'دُفع',
        customerLine: 'دُفع نقدًا — شكرًا لك',
        kitchenStatus: 'تم',
        waiterLine: 'سُجّل النقد · الطاولة شاغرة',
      },
    ],
    caption: 'طلب واحد، تمامًا كما يحرّكه النظام. هذه ليست صورًا — هذا هو التدفق.',
  },
  problem: {
    metaLine: 'الجمعة · 21:00 · كامل العدد',
    heading: 'وقت الذروة هو حيث تخسر المطاعم.',
    imageAlt: 'نادل يحمل صينية ممتلئة وسط صالة مزدحمة في ليلة ذروة.',
    items: [
      {
        lead: 'عشر دقائق ليطلبوا.',
        body: 'طاولة كاملة تنتظر نادلًا بدفتر. يصبح الانتظار هو الانطباع الأول — بينما المطبخ واقف بلا عمل.',
      },
      {
        lead: 'الطلبات تصل منقولة.',
        body: 'خط يد، ونداء، وذاكرة. في مكان ما بين الصالة والمطبخ تختفي «بدون بصل».',
      },
      {
        lead: 'الطبق الخاطئ يكلّف مرتين.',
        body: 'يعود الطبق، ويقفز البديل فوق الدور، وتنتظر الطاولة المجاورة أكثر.',
      },
      {
        lead: 'طاولات بطيئة، زبائن ضائعون.',
        body: 'كل دقيقة تمضي في انتظار الطلب دقيقة لا تدور فيها الطاولة — بينما طابور الباب ينصرف.',
      },
    ],
    closer: 'لا شيء من هذا خطأ الموظفين. إنها مشكلة نظام.',
  },
  cinematic: {
    kicker: 'الجمعة · 21:07 · ذروة الخدمة',
    line: 'هذه هي اللحظة التي بُني Tawlax من أجلها.',
    imageAlt: 'صالة مطعم مزدحمة أثناء ذروة عشاء ليلة الجمعة.',
  },
  timeline: {
    metaLine: 'طلب #347 · طاولة 12',
    heading: 'تابع طلبًا واحدًا عبر Tawlax.',
    steps: [
      {
        time: '21:04:37',
        title: 'مسح',
        body: 'يمسح العميل رمز QR على طاولة 12، فتفتح القائمة في المتصفح — لا تطبيق ولا تسجيل. يعرف Tawlax الطاولة تلقائيًا.',
      },
      {
        time: '21:05:02',
        title: 'طلب',
        body: 'طبقان رئيسيان ومشروب وملاحظة واحدة: «حار زيادة». يدخل الطلب تمامًا كما كتبه العميل.',
      },
      {
        time: '21:05:02',
        title: 'على اللوحة',
        body: 'في الثانية نفسها، التذكرة على شاشة المطبخ — الأصناف والكميات والملاحظة.',
      },
      {
        time: '21:18:24',
        title: 'جاهز',
        body: 'يضغط المطبخ «جاهز»، فترنّ شاشة النادل: قدّم لطاولة 12.',
      },
      {
        time: '21:20:51',
        title: 'قُدّم',
        body: 'الأطباق على الطاولة. تابع العميل كل تغيّر في الحالة من هاتفه بدل أن يسأل.',
      },
      {
        time: '21:47:10',
        title: 'دُفع',
        body: 'يسجّل النادل الدفع النقدي، فتظهر طاولة 12 شاغرة ويجلس الضيوف التالون.',
      },
    ],
  },
  surfaces: {
    heading: 'أربع شاشات تدير الخدمة كلها.',
    roles: [
      {
        tag: 'العميل',
        title: 'الطلب من المقعد',
        lines: [
          'تفتح القائمة في المتصفح، بالعربية أو الإنجليزية.',
          'صور وأسعار وملاحظات — تُرسل دون التلويح لأحد.',
          'حالة الطلب حيّة على هاتفه: أُرسل، يُحضَّر، جاهز.',
        ],
      },
      {
        tag: 'المطبخ',
        title: 'لوحة بدل الورق',
        lines: [
          'كل تذكرة تظهر في ثانية إرسالها.',
          'الأصناف والكميات وملاحظات العميل — مقروءة من بُعد.',
          'لمسة واحدة تنقلها: جديد، قيد التحضير، جاهز.',
        ],
      },
      {
        tag: 'النادل',
        title: 'يعرف قبل أن يلوّحوا',
        lines: [
          'حالة كل طاولة على شاشة واحدة.',
          'تنبيه لحظة جاهزية الأطباق للخروج.',
          'تسجيل النقد وتحرير الطاولة بلمستين.',
        ],
      },
      {
        tag: 'المالك',
        title: 'الصالة كلها في نظرة',
        lines: [
          'عدّل القائمة والأسعار — التغييرات حيّة فورًا.',
          'الطاولات والموظفون والصلاحيات في مكان واحد.',
          'طلبات الليلة والأصناف الرائجة، لحظة بلحظة.',
        ],
      },
    ],
  },
  fit: {
    metaLine: 'مصر · المنطقة',
    heading: 'مبني للخدمة هنا، لا مُكيَّف لها.',
    imageAlt: 'سفرة عشاء مصرية شامية — مشاوي ومقبلات وخبز طازج وليمون بالنعناع — على طاولة داكنة تحت إضاءة دافئة.',
    points: [
      {
        lead: 'الكاش أولًا.',
        body: 'الدفع النقدي عند الطاولة هو المسار الأساسي، ويُسجَّل كما يجب. الدفع الإلكتروني يأتي لاحقًا.',
      },
      {
        lead: 'لا تطبيق يُثبَّت.',
        body: 'يطلب العملاء من المتصفح. لا شيء يُنزَّل، ولا شيء يحتاج شرحًا.',
      },
      {
        lead: 'أي صيغة.',
        body: 'كافيهات، مطاعم متوسطة، مطاعم راقية، سلاسل متعددة الفروع.',
      },
      {
        lead: 'مصنوع للذروة.',
        body: 'لوحة المطبخ وشاشات النُدُل مبنية لأكثر ساعتين ازدحامًا في الليلة.',
      },
      {
        lead: 'وردية واحدة للتعلّم.',
        body: 'إن كان موظفوك يستخدمون واتساب، فسيستخدمون Tawlax.',
      },
    ],
  },
  outcomes: {
    heading: 'ما الذي يتغير في الأسبوع الأول.',
    items: [
      {
        lead: 'الطلب يبدأ عند الجلوس.',
        body: 'لا عندما يتفرّغ نادل.',
      },
      {
        lead: 'المطبخ يقرأ كلمات العميل.',
        body: 'لا رواية عنها.',
      },
      {
        lead: 'الطاولات تدور بسرعة المطبخ.',
        body: 'لا بسرعة انتظار الطلب وانتظار الحساب.',
      },
      {
        lead: 'ترى الليلة، الليلةَ نفسها.',
        body: 'الطلبات والطاولات والنقد — مباشرة، لا صباح الغد.',
      },
    ],
  },
  contact: {
    heading: 'ضع مطعمك على Tawlax.',
    body: 'راسلنا على واتساب. نجهّز معك القائمة والطاولات والموظفين — وقد يصل أول طلب حيّ هذا الأسبوع.',
    note: 'لا جداول أسعار. لا عقود طويلة.',
  },
  footer: {
    description:
      'Tawlax نظام تشغيل مطاعم يعمل في الوقت الفعلي: طلب من الطاولة عبر QR وNFC، ولوحة مطبخ حيّة، وتنسيق للنُدُل، ونظرة المالك على الصالة كاملة. مبني لمصر والمنطقة.',
    productTitle: 'المنتج',
    contactTitle: 'تواصل معنا',
    whatsappLabel: 'واتساب',
    rights: 'جميع الحقوق محفوظة.',
    madeFor: 'صُنع لمطاعم مصر والمنطقة.',
  },
  mock: {
    restaurantName: 'مشويات النيل',
    tableLabel: 'طاولة 12',
    menuCategories: ['مشويات', 'أطباق رئيسية', 'مشروبات'],
    items: [
      { name: 'مشاوي مشكلة', price: '240' },
      { name: 'فراخ مشوية', price: '120' },
      { name: 'ليمون بالنعناع', price: '35' },
    ],
    addLabel: 'أضف',
    viewCart: 'عرض السلة',
    cartCount: 'صنفان',
    currency: 'ج.م',
    kitchenTitle: 'لوحة المطبخ',
    statusNew: 'جديد',
    statusPreparing: 'قيد التحضير',
    statusReady: 'جاهز',
    minutesShort: 'د',
    waiterTitle: 'الطاولات',
    tableShort: 'ط',
    statusEmpty: 'فارغة',
    statusOrdering: 'تطلب',
    statusServed: 'تم التقديم',
    readyBanner: 'طاولة 12 — الطلب جاهز',
    adminTitle: 'لوحة التحكم',
    adminNav: ['القائمة', 'الطاولات', 'الموظفون', 'الطلبات', 'التحليلات'],
    ordersToday: 'طلبات اليوم',
    activeTables: 'طاولات نشطة',
    popularItems: 'الأصناف الأكثر طلبًا',
    cashCollected: 'النقد المحصَّل',
  },
};

const COPY: Record<Language, MarketingCopy> = { en, ar };

export function getCopy(language: Language): MarketingCopy {
  return COPY[language];
}
