export type ThemeId = 
  | 'royal-purple'
  | 'emerald-green'
  | 'midnight-navy'
  | 'crimson-ruby'
  | 'slate-onyx'
  | 'amber-bronze';

export interface AppTheme {
  id: ThemeId;
  name: string;
  tagline: string;
  colorSwatch: string; // Tailwind bg for swatch preview
  headerGradient: string;
  headerBorder: string;
  headerBadgeBg: string;
  headerBadgeBorder: string;
  headerAccentText: string;
  subText: string;
  bodyBg: string;
  bottomNavActive: string;
  bottomNavIndicator: string;
  bottomNavIcon: string;
  primaryBtn: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentCardBg: string;
  themeColorMeta: string;
  // Card & Bar Saldo theme properties
  cardGradient: string;
  cardBorder: string;
  cardSubText: string;
  cardAccent: string;
  cardPillBg: string;
  cardPillBorder: string;
  cardProgressBar: string;
  cardInnerBoxBg: string;
  cardInnerBoxBorder: string;
}

export const AVAILABLE_THEMES: AppTheme[] = [
  {
    id: 'royal-purple',
    name: 'Ungu Kerajaan',
    tagline: 'Wibawa & Elegan',
    colorSwatch: 'bg-purple-700',
    headerGradient: 'bg-gradient-to-r from-[#340d57] via-[#4e157d] to-[#340d57]',
    headerBorder: 'border-purple-900/80',
    headerBadgeBg: 'bg-purple-900/90',
    headerBadgeBorder: 'border-purple-400/50',
    headerAccentText: 'text-amber-300',
    subText: 'text-purple-200',
    bodyBg: 'bg-[#f4f2f9]',
    bottomNavActive: 'text-purple-900',
    bottomNavIndicator: 'bg-purple-600',
    bottomNavIcon: 'text-purple-700',
    primaryBtn: 'bg-purple-700 hover:bg-purple-800 text-white',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    badgeText: 'text-purple-950',
    accentCardBg: 'bg-gradient-to-r from-purple-50 to-indigo-50/60 border-purple-200/80',
    themeColorMeta: '#340d57',
    cardGradient: 'bg-gradient-to-br from-[#2b0f4a] via-[#4d1663] to-[#781e5d]',
    cardBorder: 'border-purple-900/40',
    cardSubText: 'text-purple-200',
    cardAccent: 'text-amber-300',
    cardPillBg: 'bg-white/15',
    cardPillBorder: 'border-white/25',
    cardProgressBar: 'bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400',
    cardInnerBoxBg: 'bg-black/25',
    cardInnerBoxBorder: 'border-white/20',
  },
  {
    id: 'emerald-green',
    name: 'Hijau Siskamling',
    tagline: 'Sejuk, Rukun & Sejahtera',
    colorSwatch: 'bg-emerald-600',
    headerGradient: 'bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#064e3b]',
    headerBorder: 'border-emerald-900/80',
    headerBadgeBg: 'bg-emerald-900/90',
    headerBadgeBorder: 'border-emerald-400/50',
    headerAccentText: 'text-amber-300',
    subText: 'text-emerald-200',
    bodyBg: 'bg-[#f0fdf4]',
    bottomNavActive: 'text-emerald-900',
    bottomNavIndicator: 'bg-emerald-600',
    bottomNavIcon: 'text-emerald-700',
    primaryBtn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-950',
    accentCardBg: 'bg-gradient-to-r from-emerald-50 to-teal-50/60 border-emerald-200/80',
    themeColorMeta: '#064e3b',
    cardGradient: 'bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#065f46]',
    cardBorder: 'border-emerald-900/40',
    cardSubText: 'text-emerald-100',
    cardAccent: 'text-amber-300',
    cardPillBg: 'bg-emerald-950/35',
    cardPillBorder: 'border-emerald-300/30',
    cardProgressBar: 'bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300',
    cardInnerBoxBg: 'bg-black/25',
    cardInnerBoxBorder: 'border-emerald-400/20',
  },
  {
    id: 'midnight-navy',
    name: 'Biru Samudra',
    tagline: 'Tenang, Aman & Tangguh',
    colorSwatch: 'bg-blue-700',
    headerGradient: 'bg-gradient-to-r from-[#0c2340] via-[#1e3a8a] to-[#0c2340]',
    headerBorder: 'border-blue-900/80',
    headerBadgeBg: 'bg-blue-950/90',
    headerBadgeBorder: 'border-blue-400/50',
    headerAccentText: 'text-amber-300',
    subText: 'text-blue-200',
    bodyBg: 'bg-[#f0f9ff]',
    bottomNavActive: 'text-blue-950',
    bottomNavIndicator: 'bg-blue-600',
    bottomNavIcon: 'text-blue-700',
    primaryBtn: 'bg-blue-700 hover:bg-blue-800 text-white',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-950',
    accentCardBg: 'bg-gradient-to-r from-blue-50 to-indigo-50/60 border-blue-200/80',
    themeColorMeta: '#0c2340',
    cardGradient: 'bg-gradient-to-br from-[#0a192f] via-[#112240] to-[#1d3557]',
    cardBorder: 'border-blue-900/40',
    cardSubText: 'text-blue-100',
    cardAccent: 'text-amber-300',
    cardPillBg: 'bg-blue-950/40',
    cardPillBorder: 'border-blue-300/30',
    cardProgressBar: 'bg-gradient-to-r from-sky-300 via-amber-300 to-emerald-400',
    cardInnerBoxBg: 'bg-black/25',
    cardInnerBoxBorder: 'border-blue-300/20',
  },
  {
    id: 'crimson-ruby',
    name: 'Merah Marun Guyub',
    tagline: 'Semangat & Gotong Royong',
    colorSwatch: 'bg-rose-800',
    headerGradient: 'bg-gradient-to-r from-[#4a0410] via-[#881337] to-[#4a0410]',
    headerBorder: 'border-rose-950/80',
    headerBadgeBg: 'bg-rose-950/90',
    headerBadgeBorder: 'border-rose-400/50',
    headerAccentText: 'text-amber-300',
    subText: 'text-rose-200',
    bodyBg: 'bg-[#fff1f2]',
    bottomNavActive: 'text-rose-950',
    bottomNavIndicator: 'bg-rose-600',
    bottomNavIcon: 'text-rose-700',
    primaryBtn: 'bg-rose-700 hover:bg-rose-800 text-white',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    badgeText: 'text-rose-950',
    accentCardBg: 'bg-gradient-to-r from-rose-50 to-amber-50/60 border-rose-200/80',
    themeColorMeta: '#4a0410',
    cardGradient: 'bg-gradient-to-br from-[#4c0519] via-[#881337] to-[#9f1239]',
    cardBorder: 'border-rose-950/40',
    cardSubText: 'text-rose-100',
    cardAccent: 'text-amber-300',
    cardPillBg: 'bg-rose-950/40',
    cardPillBorder: 'border-rose-300/30',
    cardProgressBar: 'bg-gradient-to-r from-amber-300 via-rose-300 to-orange-300',
    cardInnerBoxBg: 'bg-black/25',
    cardInnerBoxBorder: 'border-rose-300/20',
  },
  {
    id: 'slate-onyx',
    name: 'Onyx Minimalis',
    tagline: 'Modern & Kontras Tinggi',
    colorSwatch: 'bg-zinc-800',
    headerGradient: 'bg-gradient-to-r from-[#18181b] via-[#27272a] to-[#18181b]',
    headerBorder: 'border-zinc-800/80',
    headerBadgeBg: 'bg-zinc-900/90',
    headerBadgeBorder: 'border-zinc-500/50',
    headerAccentText: 'text-amber-300',
    subText: 'text-zinc-300',
    bodyBg: 'bg-[#f8fafc]',
    bottomNavActive: 'text-zinc-950',
    bottomNavIndicator: 'bg-zinc-800',
    bottomNavIcon: 'text-zinc-700',
    primaryBtn: 'bg-zinc-800 hover:bg-zinc-900 text-white',
    badgeBg: 'bg-zinc-100',
    badgeBorder: 'border-zinc-300',
    badgeText: 'text-zinc-900',
    accentCardBg: 'bg-gradient-to-r from-zinc-100 to-stone-100 border-zinc-300',
    themeColorMeta: '#18181b',
    cardGradient: 'bg-gradient-to-br from-[#18181b] via-[#27272a] to-[#3f3f46]',
    cardBorder: 'border-zinc-800/60',
    cardSubText: 'text-zinc-300',
    cardAccent: 'text-amber-300',
    cardPillBg: 'bg-zinc-900/60',
    cardPillBorder: 'border-zinc-500/40',
    cardProgressBar: 'bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400',
    cardInnerBoxBg: 'bg-black/35',
    cardInnerBoxBorder: 'border-zinc-600/30',
  },
  {
    id: 'amber-bronze',
    name: 'Kuningan Emas',
    tagline: 'Hangat & Klasik Tradisional',
    colorSwatch: 'bg-amber-700',
    headerGradient: 'bg-gradient-to-r from-[#451a03] via-[#78350f] to-[#451a03]',
    headerBorder: 'border-amber-950/80',
    headerBadgeBg: 'bg-amber-950/90',
    headerBadgeBorder: 'border-amber-400/50',
    headerAccentText: 'text-amber-200',
    subText: 'text-amber-200',
    bodyBg: 'bg-[#fffbeb]',
    bottomNavActive: 'text-amber-950',
    bottomNavIndicator: 'bg-amber-600',
    bottomNavIcon: 'text-amber-700',
    primaryBtn: 'bg-amber-800 hover:bg-amber-900 text-white',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-950',
    accentCardBg: 'bg-gradient-to-r from-amber-50 to-orange-50/60 border-amber-200/80',
    themeColorMeta: '#451a03',
    cardGradient: 'bg-gradient-to-br from-[#451a03] via-[#78350f] to-[#92400e]',
    cardBorder: 'border-amber-950/40',
    cardSubText: 'text-amber-100',
    cardAccent: 'text-amber-200',
    cardPillBg: 'bg-amber-950/40',
    cardPillBorder: 'border-amber-300/30',
    cardProgressBar: 'bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-400',
    cardInnerBoxBg: 'bg-black/25',
    cardInnerBoxBorder: 'border-amber-300/20',
  },
];

