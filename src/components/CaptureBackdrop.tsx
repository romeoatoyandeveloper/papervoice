import { BlurView } from 'expo-blur';
import { Image, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

interface Props {
  uri: string | null | undefined;
  /** Tint over the blurred photo: processing uses neutral-900 @ 60%, result dims it */
  tint: string;
  blur: number;
}

/** The frozen, blurred capture shown behind Processing and Result. */
export function CaptureBackdrop({ uri, tint, blur }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.neutral900 }]} pointerEvents="none">
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={2} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.neutral800 }]} />
      )}
      <BlurView intensity={blur} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
    </View>
  );
}
