/**
 * Image upload service – owner: Ali.
 *
 * The app never talks to Supabase Storage directly: the backend strips EXIF,
 * runs the face-quality check and stores the file in the private bucket.
 */
import * as ImageManipulator from 'expo-image-manipulator';

import { Platform } from 'react-native';

import { API_URL, USE_MOCK_API } from '../../constants';
import type { FaceCheck, ImageArea, SkinImage } from '../../types/api';
import { api } from '../api/client';
import { mockImage } from '../mock/mockData';

const mockImages: SkinImage[] = [];

/** DEV ONLY – used by services/mock/seed.ts for screen previews. */
export function __pushMockImage(assessmentId: string | null, uri: string, area: ImageArea = 'face'): void {
  mockImages.unshift({ ...mockImage(assessmentId, uri), area });
}

/** Downscale + JPEG-encode on device before upload (faster, less data). */
export async function prepareForUpload(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.88,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

async function toFormData(uri: string, extra: Record<string, string>): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // In the browser the picked/processed image is a blob:/data: URL – send the real bytes.
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'skin.jpg');
  } else {
    // React Native's fetch understands this file-like object.
    form.append('file', { uri, name: 'skin.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  return form;
}

/** Server returns "/api/images/..": make it absolute when the API lives on another host (native dev). */
function absolute(img: SkinImage): SkinImage {
  if (img.url && img.url.startsWith('/') && /^https?:\/\//.test(API_URL)) {
    const origin = API_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1');
    return { ...img, url: origin + img.url };
  }
  return img;
}

export const imageStorageService = {
  async upload(uri: string, assessmentId: string | null, area: ImageArea = 'face'): Promise<SkinImage> {
    const prepared = await prepareForUpload(uri);
    if (USE_MOCK_API) {
      const img = { ...mockImage(assessmentId, prepared.uri), area };
      mockImages.unshift(img);
      return img;
    }
    const extra: Record<string, string> = { area };
    if (assessmentId) extra.assessment_id = assessmentId;
    return absolute(await api.upload<SkinImage>('/images', await toFormData(prepared.uri, extra)));
  },

  /** Quality check without storing – lets the camera screen ask for a retake. */
  async check(uri: string): Promise<FaceCheck> {
    const prepared = await prepareForUpload(uri);
    if (USE_MOCK_API) {
      return { face_found: true, faces: 1, blur_score: 150, brightness: 130, face_coverage: 0.2, ok: true, reasons: [] };
    }
    return api.upload<FaceCheck>('/images/check', await toFormData(prepared.uri, {}));
  },

  async list(assessmentId?: string): Promise<SkinImage[]> {
    if (USE_MOCK_API) return assessmentId ? mockImages.filter((i) => i.assessment_id === assessmentId) : mockImages;
    return (await api.get<SkinImage[]>(assessmentId ? `/images?assessment_id=${assessmentId}` : '/images')).map(absolute);
  },

  async remove(id: string): Promise<void> {
    if (USE_MOCK_API) {
      const i = mockImages.findIndex((x) => x.id === id);
      if (i >= 0) mockImages.splice(i, 1);
      return;
    }
    await api.delete(`/images/${id}`);
  },
};
