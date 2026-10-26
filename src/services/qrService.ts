import QRCode from 'qrcode';

/**
 * Hasilkan hash SHA-256 daripada string token menggunakan Web Crypto API
 */
export async function hashTokenClient(token: string): Promise<string> {
  const trimmed = token.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Menghasilkan token rawak berkriptografi tinggi
 */
export function generateRandomToken(): string {
  const randomBytes = new Uint8Array(24);
  window.crypto.getRandomValues(randomBytes);
  // Tukar kepada URL-safe base64
  const base64 = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `SKB_${base64}`;
}

/**
 * Jana imej QR Code dalam bentuk Data URL (Base64 PNG)
 */
export async function generateQRDataUrl(token: string): Promise<string> {
  try {
    return await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a', // Navy / Slate gelap
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Ralat semasa menjana Data URL QR:', err);
    throw err;
  }
}
