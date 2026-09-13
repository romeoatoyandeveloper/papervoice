// Icons ported 1:1 from the inline SVGs in PaperVoice.dc.html.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, textAlpha } from '../theme';

type IconProps = { color?: string; size?: number };

export const CheckIcon = ({ color = colors.bg, size = 13, strokeWidth = 2 }: IconProps & { strokeWidth?: number }) => (
  <Svg width={size} height={(size * 10) / 13} viewBox="0 0 13 10" fill="none">
    <Path d="M1 5L4.5 8.5L12 1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const GearIcon = ({ color = colors.text, size = 19 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" stroke={color} strokeWidth={1.8} />
    <Path
      d="M19.4 13.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46V19.5a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-.97H4.5a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9.5a1.6 1.6 0 0 0 .97-1.46V4.5a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77v.09a1.6 1.6 0 0 0 1.46.97h.09a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.46.97Z"
      stroke={color}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  </Svg>
);

export const GalleryIcon = ({ color = colors.text }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={5} width={18} height={15} rx={2.5} stroke={color} strokeWidth={1.6} />
    <Circle cx={8.5} cy={10.5} r={1.5} fill={color} />
    <Path d="M5 17L9.5 13L13 15.5L17 11.5L21 15.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const FlashIcon = ({ color = colors.text }: IconProps) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L4 14h6l-1 8 9-12h-6l1-8Z" fill={color} stroke={color} strokeWidth={1} />
  </Svg>
);

export const MicIcon = ({ color = colors.bg }: IconProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke={color} strokeWidth={1.8} />
    <Path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const RewindIcon = ({ color = colors.text }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" fill={color} />
  </Svg>
);

export const PauseIcon = ({ color = colors.bg }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={6} y={5} width={4} height={14} rx={1} fill={color} />
    <Rect x={14} y={5} width={4} height={14} rx={1} fill={color} />
  </Svg>
);

export const PlayIcon = ({ color = colors.bg }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4.5v15l14-7.5Z" fill={color} />
  </Svg>
);

export const SpeakerIcon = ({ color = textAlpha(55) }: IconProps) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M11 5L6 9H3v6h3l5 4V5Z" fill={color} />
    <Path d="M16 9a4 4 0 0 1 0 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const CloseIcon = ({ color = colors.text, size = 14, strokeWidth = 2 }: IconProps & { strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4L20 20M20 4L4 20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const AlertIcon = ({ color = colors.bg }: IconProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 7.5v5.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Circle cx={12} cy={16.75} r={1.25} fill={color} />
  </Svg>
);

export const CopyIcon = ({ color = colors.text, size = 16 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={9} y={9} width={12} height={12} rx={2.5} stroke={color} strokeWidth={1.8} />
    <Path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const CardIcon = ({ color = textAlpha(55), size = 16 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2.5} y={5} width={19} height={14} rx={2.5} stroke={color} strokeWidth={1.8} />
    <Path d="M2.5 10h19M6.5 15h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const DocumentIcon = ({ color = textAlpha(55), size = 16 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M14 3v5h5M9 13h6M9 17h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
