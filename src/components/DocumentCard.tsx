import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { STATUS_DISPLAY, STATUS_TONE, type FieldKind } from '../documentTypes';
import type { DocumentField, LetterAnalysis } from '../services/gemini';
import { colors, fonts, radii, tags, textAlpha } from '../theme';

/** Belgian plate: white body, red border and text, blue EU strip with a star and "B". */
export function LicensePlate({ value }: { value: string }) {
  return (
    <View style={styles.plate} accessibilityLabel={`License plate ${value}`}>
      <View style={styles.plateStrip}>
        <Text style={styles.plateStar}>★</Text>
        <Text style={styles.plateCountry}>B</Text>
      </View>
      <Text style={styles.plateText}>{value}</Text>
    </View>
  );
}

const VALUE_STYLE: Record<Exclude<FieldKind, 'plate'>, TextStyle> = {
  amount: { color: colors.text, fontSize: 19 },
  refund_amount: { color: colors.accent2_700, fontSize: 19 },
  deadline: { color: colors.accent700, fontSize: 16 },
  date: { color: colors.text, fontSize: 16 },
  reference: { color: colors.text, fontSize: 14 },
  text: { color: colors.text, fontSize: 14 },
};

/** Copyable kinds: tapping the row copies the value and briefly confirms. */
const COPYABLE: FieldKind[] = ['reference', 'amount', 'refund_amount', 'plate'];

function FieldRow({ field }: { field: DocumentField }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copyable = COPYABLE.includes(field.kind);

  const copy = async () => {
    await Clipboard.setStringAsync(field.value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Pressable
      disabled={!copyable}
      onPress={copy}
      accessibilityRole={copyable ? 'button' : undefined}
      accessibilityLabel={`${field.label}: ${field.value}`}
      accessibilityHint={copyable ? 'Copies the value' : undefined}
      style={styles.row}
    >
      <Text style={styles.label}>{field.label}</Text>
      {copied ? (
        <Text style={[styles.value, styles.copied]}>Copy arvec</Text>
      ) : field.isPlate ? (
        <LicensePlate value={field.value} />
      ) : (
        <Text selectable={!copyable} style={[styles.value, VALUE_STYLE[field.kind === 'plate' ? 'text' : field.kind]]}>
          {field.value}
        </Text>
      )}
    </Pressable>
  );
}

/** "Document" card: type tag, title and the per-type label/value rows. */
export function DocumentCard({ analysis, style }: { analysis: LetterAnalysis; style?: object }) {
  const tone = tags[STATUS_TONE[analysis.statusLabel] ?? 'neutral'];
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Document</Text>
        <View style={[styles.tag, { backgroundColor: tone.backgroundColor }]}>
          <Text style={[styles.tagText, { color: tone.color }]}>{STATUS_DISPLAY[analysis.statusLabel] ?? analysis.statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.title}>{analysis.documentTitle}</Text>

      {analysis.fields.length > 0 && (
        <View style={styles.rows}>
          {analysis.fields.map((f, i) => (
            <FieldRow key={`${i}-${f.label}`} field={f} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.body[600],
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  tagText: {
    fontFamily: fonts.body[400],
    fontSize: 11,
    letterSpacing: 0.22,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.body[600],
    fontSize: 19,
    lineHeight: 25,
  },
  rows: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  label: {
    color: textAlpha(55),
    fontFamily: fonts.body[400],
    fontSize: 14,
    flexShrink: 0,
  },
  value: {
    flexShrink: 1,
    fontFamily: fonts.body[700],
    textAlign: 'right',
  },
  copied: {
    color: colors.accent2_700,
    fontSize: 14,
  },
  plate: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.plateRed,
    backgroundColor: colors.plateWhite,
  },
  plateStrip: {
    backgroundColor: colors.plateBlue,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  plateStar: {
    color: colors.plateStar,
    fontSize: 9,
    lineHeight: 10,
  },
  plateCountry: {
    color: colors.plateWhite,
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '700',
  },
  plateText: {
    color: colors.plateRed,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    fontFamily: Platform.select({ ios: 'Arial', default: 'sans-serif' }),
  },
});
