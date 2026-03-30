import axios from 'axios';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  error?: string;
}

/**
 * Verify a Cloudflare Turnstile captcha token.
 * If TURNSTILE_SECRET_KEY is not set, captcha is disabled (dev mode).
 */
export async function verifyTurnstile(
  token: string,
  ip?: string,
): Promise<TurnstileResult> {
  if (!TURNSTILE_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TURNSTILE_SECRET_KEY is required in production');
    }
    // Dev mode: skip captcha
    return { success: true };
  }

  if (!token) {
    return { success: false, error: 'Captcha requis' };
  }

  try {
    // Cloudflare siteverify requires application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('secret', TURNSTILE_SECRET);
    params.append('response', token);
    if (ip && ip !== 'unknown') params.append('remoteip', ip);

    const { data } = await axios.post(TURNSTILE_VERIFY_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    });

    if (data.success) {
      return { success: true };
    }
    return {
      success: false,
      error: 'Vérification captcha échouée',
    };
  } catch {
    return { success: false, error: 'Erreur de validation captcha' };
  }
}
