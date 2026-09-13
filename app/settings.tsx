import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, type BottomSheetHandle } from '../src/components/BottomSheet';
import { CloseIcon } from '../src/components/Icons';
import { PillButton } from '../src/components/PillButton';
import { LANGUAGE, type VoiceGender } from '../src/config';
import { getVoiceSample } from '../src/services/elevenlabs';
import { friendlyError } from '../src/services/errors';
import { useSettings } from '../src/state/SettingsContext';
import { colors, fonts, radii, textAlpha } from '../src/theme';

const SAMPLE_IDLE = 'Tap to hear a sample';

function VoiceOption({
  value,
  label,
  selected,
  onSelect,
}: {
  value: VoiceGender;
  label: string;
  selected: boolean;
  onSelect: (v: VoiceGender) => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onSelect(value)}
      style={[
        styles.voice,
        selected
          ? { backgroundColor: colors.accent100, borderColor: colors.accent }
          : { backgroundColor: 'transparent', borderColor: colors.divider },
      ]}
    >
      <Text style={styles.voiceText}>{label}</Text>
    </Pressable>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { voice, setVoice } = useSettings();
  const sheet = useRef<BottomSheetHandle>(null);
  const closing = useRef(false);

  const [sampleLabel, setSampleLabel] = useState(SAMPLE_IDLE);
  const [busy, setBusy] = useState(false);
  const player = useRef<AudioPlayer | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestId = useRef(0);

  const stopSample = () => {
    requestId.current++;
    clearTimeout(resetTimer.current);
    if (player.current) {
      try {
        player.current.pause();
        player.current.release();
      } catch {}
      player.current = null;
    }
    setBusy(false);
    setSampleLabel(SAMPLE_IDLE);
  };

  useEffect(() => stopSample, []);

  // Changing voice invalidates a sample that is still playing.
  useEffect(() => {
    if (player.current || busy) stopSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    stopSample();
    sheet.current?.dismiss(() => router.back());
  };

  const playSample = async () => {
    if (busy) return stopSample();
    stopSample();
    const id = requestId.current;
    setBusy(true);
    setSampleLabel('Playing sample...');
    try {
      const file = await getVoiceSample(LANGUAGE, voice);
      if (id !== requestId.current) return;
      const p = createAudioPlayer({ uri: file.uri });
      player.current = p;
      p.addListener('playbackStatusUpdate', (s) => {
        if (id !== requestId.current) return;
        if (s.didJustFinish || s.error) stopSample();
      });
      p.play();
    } catch (e) {
      if (id !== requestId.current) return;
      if (__DEV__) console.warn('Voice sample failed', e);
      setBusy(false);
      setSampleLabel(friendlyError(e, 1).message);
      resetTimer.current = setTimeout(() => setSampleLabel(SAMPLE_IDLE), 3500);
    }
  };

  return (
    <BottomSheet ref={sheet} heightRatio={0.4} duration={300} onScrimPress={close} handlePaddingBottom={4}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          onPress={close}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.neutral300 }]}
        >
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.sectionLabel}>Voice</Text>
        <View style={styles.voices} accessibilityRole="radiogroup">
          <VoiceOption value="female" label="Female" selected={voice === 'female'} onSelect={setVoice} />
          <VoiceOption value="male" label="Male" selected={voice === 'male'} onSelect={setVoice} />
        </View>

        <PillButton
          variant="surface"
          label={sampleLabel}
          onPress={playSample}
          paddingVertical={14}
          fontSize={15}
          style={styles.sample}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 20,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    color: textAlpha(55),
    fontFamily: fonts.body[600],
    fontSize: 12,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  voices: {
    flexDirection: 'row',
    gap: 8,
  },
  voice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  voiceText: {
    color: colors.text,
    fontFamily: fonts.body[600],
    fontSize: 14,
  },
  sample: {
    marginTop: 16,
  },
});
