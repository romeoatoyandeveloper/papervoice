import { router, useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureBackdrop } from '../src/components/CaptureBackdrop';
import { AlertIcon, MicIcon } from '../src/components/Icons';
import { PillButton } from '../src/components/PillButton';
import { PulseRings } from '../src/components/PulseRings';
import { useScan } from '../src/state/ScanContext';
import { colors, fonts } from '../src/theme';

/** neutral-900 @ 60% */
const TINT = 'rgba(46, 43, 37, 0.6)';

function FadeInLabel({ text }: { text: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }).start();
  }, [text, anim]);
  return (
    <Animated.Text
      accessibilityLiveRegion="polite"
      style={[
        styles.label,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

export default function Processing() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { status, backdropUri, language, retry, reset } = useScan();

  const labels = ['Reading document...', `Translating to ${language.label}...`, 'Generating voice...'];

  useEffect(() => {
    if (status.phase === 'done') router.replace('/result');
  }, [status.phase]);

  // Leaving before the pipeline finishes (e.g. Android back) cancels it.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (e.data.action.type !== 'REPLACE') reset();
      }),
    [navigation, reset],
  );

  const retake = () => router.back();

  const failed = status.phase === 'error';
  const stage = status.phase === 'running' || status.phase === 'error' ? status.stage : 2;

  return (
    <View style={styles.screen}>
      <CaptureBackdrop uri={backdropUri} tint={TINT} blur={40} />

      <View style={styles.center}>
        {failed ? (
          <>
            <View style={styles.errorBadge}>
              <AlertIcon />
            </View>
            <Text style={styles.errorText} accessibilityLiveRegion="assertive">
              {status.error.message}
            </Text>
          </>
        ) : (
          <>
            <PulseRings>
              <MicIcon />
            </PulseRings>
            <FadeInLabel text={labels[stage]} />
          </>
        )}
      </View>

      {failed && (
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 28) }]}>
          <PillButton label="Try Again" onPress={retry} />
          <Pressable accessibilityRole="button" onPress={retake} style={styles.secondary} hitSlop={8}>
            <Text style={styles.secondaryText}>Retake</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral900,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    paddingHorizontal: 32,
  },
  label: {
    color: colors.neutral100,
    fontFamily: fonts.body[500],
    fontSize: 17,
  },
  errorBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
    marginBottom: -4,
  },
  errorText: {
    color: colors.neutral100,
    fontFamily: fonts.body[500],
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 0,
    gap: 16,
    alignItems: 'center',
  },
  secondary: {
    paddingVertical: 6,
  },
  secondaryText: {
    color: colors.neutral100,
    fontFamily: fonts.body[600],
    fontSize: 15,
  },
});
