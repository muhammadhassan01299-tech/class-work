export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Small fetch wrapper for the Pak Tourist server.
 * - sends cookies (login sessions are httpOnly cookies set by the server)
 * - adds the CSRF header the server requires for every state-changing call
 */
export async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: {
        'x-pt-csrf': '1',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that it is running and try again.', 0);
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the file.')));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

/** Uploads an image file (admin only) and returns its public URL, e.g. /uploads/123.jpg */
export async function uploadImageFile(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
    throw new Error('Please choose a PNG, JPG, GIF or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image is larger than 5 MB. Please choose a smaller file.');
  }
  const dataUrl = await readFileAsDataUrl(file);
  const { url } = await api<{ url: string }>('POST', '/api/admin/upload', { dataUrl });
  return url;
}
