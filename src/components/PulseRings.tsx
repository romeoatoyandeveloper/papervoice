import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, radii } from '../theme';

const DURATION = 2200;
const STAGGER = 700;

/** Three staggered rings pulsing out from a solid accent circle (`pv-pulse`). */
export function PulseRings({ children, animated = true }: { children: ReactNode; animated?: boolean }) {
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) return;
    const loops = rings.map((value, i) => {
      value.setValue(0);
      const loop = Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      );
      const timer = setTimeout(() => loop.start(), i * STAGGER);
      return { loop, timer };
    });
    return () =>
      loops.forEach(({ loop, timer }) => {
        clearTimeout(timer);
        loop.stop();
      });
  }, [animated, rings]);

  return (
    <View style={styles.wrap}>
      {animated &&
        rings.map((value, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }) }],
              },
            ]}
          />
        ))}
      <View style={styles.core}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.accent400,
    opacity: 0,
  },
  core: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
