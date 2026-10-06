/**
 * Image upload service – owner: Ali.
 *
 * The app never talks to Supabase Storage directly: the backend strips EXIF,
 * runs the face-quality check and stores the file in the private bucket.
 */
import * as ImageManipulator from 'expo-image-manipulator';

import { USE_MOCK_API } from '../../constants';
import type { FaceCheck, ImageArea, SkinImage } from '../../types/api';
import { api } from '../api/client';
import { mockImage } from '../mock/mockData';

const mockImages: SkinImage[] = [];

/** Downscale + JPEG-encode on device before upload (faster, less data). */
export async function prepareForUpload(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.88,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

function toFormData(uri: string, extra: Record<string, string>): FormData {
  const form = new FormData();
  // React Native's fetch understands this file-like object.
  form.append('file', { uri, name: 'skin.jpg', type: 'image/jpeg' } as unknown as Blob);
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  return form;
}

export const imageStorageService = {
  async upload(uri: string, assessmentId: string | null, area: ImageArea = 'face'): Promise<SkinImage> {
    const prepared = await prepareForUpload(uri);
    if (USE_MOCK_API) {
      const img = mockImage(assessmentId, prepared.uri);
      mockImages.unshift(img);
      return img;
    }
    const extra: Record<string, string> = { area };
    if (assessmentId) extra.assessment_id = assessmentId;
    return api.upload<SkinImage>('/images', toFormData(prepared.uri, extra));
  },

  /** Quality check without storing – lets the camera screen ask for a retake. */
  async check(uri: string): Promise<FaceCheck> {
    const prepared = await prepareForUpload(uri);
    if (USE_MOCK_API) {
      return { face_found: true, faces: 1, blur_score: 150, brightness: 130, face_coverage: 0.2, ok: true, reasons: [] };
    }
    return api.upload<FaceCheck>('/images/check', toFormData(prepared.uri, {}));
  },

  async list(assessmentId?: string): Promise<SkinImage[]> {
    if (USE_MOCK_API) return assessmentId ? mockImages.filter((i) => i.assessment_id === assessmentId) : mockImages;
    return api.get<SkinImage[]>(assessmentId ? `/images?assessment_id=${assessmentId}` : '/images');
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
