import { createHmac, timingSafeEqual } from 'crypto';

interface AdTokenPayload {
  user_id: string;
  channel_id: string;
  exp: number;
}

/**
 * Short-lived HMAC-signed token proving a user watched an ad.
 * Used to gate stream access for non-premium users.
 */
const AD_TOKEN_TTL_SECONDS = 600; // 10 minutes

function getSecret(): string {
  // Re-use STREAM_SIGN_SECRET — same trust boundary
  const secret = process.env.STREAM_SIGN_SECRET;
  if (!secret) throw new Error('STREAM_SIGN_SECRET not set');
  return secret;
}

export function generateAdToken(userId: string, channelId: string): string {
  const payload: AdTokenPayload = {
    user_id: userId,
    channel_id: channelId,
    exp: Math.floor(Date.now() / 1000) + AD_TOKEN_TTL_SECONDS,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getSecret() + ':ad').update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyAdToken(token: string, userId: string, channelId: string): boolean {
  try {
    const secret = getSecret();
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [data, signature] = parts;
    const expectedSig = createHmac('sha256', secret + ':ad').update(data).digest('base64url');
    const sigBuf = Buffer.from(signature, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

    const payload: AdTokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    if (payload.user_id !== userId) return false;
    if (payload.channel_id !== channelId) return false;

    return true;
  } catch {
    return false;
  }
}
