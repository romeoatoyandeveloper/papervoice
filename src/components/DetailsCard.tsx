import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, textAlpha } from '../theme';
import { CheckIcon, CopyIcon } from './Icons';

export interface DetailRow {
  label: string;
  value: string;
  /** Text put on the clipboard; omit to make the row non-copyable */
  copyValue?: string;
  /** Accent-colored value (amount, due date) */
  emphasis?: boolean;
  /** Wider letter spacing for account numbers and codes */
  code?: boolean;
}

interface Props {
  title: string;
  icon: ReactNode;
  rows: DetailRow[];
  style?: object;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copied ? `${label} copied` : `Copy ${label}`}
      onPress={copy}
      hitSlop={6}
      style={({ pressed }) => [
        styles.copy,
        copied && { backgroundColor: colors.accent2_100 },
        pressed && !copied && { backgroundColor: colors.neutral300 },
      ]}
    >
      {copied ? <CheckIcon color={colors.accent2_700} size={13} strokeWidth={2.2} /> : <CopyIcon />}
    </Pressable>
  );
}

/** Surface card of label/value rows, with a copy button on copyable values. */
export function DetailsCard({ title, icon, rows, style }: Props) {
  if (rows.length === 0) return null;
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        {icon}
        <Text style={styles.title}>{title}</Text>
      </View>
      {rows.map((row, i) => (
        <View key={`${i}-${row.label}`} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{row.label}</Text>
            <Text
              selectable
              style={[styles.value, row.emphasis && styles.emphasis, row.code && styles.code]}
            >
              {row.value}
            </Text>
          </View>
          {row.copyValue && <CopyButton value={row.copyValue} label={row.label} />}
        </View>
      ))}
    </View>
  );
}

/** `NL91ABNA0417164300` → `NL91 ABNA 0417 1643 00` (leaves non-IBAN formats alone). */
export function formatIban(raw: string) {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(compact)) return { display: raw.trim(), copy: raw.trim() };
  return { display: compact.replace(/(.{4})/g, '$1 ').trim(), copy: compact };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: textAlpha(65),
    fontFamily: fonts.body[600],
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: textAlpha(55),
    fontFamily: fonts.body[400],
    fontSize: 12,
  },
  value: {
    color: colors.text,
    fontFamily: fonts.body[600],
    fontSize: 15,
    lineHeight: 21,
  },
  emphasis: {
    color: colors.accent700,
  },
  code: {
    letterSpacing: 0.5,
  },
  copy: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
