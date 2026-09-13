import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashIcon, GalleryIcon, GearIcon } from '../src/components/Icons';
import { PageTray } from '../src/components/PageTray';
import { LANGUAGE, languageFont } from '../src/config';
import { useScan, type Page } from '../src/state/ScanContext';
import { colors, fonts, frame, radii, textAlpha } from '../src/theme';

const BRACKET = 34;
const BRACKET_STROKE = 3;
const MAX_PAGES = 10;

export default function Camera() {
  const insets = useSafeAreaInsets();
  const scan = useScan();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Pages of the current letter (front, back, PDFs), sent together on "Explain".
  const [pages, setPages] = useState<Page[]>([]);

  // Keep the preview and torch off while the pipeline/result is on top.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const previewActive = scan.status.phase === 'idle' || focused;

  const openSettings = () => router.push('/settings');

  // Keep the tray until the letter is explained, so "Retake" can fix a single bad page.
  useEffect(() => {
    if (scan.status.phase === 'done') setPages([]);
  }, [scan.status.phase]);

  const addPages = (added: Page[]) => {
    if (added.length === 0) return;
    setNotice(pages.length + added.length > MAX_PAGES ? `Max ${MAX_PAGES} pages per letter` : null);
    setPages((current) => [...current, ...added].slice(0, MAX_PAGES));
  };

  const explain = () => {
    if (pages.length === 0) return;
    setNotice(null);
    scan.start(pages);
    router.push('/processing');
  };

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: true,
      orderedSelection: true,
      selectionLimit: Math.max(1, MAX_PAGES - pages.length),
    });
    if (result.canceled || !result.assets) return;
    addPages(
      result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', kind: 'image' as const })),
    );
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets) return;
    addPages(
      result.assets.map((a) => ({ uri: a.uri, mimeType: 'application/pdf', kind: 'pdf' as const, name: a.name })),
    );
  };

  const openLibrary = () =>
    Alert.alert('Add a letter', 'Pick photos of the letter or a PDF file.', [
      { text: 'Photos', onPress: pickPhotos },
      { text: 'PDF file', onPress: pickPdf },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const capture = async () => {
    if (capturing) return;
    if (pages.length >= MAX_PAGES) {
      setNotice(`Max ${MAX_PAGES} pages per letter`);
      return;
    }
    if (!permission?.granted || !ready || !cameraRef.current) {
      // No camera (e.g. Simulator) or no permission — fall back to the library.
      setNotice(permission?.granted ? 'Camera unavailable — pick a photo instead' : null);
      return openLibrary();
    }
    setCapturing(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.6, shutterSound: false });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      addPages([
        { uri: picture.uri, mimeType: picture.format === 'png' ? 'image/png' : 'image/jpeg', kind: 'image' },
      ]);
    } catch (e) {
      if (__DEV__) console.warn('takePictureAsync failed', e);
      setNotice("Couldn't take the photo — try again or pick one");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (58 - frame.statusBar) }]}>
      {/* top bar */}
      <View style={styles.topBar}>
        <View style={styles.langPill} accessibilityLabel={`Spoken language: ${LANGUAGE.label}`}>
          <Text style={styles.langText}>
            {LANGUAGE.flag} <Text style={languageFont()}>{LANGUAGE.native}</Text>
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={openSettings}
          style={({ pressed }) => [styles.gearButton, pressed && styles.pressedSurface]}
        >
          <GearIcon />
        </Pressable>
      </View>

      {/* viewfinder */}
      <View style={styles.viewfinder}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            active={previewActive}
            enableTorch={flash && previewActive}
            animateShutter
            onCameraReady={() => setReady(true)}
            onMountError={(e) => {
              if (__DEV__) console.warn('Camera mount error', e.message);
              setReady(false);
            }}
          />
        ) : (
          <View style={styles.permission}>
            {permission === null ? (
              <ActivityIndicator color={colors.neutral100} />
            ) : (
              <>
                <Text style={styles.permissionText}>
                  PaperVoice needs your camera to photograph letters. You can also add photos or a PDF from your phone.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                  style={({ pressed }) => [styles.permissionButton, pressed && { backgroundColor: colors.accent700 }]}
                >
                  <Text style={styles.permissionButtonText}>
                    {permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={styles.hintRow} pointerEvents="none">
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              {notice ??
                (pages.length === 0
                  ? 'Fit the letter inside the frame'
                  : 'Got it — shoot the back side or tap Explain')}
            </Text>
          </View>
        </View>

        {permission?.granted && (
          <View style={styles.guide} pointerEvents="none">
            <View style={[styles.bracket, { top: 0, left: 0, borderTopWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE, borderTopLeftRadius: 6 }]} />
            <View style={[styles.bracket, { top: 0, right: 0, borderTopWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE, borderTopRightRadius: 6 }]} />
            <View style={[styles.bracket, { bottom: 0, left: 0, borderBottomWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE, borderBottomLeftRadius: 6 }]} />
            <View style={[styles.bracket, { bottom: 0, right: 0, borderBottomWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE, borderBottomRightRadius: 6 }]} />
          </View>
        )}
      </View>

      {pages.length > 0 && (
        <PageTray
          pages={pages}
          onRemove={(index) => setPages((current) => current.filter((_, i) => i !== index))}
          onExplain={explain}
        />
      )}

      {/* bottom controls */}
      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(30, insets.bottom) },
          pages.length > 0 && { paddingTop: 14 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photos or a PDF from your phone"
          onPress={openLibrary}
          style={({ pressed }) => [styles.squareButton, pressed && styles.pressedSurface]}
        >
          <GalleryIcon />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pages.length === 0 ? 'Take photo' : 'Take photo of the next page'}
          onPress={capture}
          style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <View style={[styles.shutterInner, capturing && { backgroundColor: colors.accent700 }]} />
        </Pressable>

        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Flash"
          accessibilityState={{ checked: flash }}
          onPress={() => setFlash((f) => !f)}
          style={({ pressed }) => [styles.squareButton, pressed && styles.pressedSurface]}
        >
          <FlashIcon color={flash ? colors.accent : colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  langText: {
    color: colors.text,
    fontSize: 16,
  },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedSurface: {
    backgroundColor: colors.neutral300,
  },
  viewfinder: {
    flex: 1,
    marginTop: 4,
    marginHorizontal: 16,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.neutral900,
  },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 18,
    backgroundColor: colors.neutral800,
  },
  permissionText: {
    color: colors.neutral100,
    fontFamily: fonts.body[500],
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  permissionButtonText: {
    color: colors.bg,
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  hintRow: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hintText: {
    color: colors.neutral100,
    fontFamily: fonts.body[500],
    fontSize: 13,
  },
  guide: {
    position: 'absolute',
    top: '11%',
    left: '18%',
    width: '64%',
    height: '78%',
  },
  bracket: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
    borderColor: colors.guide,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingHorizontal: 34,
  },
  squareButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    borderWidth: 3.5,
    borderColor: textAlpha(55),
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
});
