import { createHmac, timingSafeEqual } from 'crypto';

interface StreamTokenPayload {
  user_id: string;
  channel_id: string;
  exp: number;
}

export function generateStreamToken(userId: string, channelId: string, ttlSeconds = 60): string {
  const secret = process.env.STREAM_SIGN_SECRET;
  if (!secret) throw new Error('STREAM_SIGN_SECRET not set');
  if (secret === 'CHANGE_ME_STREAM_SECRET_KEY') {
    throw new Error('STREAM_SIGN_SECRET must be changed from default value');
  }

  const payload: StreamTokenPayload = {
    user_id: userId,
    channel_id: channelId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyStreamToken(token: string): StreamTokenPayload | null {
  const secret = process.env.STREAM_SIGN_SECRET;
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSig = createHmac('sha256', secret).update(data).digest('base64url');
  const sigBuf = Buffer.from(signature, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload: StreamTokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
