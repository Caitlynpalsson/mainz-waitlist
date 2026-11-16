import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { PHOTO_RULES, assessPhoto } from '../../../api/src/photoQuality';
import { blurVariance } from './blurCheck';

export type PreparedPhoto =
  | { ok: true; dataUrl: string; width: number; height: number; byteSize: number }
  | { ok: false; reason: string };

export async function prepareFarmerPhoto(): Promise<PreparedPhoto> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'photo access is off. stock photo kept.' };
  }
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (picked.canceled || !picked.assets[0]) return { ok: false, reason: '' };
  const asset = picked.assets[0];
  let byteSize = asset.fileSize || 0;
  if (!byteSize) {
    try {
      const response = await fetch(asset.uri);
      byteSize = (await response.blob()).size;
    } catch {
      return { ok: false, reason: 'could not read the photo size. stock photo kept.' };
    }
  }
  const check = assessPhoto({ width: asset.width, height: asset.height, byteSize });
  if (!check.ok) return { ok: false, reason: check.reason };
  const blur = await blurVariance(asset.uri);
  if (blur !== null && blur < PHOTO_RULES.blurVarianceMin) {
    return { ok: false, reason: 'looks blurry. stock photo kept.' };
  }
  const long = Math.max(asset.width, asset.height);
  const actions = long > 1400
    ? [asset.width >= asset.height ? { resize: { width: 1400 } } : { resize: { height: 1400 } }]
    : [];
  const saved = await manipulateAsync(asset.uri, actions, {
    compress: 0.75,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!saved.base64) return { ok: false, reason: 'could not prepare the photo. stock photo kept.' };
  const dataUrl = `data:image/jpeg;base64,${saved.base64}`;
  if (dataUrl.length > PHOTO_RULES.maxStoredChars) {
    return { ok: false, reason: 'that photo is too heavy to store in this preview. stock photo kept.' };
  }
  return { ok: true, dataUrl, width: asset.width, height: asset.height, byteSize };
}
