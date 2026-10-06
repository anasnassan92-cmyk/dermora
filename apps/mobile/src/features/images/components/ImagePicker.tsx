import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ExpoImagePicker from 'expo-image-picker';

import { Button, T } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';

interface Props {
  onPicked: (uri: string) => void;
}

/**
 * Camera with a face guide + gallery fallback.
 * The oval is a framing aid only – no on-device recognition happens here.
 * The backend's face-quality check decides whether the photo is usable.
 */
export function ImagePicker({ onPicked }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [useCamera, setUseCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return Alert.alert('Kameran behövs', 'Tillåt kameran i inställningarna, eller välj en bild från galleriet.');
    }
    setUseCamera(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (photo?.uri) onPicked(photo.uri);
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    const res = await ExpoImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (!res.canceled && res.assets[0]?.uri) onPicked(res.assets[0].uri);
  };

  if (useCamera) {
    return (
      <View>
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.faceGuide} />
          </View>
        </View>
        <T variant="small" muted center mb="md">
          Håll ansiktet i ovalen, i jämnt dagsljus, utan smink om det går. Ta bort hår från pannan.
        </T>
        <Button title="Ta bild" onPress={takePhoto} loading={busy} />
        <Button title="Välj från galleriet i stället" variant="ghost" onPress={pickFromGallery} style={styles.gap} />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.placeholder}>
        <View style={styles.faceGuideStatic} />
        <T variant="small" muted center>Ta en bild rakt framifrån i bra ljus.</T>
      </View>
      <Button title="Öppna kameran" onPress={openCamera} />
      <Button title="Välj från galleriet" variant="secondary" onPress={pickFromGallery} style={styles.gap} />
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { aspectRatio: 3 / 4, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  faceGuide: { width: '62%', aspectRatio: 3 / 4, borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderStyle: 'dashed' },
  placeholder: {
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  faceGuideStatic: { width: '55%', aspectRatio: 3 / 4, borderRadius: 999, borderWidth: 3, borderColor: colors.accent, borderStyle: 'dashed' },
  gap: { marginTop: spacing.md },
});
