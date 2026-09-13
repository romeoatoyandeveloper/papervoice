import { useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { router, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, type BottomSheetHandle } from '../src/components/BottomSheet';
import { CaptureBackdrop } from '../src/components/CaptureBackdrop';
import { DetailsCard, formatIban, type DetailRow } from '../src/components/DetailsCard';
import { DocumentCard } from '../src/components/DocumentCard';
import { CardIcon, CloseIcon, PauseIcon, PlayIcon, RewindIcon, SpeakerIcon } from '../src/components/Icons';
import { PillButton } from '../src/components/PillButton';
import { Waveform } from '../src/components/Waveform';
import { languageFont } from '../src/config';
import type { LetterAnalysis } from '../src/services/gemini';
import { useScan } from '../src/state/ScanContext';
import { colors, fonts, radii, textAlpha } from '../src/theme';

const normalize = (v: string) => v.replace(/[\s+/.-]/g, '').toUpperCase();

/** IBAN/recipient/BIC plus the payment reference when the Document card doesn't already show it. */
function paymentRows(a: LetterAnalysis): DetailRow[] {
  const pay = a.paymentDetails;
  if (!pay) return [];
  const rows: DetailRow[] = [];
  if (pay.recipient) rows.push({ label: 'Um vcharel', value: pay.recipient, copyValue: pay.recipient });
  if (pay.iban) {
    const iban = formatIban(pay.iban);
    rows.push({ label: 'Hashiv (IBAN)', value: iban.display, copyValue: iban.copy, code: true });
  }
  if (pay.bic) rows.push({ label: 'BIC', value: pay.bic, copyValue: pay.bic.trim(), code: true });
  const ref = pay.paymentReference?.trim();
  if (ref && !a.fields.some((f) => normalize(f.value) === normalize(ref))) {
    rows.push({ label: 'Vcharman kod', value: ref, copyValue: ref, code: true });
  }
  return rows;
}

function AudioCard({ player, languageLabel }: { player: AudioPlayer; languageLabel: string }) {
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<1 | 1.25>(1);

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const atEnd = status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.05);

  const togglePlay = async () => {
    if (status.playing) return player.pause();
    if (atEnd) await player.seekTo(0);
    player.play();
  };

  const rewind = () => player.seekTo(Math.max(0, status.currentTime - 15));

  const toggleSpeed = () => {
    const next = speed === 1 ? 1.25 : 1;
    setSpeed(next);
    player.setPlaybackRate(next, 'high');
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.speakingTag}>
          <View style={styles.speakingDot} />
          <Text style={styles.speakingText}>Speaking {languageLabel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${speed === 1 ? '1.0' : '1.25'} times. Change`}
          onPress={toggleSpeed}
          style={({ pressed }) => [styles.speedPill, pressed && { backgroundColor: colors.neutral300 }]}
        >
          <Text style={styles.speedText}>{speed === 1 ? '1.0x' : '1.25x'}</Text>
        </Pressable>
      </View>

      <Waveform progress={progress} playing={status.playing} />

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rewind 15 seconds"
          onPress={rewind}
          style={({ pressed }) => [styles.rewind, pressed && { backgroundColor: colors.neutral300 }]}
        >
          <RewindIcon />
          <Text style={styles.rewindLabel}>15</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          onPress={togglePlay}
          style={({ pressed }) => [styles.play, pressed && { backgroundColor: colors.accent700 }]}
        >
          {status.playing ? <PauseIcon /> : <PlayIcon />}
        </Pressable>
        <View style={styles.controlSpacer} />
      </View>
    </View>
  );
}

export default function Result() {
  const insets = useSafeAreaInsets();
  const { analysis, player, backdropUri, language, reset } = useScan();
  const sheet = useRef<BottomSheetHandle>(null);
  const leaving = useRef(false);
  const navigation = useNavigation();

  // Hardware back (Android) skips "Scan Another Letter" — still stop audio and reset.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (!leaving.current) reset();
      }),
    [navigation, reset],
  );

  // Nothing to show (e.g. state was reset) — go back to the camera.
  useEffect(() => {
    if (!analysis && !leaving.current) router.dismissTo('/camera');
  }, [analysis]);

  // Close (X) and "Scan Another Letter" both return to the camera.
  const backToCamera = () => {
    if (leaving.current) return;
    leaving.current = true;
    player?.pause();
    sheet.current?.dismiss(() => {
      router.dismissTo('/camera');
      reset();
    });
  };

  if (!analysis) return null;

  return (
    <View style={styles.screen}>
      {/* captured page, blurred and dimmed (brightness 0.7) */}
      <CaptureBackdrop uri={backdropUri} tint="rgba(0, 0, 0, 0.3)" blur={12} />

      <BottomSheet ref={sheet} heightRatio={0.9} duration={350}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close and go back to the camera"
            onPress={backToCamera}
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.neutral300 }]}
          >
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {player && <AudioCard player={player} languageLabel={language.label} />}

          <DocumentCard analysis={analysis} style={styles.sectionGap} />

          <DetailsCard
            title="Inchpes vcharel"
            icon={<CardIcon />}
            rows={paymentRows(analysis)}
            style={styles.sectionGap}
          />

          <View style={[styles.card, styles.transcriptCard]}>
            <View style={styles.transcriptHeader}>
              <SpeakerIcon />
              <Text style={styles.transcriptTitle}>Spoken Transcript</Text>
            </View>
            <Text selectable style={[styles.transcript, languageFont()]}>
              {analysis.spokenScript}
            </Text>
          </View>

          <View style={{ height: 14 }} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 + Math.max(20, insets.bottom) }]}>
          <PillButton label="Scan Another Letter" onPress={backToCamera} paddingVertical={16} fontSize={16} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    marginTop: -14,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 18,
  },
  card: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speakingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent2_100,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  speakingDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent2_600,
  },
  speakingText: {
    color: colors.accent2_700,
    fontFamily: fonts.body[600],
    fontSize: 12,
  },
  speedPill: {
    backgroundColor: colors.neutral100,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
  },
  speedText: {
    color: colors.text,
    fontFamily: fonts.body[600],
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  rewind: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewindLabel: {
    position: 'absolute',
    bottom: 6,
    color: colors.text,
    fontFamily: fonts.body[700],
    fontSize: 8,
  },
  play: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlSpacer: {
    width: 48,
    height: 48,
  },
  sectionGap: {
    marginTop: 16,
  },
  transcriptCard: {
    marginTop: 16,
    gap: 10,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcriptTitle: {
    color: textAlpha(65),
    fontFamily: fonts.body[600],
    fontSize: 13,
  },
  transcript: {
    color: textAlpha(88),
    fontSize: 16,
    lineHeight: 26,
  },
  footer: {
    paddingTop: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
