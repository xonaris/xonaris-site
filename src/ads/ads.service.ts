import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../common/utils/encryption';
import { generateAdToken, verifyAdToken } from '../common/utils/ad-token';

/** Minimum time (ms) user must wait before validating an ad. */
const MIN_AD_VIEW_DELAY_MS = 5_000; // 5 seconds

/** In-memory ad nonce store: nonce → { userId, channelId, issuedAt } */
const adNonces = new Map<string, { userId: string; channelId: string; issuedAt: number }>();

// Cleanup old nonces every 60s
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000; // 10 min
  for (const [key, val] of adNonces) {
    if (val.issuedAt < cutoff) adNonces.delete(key);
  }
}, 60_000).unref();

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pick a random active ad and return its **decrypted** URL.
   * Called only on user click — never pre-fetched.
   */
  async getAd(userId: string, channelId: string): Promise<{ url: string; nonce: string }> {
    const ads = await this.prisma.ad.findMany({ where: { is_active: true } });
    if (ads.length === 0) {
      throw new NotFoundException('Aucune publicité disponible');
    }
    const ad = ads[Math.floor(Math.random() * ads.length)];
    let url: string;
    try {
      url = decrypt(ad.url);
    } catch {
      url = ad.url;
    }

    // Generate a one-time nonce to prevent instant validate calls
    const nonce = require('crypto').randomBytes(16).toString('hex');
    adNonces.set(nonce, { userId, channelId, issuedAt: Date.now() });

    return { url, nonce };
  }

  /**
   * Validate that the user "watched" the ad and return a short-lived
   * signed token allowing them to access the stream.
   */
  generateAdProof(userId: string, channelId: string, nonce: string): { ad_token: string } {
    // Verify the nonce exists and belongs to this user/channel
    const nonceData = adNonces.get(nonce);
    if (!nonceData) {
      throw new BadRequestException('Nonce de publicité invalide ou déjà utilisé');
    }
    if (nonceData.userId !== userId || nonceData.channelId !== channelId) {
      throw new BadRequestException('Nonce de publicité invalide');
    }

    // Enforce minimum viewing delay
    const elapsed = Date.now() - nonceData.issuedAt;
    if (elapsed < MIN_AD_VIEW_DELAY_MS) {
      throw new BadRequestException(
        `Veuillez attendre au moins ${Math.ceil((MIN_AD_VIEW_DELAY_MS - elapsed) / 1000)}s avant de valider`,
      );
    }

    // Consume the nonce (one-time use)
    adNonces.delete(nonce);

    const ad_token = generateAdToken(userId, channelId);
    return { ad_token };
  }

  /**
   * Verify an ad token coming from the frontend before allowing stream access.
   */
  verifyAdProof(token: string, userId: string, channelId: string): boolean {
    return verifyAdToken(token, userId, channelId);
  }
}