export const THEME_STORAGE_KEYS = {
  MODE: 'jimpitan_theme_mode', // 'auto' | ThemeId
  LAST_INDEX: 'jimpitan_last_theme_index',
};

/**
 * Initializes and retrieves the current theme on application startup.
 * If mode is 'auto', it rotates to the next available theme automatically.
 */
export const initializeAppTheme = (): { theme: AppTheme; isAutoRotate: boolean } => {
  if (typeof window === 'undefined') {
    return { theme: AVAILABLE_THEMES[0], isAutoRotate: true };
  }

  try {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEYS.MODE) || 'auto';

    // If specific theme is selected manually
    if (savedMode !== 'auto') {
      const found = AVAILABLE_THEMES.find((t) => t.id === savedMode);
      if (found) {
        updateMetaThemeColor(found.themeColorMeta);
        return { theme: found, isAutoRotate: false };
      }
    }

    // Auto-rotation mode: cycle to next theme each time app loads
    const lastIndexStr = localStorage.getItem(THEME_STORAGE_KEYS.LAST_INDEX);
    let nextIndex = 0;
    if (lastIndexStr !== null) {
      const lastIndex = parseInt(lastIndexStr, 10);
      if (!isNaN(lastIndex)) {
        nextIndex = (lastIndex + 1) % AVAILABLE_THEMES.length;
      }
    }

    localStorage.setItem(THEME_STORAGE_KEYS.LAST_INDEX, nextIndex.toString());
    const selectedTheme = AVAILABLE_THEMES[nextIndex] || AVAILABLE_THEMES[0];
    updateMetaThemeColor(selectedTheme.themeColorMeta);
    return { theme: selectedTheme, isAutoRotate: true };
  } catch (err) {
    console.error('Error initializing theme:', err);
    return { theme: AVAILABLE_THEMES[0], isAutoRotate: true };
  }
};

/**
 * Updates browser meta theme-color dynamically
 */
export const updateMetaThemeColor = (colorHex: string) => {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', colorHex);
  }
};
