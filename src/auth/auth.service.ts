import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { generateReferralCode } from '../common/utils/codes';
import { encrypt } from '../common/utils/encryption';
import { validatePseudo } from '../common/constants/reserved-words';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

function detectDeviceType(ua: string): string {
  if (!ua) return 'unknown';
  const l = ua.toLowerCase();
  if (/tablet|ipad/.test(l)) return 'tablet';
  if (/mobile|android|iphone|ipod/.test(l)) return 'mobile';
  return 'desktop';
}

/** Hash a refresh token before storing in DB. */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generate a cryptographically secure refresh token. */
function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  getDiscordAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      redirect_uri: process.env.DISCORD_CALLBACK_URL!,
      response_type: 'code',
      scope: 'identify',
      state,
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string,
    expectedState: string,
    ip: string,
    userAgent: string,
    referralCode?: string,
    customPseudo?: string,
    mode?: string,
  ) {
    // ── Verify CSRF state ──
    if (!state || state !== expectedState) {
      throw new UnauthorizedException('State OAuth invalide');
    }

    // ── Exchange code for Discord token ──
    const tokenResponse = await this.exchangeCode(code);
    if (!tokenResponse) {
      throw new UnauthorizedException("Échec de l'échange OAuth");
    }

    // ── Fetch Discord profile ──
    const discordUser = await this.getDiscordUser(tokenResponse.access_token);
    if (!discordUser) {
      throw new UnauthorizedException(
        'Impossible de récupérer le profil Discord',
      );
    }

    const encryptedIp = encrypt(ip);
    const deviceType = detectDeviceType(userAgent);
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    // ── Find existing user ──
    const existingUser = await this.prisma.user.findUnique({
      where: { discord_id: discordUser.id },
    });

    let user = existingUser;
    let isNew = false;

    if (user) {
      // ── EXISTING USER ─────────────────────────────
      if (mode === 'register') {
        throw new BadRequestException(
          'Ce compte Discord est déjà lié à un compte existant',
        );
      }

      // Sync mode: just update Discord profile data, do NOT generate new JWT
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username_discord: discordUser.username,
          avatar_discord: avatarUrl,
          last_login_at: mode === 'sync' ? undefined : new Date(),
          last_ip: encryptedIp,
          last_oauth_refresh: new Date(),
          user_agent: userAgent,
          device_type: deviceType,
        },
      });
    } else {
      // ── NEW USER ──────────────────────────────────
      if (mode === 'login') {
        throw new BadRequestException(
          "Aucun compte trouvé. Veuillez d'abord vous inscrire.",
        );
      }

      if (mode === 'sync') {
        throw new BadRequestException(
          "Ce compte Discord n'est lié à aucun compte Xonaris.",
        );
      }

      // Validate pseudo
      const pseudo =
        customPseudo || discordUser.global_name || discordUser.username;
      const validation = validatePseudo(pseudo);
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }

      // Uniqueness check (case-insensitive)
      const existingPseudo = await this.prisma.user.findFirst({
        where: { pseudo: { equals: pseudo, mode: 'insensitive' } },
      });
      if (existingPseudo) {
        throw new BadRequestException('Ce pseudo est déjà pris');
      }

      // Generate unique referral code
      let referral_code: string;
      let attempts = 0;
      do {
        referral_code = generateReferralCode();
        const exists = await this.prisma.user.findUnique({
          where: { referral_code },
        });
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      // Resolve referral
      let referred_by: string | null = null;
      if (referralCode) {
        const referrer = await this.prisma.user.findUnique({
          where: { referral_code: referralCode },
        });
        if (referrer) {
          referred_by = referrer.id;
          await this.prisma.user.update({
            where: { id: referrer.id },
            data: { referral_count: { increment: 1 } },
          });
          await this.prisma.actionLog.create({
            data: {
              user_id: referrer.id,
              action: 'REFERRAL_USE',
              details: { referred_pseudo: pseudo },
              ip: encryptedIp,
            },
          });
        }
      }

      user = await this.prisma.user.create({
        data: {
          discord_id: discordUser.id,
          username_discord: discordUser.username,
          avatar_discord: avatarUrl,
          pseudo,
          referral_code,
          referred_by,
          first_ip: encryptedIp,
          last_ip: encryptedIp,
          user_agent: userAgent,
          device_type: deviceType,
        },
      });
      isNew = true;

      // Log registration
      await this.prisma.actionLog.create({
        data: {
          user_id: user.id,
          action: 'REGISTER',
          details: {
            referral_used: referralCode || null,
            discord_username: discordUser.username,
          },
          ip: encryptedIp,
        },
      });
    }

    // ── Ban check ──
    if (user.is_banned) {
      throw new UnauthorizedException('Votre compte a été banni');
    }

    // ── Generate access token (short-lived) + refresh token ──
    const accessToken = this.jwtService.sign({
      sub: user.id,
      discord_id: user.discord_id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const refreshExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // ── Store session + log login ──
    await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          session_token: refreshTokenHash,
          token_expiration: refreshExpiration,
        },
      }),
      this.prisma.loginLog.create({
        data: {
          user_id: user.id,
          ip: encryptedIp,
          user_agent: userAgent,
          device_type: deviceType,
        },
      }),
      !isNew
        ? this.prisma.actionLog.create({
            data: {
              user_id: user.id,
              action: 'LOGIN',
              ip: encryptedIp,
            },
          })
        : Promise.resolve(),
    ]);

    return { accessToken, refreshToken, user, isNew };
  }

  /**
   * Refresh tokens: validate refresh token, rotate it, issue new access token.
   */
  async refreshTokens(refreshToken: string) {
    const hash = hashRefreshToken(refreshToken);

    const user = await this.prisma.user.findFirst({
      where: { session_token: hash },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (user.is_banned) {
      throw new UnauthorizedException('Compte banni');
    }

    if (user.token_expiration && user.token_expiration < new Date()) {
      // Invalidate expired token
      await this.prisma.user.update({
        where: { id: user.id },
        data: { session_token: null, token_expiration: null },
      });
      throw new UnauthorizedException('Refresh token expiré');
    }

    // ── Rotate: new access + refresh tokens ──
    const newAccessToken = this.jwtService.sign({
      sub: user.id,
      discord_id: user.discord_id,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefreshToken);
    const newExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        session_token: newRefreshHash,
        token_expiration: newExpiration,
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Invalidate all tokens for a user (logout / ban).
   */
  async invalidateSession(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { session_token: null, token_expiration: null },
    });
  }

  /**
   * Invalidate session by refresh token (used in logout).
   */
  async invalidateByRefreshToken(refreshToken: string): Promise<void> {
    const hash = hashRefreshToken(refreshToken);
    await this.prisma.user.updateMany({
      where: { session_token: hash },
      data: { session_token: null, token_expiration: null },
    });
  }

  private async exchangeCode(
    code: string,
  ): Promise<DiscordTokenResponse | null> {
    try {
      const { data } = await axios.post<DiscordTokenResponse>(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID!,
          client_secret: process.env.DISCORD_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.DISCORD_CALLBACK_URL!,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return data;
    } catch {
      return null;
    }
  }

  private async getDiscordUser(
    accessToken: string,
  ): Promise<DiscordUser | null> {
    try {
      const { data } = await axios.get<DiscordUser>(
        'https://discord.com/api/v10/users/@me',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return data;
    } catch {
      return null;
    }
  }
}
