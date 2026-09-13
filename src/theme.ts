// Organic design-system tokens (design_handoff_papervoice/_ds/.../styles.css).
// Components take every color, font, radius and shadow from here.

const text = '#201e1d';

/** `color-mix(in srgb, text N%, transparent)` */
export const textAlpha = (pct: number) => `rgba(32, 30, 29, ${pct / 100})`;

export const colors = {
  bg: '#f5ead8',
  surface: '#ebddc5',
  text,
  divider: textAlpha(16),

  accent: '#c67139',
  accent100: '#fff2eb',
  accent200: '#ffe1d0',
  accent300: '#ffc6a5',
  accent400: '#f6a06b',
  accent500: '#d67f48',
  accent600: '#b2622d',
  accent700: '#8c491a',
  accent800: '#643312',
  accent900: '#402310',

  accent2: '#7a8a5e',
  accent2_100: '#f0fae1',
  accent2_200: '#e1eecc',
  accent2_300: '#ccdbb2',
  accent2_400: '#aebf92',
  accent2_500: '#8fa073',
  accent2_600: '#728157',
  accent2_700: '#56633f',
  accent2_800: '#3d472b',
  accent2_900: '#272e1b',

  neutral100: '#f9f4ed',
  neutral200: '#eee7db',
  neutral300: '#dcd3c4',
  neutral400: '#c0b6a5',
  neutral500: '#a19786',
  neutral600: '#82796a',
  neutral700: '#645c50',
  neutral800: '#474238',
  neutral900: '#2e2b25',

  /** neutral-100 @ 88% — camera guide brackets */
  guide: 'rgba(249, 244, 237, 0.88)',
  /** Belgian license plate (regulated colors, not design-system tokens) */
  plateRed: '#a6192e',
  plateBlue: '#003399',
  plateStar: '#ffcc00',
  plateWhite: '#ffffff',
  scrim: 'rgba(0, 0, 0, 0.5)',
} as const;

/** `.tag-accent` / `.tag-accent-2` / `.tag-neutral` */
export const tags = {
  accent: { backgroundColor: colors.accent100, color: colors.accent800 },
  accent2: { backgroundColor: colors.accent2_100, color: colors.accent2_800 },
  neutral: { backgroundColor: colors.neutral100, color: colors.neutral800 },
} as const;

export type Weight = 400 | 500 | 600 | 700;

export const fonts = {
  heading: 'Caprasimo_400Regular',
  body: {
    400: 'Figtree_400Regular',
    500: 'Figtree_500Medium',
    600: 'Figtree_600SemiBold',
    700: 'Figtree_700Bold',
  } satisfies Record<Weight, string>,
  armenian: {
    400: 'NotoSansArmenian_400Regular',
    500: 'NotoSansArmenian_500Medium',
    600: 'NotoSansArmenian_600SemiBold',
    700: 'NotoSansArmenian_700Bold',
  } satisfies Record<Weight, string>,
};

export const radii = {
  sm: 8,
  md: 16,
  lg: 28,
  pill: 999,
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(46, 43, 37, 0.14)',
  md: '0 3px 10px rgba(46, 43, 37, 0.16)',
  lg: '0 12px 32px rgba(46, 43, 37, 0.22)',
  selectedGlow: '0 0 0 3px rgba(198, 113, 57, 0.18)',
} as const;

/**
 * The prototype is laid out inside a 402×874 device frame whose status bar
 * is 54pt and home indicator 34pt. Paddings in the spec include those areas,
 * so screens add only the remainder on top of the real safe-area insets.
 */
export const frame = {
  statusBar: 54,
  homeIndicator: 34,
} as const;
