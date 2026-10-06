/**
 * Image handling – owner: Ali.
 * normalise(): strips EXIF/GPS, fixes rotation, max 1600 px, JPEG.
 * faceCheck(): Google Cloud Vision FACE_DETECTION when GOOGLE_VISION_API_KEY is set,
 * otherwise a local sharpness/brightness check with sharp. Detection only – never identity.
 */
import sharp from 'sharp';

import { config } from '../config.js';

export interface FaceCheck {
  face_found: boolean;
  faces: number;
  blur_score: number;
  brightness: number;
  face_coverage: number;
  ok: boolean;
  reasons: string[];
  method: 'google' | 'local';
}

export async function normalise(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const img = sharp(input, { failOn: 'error' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true });
  const { data, info } = await img.toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function localStats(data: Buffer): Promise<{ brightness: number; blur: number }> {
  const gray = sharp(data).greyscale().resize({ width: 640, withoutEnlargement: true });
  const stats = await gray.clone().stats();
  const brightness = stats.channels[0].mean;
  // variance of the Laplacian as a sharpness measure
  const lap = await gray
    .clone()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], offset: 128 })
    .stats();
  const blur = lap.channels[0].stdev ** 2;
  return { brightness, blur };
}

const LIKELY = new Set(['LIKELY', 'VERY_LIKELY']);

export async function faceCheck(data: Buffer, width: number, height: number): Promise<FaceCheck> {
  const { brightness, blur } = await localStats(data);
  const reasons: string[] = [];

  if (config.visionApiKey) {
    try {
      const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(config.visionApiKey)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requests: [{ image: { content: data.toString('base64') }, features: [{ type: 'FACE_DETECTION', maxResults: 5 }] }] }),
      });
      const body = (await res.json()) as { responses?: { faceAnnotations?: Record<string, unknown>[]; error?: { message: string } }[]; error?: { message: string } };
      const r = body.responses?.[0];
      if (!res.ok || body.error || r?.error) throw new Error(body.error?.message ?? r?.error?.message ?? `HTTP ${res.status}`);
      const faces = r?.faceAnnotations ?? [];
      let coverage = 0;
      let blurred = false;
      let dark = false;
      let turned = false;
      if (faces.length) {
        const f = faces[0] as { boundingPoly?: { vertices?: { x?: number; y?: number }[] }; blurredLikelihood?: string; underExposedLikelihood?: string; panAngle?: number; tiltAngle?: number };
        const v = f.boundingPoly?.vertices ?? [];
        const xs = v.map((p) => p.x ?? 0);
        const ys = v.map((p) => p.y ?? 0);
        coverage = xs.length ? ((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / (width * height) : 0;
        blurred = LIKELY.has(f.blurredLikelihood ?? '');
        dark = LIKELY.has(f.underExposedLikelihood ?? '');
        turned = Math.abs(f.panAngle ?? 0) > 25 || Math.abs(f.tiltAngle ?? 0) > 25;
      }
      if (!faces.length) reasons.push('Vi hittade inget ansikte. Håll kameran rakt framför ansiktet i bra ljus.');
      if (faces.length > 1) reasons.push('Flera ansikten i bild – ta bilden ensam.');
      if (blurred) reasons.push('Bilden är suddig. Håll kameran stilla.');
      if (dark) reasons.push('Bilden är för mörk. Vänd dig mot ett fönster eller tänd mer ljus.');
      if (turned) reasons.push('Titta rakt in i kameran så att hela ansiktet syns.');
      if (faces.length === 1 && coverage < 0.04) reasons.push('Ansiktet är för litet i bild. Gå närmare.');
      return { face_found: faces.length > 0, faces: faces.length, blur_score: Math.round(blur), brightness: Math.round(brightness), face_coverage: Math.round(coverage * 1000) / 1000, ok: faces.length === 1 && !reasons.length, reasons, method: 'google' };
    } catch (e) {
      console.error('[vision] falling back to local check:', (e as Error).message);
    }
  }

  if (blur < 60) reasons.push('Bilden verkar suddig. Håll kameran stilla och fokusera.');
  if (brightness < 60) reasons.push('Bilden är för mörk. Vänd dig mot ett fönster eller tänd mer ljus.');
  if (brightness > 215) reasons.push('Bilden är överexponerad. Undvik direkt starkt ljus eller blixt.');
  return { face_found: true, faces: 0, blur_score: Math.round(blur), brightness: Math.round(brightness), face_coverage: 0, ok: !reasons.length, reasons, method: 'local' };
}
