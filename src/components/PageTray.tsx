import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Page } from '../state/ScanContext';
import { colors, fonts, radii, textAlpha } from '../theme';
import { CloseIcon, DocumentIcon } from './Icons';

interface Props {
  pages: Page[];
  onRemove: (index: number) => void;
  onExplain: () => void;
}

/** Pages collected for one letter (front, back, PDFs) plus the button that sends them off. */
export function PageTray({ pages, onRemove, onExplain }: Props) {
  return (
    <View style={styles.tray}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.thumbs}
      >
        {pages.map((page, i) => (
          <View key={`${page.uri}-${i}`} style={styles.thumbWrap}>
            {page.kind === 'image' ? (
              <Image source={{ uri: page.uri }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.pdf]}>
                <DocumentIcon size={18} color={textAlpha(65)} />
                <Text style={styles.pdfText}>PDF</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove page ${i + 1}`}
              onPress={() => onRemove(i)}
              hitSlop={8}
              style={styles.remove}
            >
              <CloseIcon color={colors.neutral100} size={8} strokeWidth={3} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={onExplain}
        style={({ pressed }) => [styles.explain, pressed && { backgroundColor: colors.accent700 }]}
      >
        <Text style={styles.explainText}>
          {pages.length === 1 ? 'Explain' : `Explain ${pages.length} pages`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginHorizontal: 16,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  thumbs: {
    gap: 10,
    paddingTop: 6,
    paddingRight: 6,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 44,
    height: 58,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  pdf: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pdfText: {
    color: textAlpha(65),
    fontFamily: fonts.body[700],
    fontSize: 9,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral900,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explain: {
    marginLeft: 'auto',
    flexShrink: 0,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  explainText: {
    color: colors.bg,
    fontFamily: fonts.heading,
    fontSize: 15,
  },
});
