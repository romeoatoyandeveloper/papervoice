import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

const BAR_COUNT = 28;
const PERIOD_MS = 1000;

// Static bar heights from the prototype.
const HEIGHTS = Array.from(
  { length: BAR_COUNT },
  (_, i) => 14 + Math.round(Math.sin(i * 0.7) * 8 + Math.abs(Math.sin(i * 1.9)) * 6),
);

interface Props {
  /** 0–1 playback progress; bars before it are tinted as "played" */
  progress: number;
  playing: boolean;
}

/**
 * Animated placeholder waveform. Every bar pulses `scaleY 0.4 → 1 → 0.4`
 * (`pv-wave`, 1s ease-in-out) with a staggered phase, pausing with playback.
 */
export function Waveform({ progress, playing }: Props) {
  const clock = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!playing) {
      clock.stopAnimation();
      return;
    }
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    // Finish the current cycle from wherever it was paused, then loop.
    clock.stopAnimation((value) => {
      const remaining = Animated.timing(clock, {
        toValue: 1,
        duration: Math.max(0, (1 - value) * PERIOD_MS),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      remaining.start(({ finished }) => {
        if (!finished || cancelled) return;
        clock.setValue(0);
        loop = Animated.loop(
          Animated.timing(clock, { toValue: 1, duration: PERIOD_MS, easing: Easing.linear, useNativeDriver: true }),
        );
        loop.start();
      });
    });
    return () => {
      cancelled = true;
      loop?.stop();
      clock.stopAnimation();
    };
  }, [playing, clock]);

  const scales = useMemo(
    () =>
      HEIGHTS.map((_, i) => {
        // Bar i runs (i % 7) * 0.1s behind the clock.
        const delay = ((i % 7) * 100) / PERIOD_MS;
        const phase = Animated.modulo(Animated.add(clock, 1 - delay), 1);
        // 0.4 → 1 → 0.4 with ease-in-out on each half (sampled cosine).
        return phase.interpolate({
          inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
          outputRange: [0.4, 0.488, 0.7, 0.912, 1, 0.912, 0.7, 0.488, 0.4],
        });
      }),
    [clock],
  );

  const played = Math.round(Math.min(1, Math.max(0, progress)) * BAR_COUNT);

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {HEIGHTS.map((h, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height: h,
              backgroundColor: i < played ? colors.accent2_500 : colors.neutral300,
              transform: [{ scaleY: scales[i] }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 36,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
});
