import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, radii, shadows, textAlpha } from '../theme';

export interface BottomSheetHandle {
  /** Slides the sheet down, then calls `then`. */
  dismiss: (then?: () => void) => void;
}

interface Props {
  /** Fraction of the screen height (0.9 for Result, 0.72 for Settings) */
  heightRatio: number;
  duration: number;
  /** Tap-to-dismiss scrim; omit to render no scrim */
  onScrimPress?: () => void;
  handlePaddingBottom?: number;
  children: ReactNode;
}

/** Bottom sheet with the prototype's slide-up (`pv-sheetup`) and grab handle. */
export const BottomSheet = forwardRef<BottomSheetHandle, Props>(function BottomSheet(
  { heightRatio, duration, onScrimPress, handlePaddingBottom = 6, children },
  ref,
) {
  const { height: screenHeight } = useWindowDimensions();
  const height = screenHeight * heightRatio;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [progress, duration]);

  const dismiss = useCallback(
    (then?: () => void) => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => then?.());
    },
    [progress],
  );

  useImperativeHandle(ref, () => ({ dismiss }), [dismiss]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {onScrimPress && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
          <Pressable
            accessibilityLabel="Close"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
            onPress={onScrimPress}
          />
        </Animated.View>
      )}
      <Animated.View style={[styles.sheet, { height, transform: [{ translateY }] }]}>
        <View style={styles.clip}>
          <View style={[styles.handleRow, { paddingBottom: handlePaddingBottom }]}>
            <View style={styles.handle} />
          </View>
          {children}
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    boxShadow: shadows.lg,
  },
  clip: {
    flex: 1,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: textAlpha(22),
  },
});
