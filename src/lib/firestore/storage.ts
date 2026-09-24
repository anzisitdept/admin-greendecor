'use client';

export function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(
  file: File,
  folder: string
): Promise<{ url: string; error: string | null }> {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!apiKey) {
    return { url: '', error: 'IMG_BB_API_KEY missing. Add NEXT_PUBLIC_IMGBB_API_KEY to your env.' };
  }
  try {
    const base64 = await fileToBase64(file);
    const body = new URLSearchParams();
    body.set('key', apiKey);
    body.set('image', base64);
    body.set('name', `${folder}-${Date.now()}`);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body,
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || json?.success !== true || !json?.data?.url) {
      const message = json?.error?.message ?? json?.status_txt ?? `Upload failed (${res.status})`;
      return { url: '', error: message };
    }
    return { url: json.data.url as string, error: null };
  } catch (e) {
    return { url: '', error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

export async function deleteImage(): Promise<void> {
  // ImgBB delete URLs are not persisted in the data model, so hosted files are
  // left to expire. No-op by design.
}