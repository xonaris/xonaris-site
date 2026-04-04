import {
  Controller,
  Get,
  Post,
  Body,
  Header,
  Query,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { validatePseudo } from '../common/constants/reserved-words';
import { verifyTurnstile } from '../common/utils/turnstile';
import { getRsaPublicKeyPem } from '../common/utils/rsa-keys';
import { SkipEncryption } from '../common/decorators/skip-encryption.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateRegisterDto, CheckPseudoDto, CheckReferralDto } from './dto/auth.dto';

/** Shared cookie options for production-grade security. */
const COOKIE_SECURE = process.env.NODE_ENV !== 'development';
const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Cookie domain for cross-subdomain sharing.
 * In production, frontend (xonaris.space) and API (api.xonaris.space) share
 * the eTLD+1 domain so cookies with domain=.xonaris.space are sent to both.
 */
function getCookieDomain(): string | undefined {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl || process.env.NODE_ENV !== 'production') return undefined;
  try {
    const host = new URL(frontendUrl).hostname; // e.g. xonaris.space
    return `.${host}`; // .xonaris.space
  } catch {
    return undefined;
  }
}
const COOKIE_DOMAIN = getCookieDomain();

/** Known error codes → safe user-facing messages */
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  'discord_already_linked': 'Ce compte Discord est déjà lié à un compte existant',
  'no_account': "Aucun compte trouvé. Veuillez d'abord vous inscrire.",
  'discord_not_linked': "Ce compte Discord n'est lié à aucun compte Xonaris.",
  'pseudo_taken': 'Ce pseudo est déjà pris',
  'invalid_pseudo': 'Pseudo invalide',
  'oauth_failed': "Erreur lors de l'authentification Discord",
  'unknown': 'Une erreur est survenue. Veuillez réessayer.',
};

function toSafeErrorCode(message: string): string {
  if (message.includes('déjà lié')) return 'discord_already_linked';
  if (message.includes('Aucun compte')) return 'no_account';
  if (message.includes('lié à aucun')) return 'discord_not_linked';
  if (message.includes('pseudo est déjà pris')) return 'pseudo_taken';
  if (message.includes('Pseudo') || message.includes('pseudo')) return 'invalid_pseudo';
  if (message.includes('OAuth') || message.includes('Discord')) return 'oauth_failed';
  return 'unknown';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * GET /auth/session
   * Returns the current user or { user: null } — never 401.
   * Used by the frontend to check auth state without console errors.
   */
  @Get('session')
  @Throttle({ medium: { limit: 30, ttl: 60000 } })
  async getSession(@Req() req: Request) {
    const token = req.cookies?.['xonaris_token'];
    if (!token) return { user: null };

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.session_token) return { user: null };
      if (user.token_expiration && user.token_expiration < new Date()) return { user: null };

      if (user.is_banned) {
        return {
          user: null,
          banned: true,
          ban_reason: user.ban_reason,
        };
      }

      // Auto-expire premium
      let isPremium = user.is_premium;
      if (isPremium && user.premium_expires_at && user.premium_expires_at < new Date()) {
        isPremium = false;
        try {
          await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: user.id }, data: { is_premium: false, premium_expires_at: null } }),
            this.prisma.actionLog.create({ data: { user_id: user.id, action: 'PREMIUM_EXPIRE' } }),
          ]);
        } catch {
          // Log failure but continue — premium status will be retried on next session check
        }
      }

      return {
        user: {
          id: user.id,
          pseudo: user.pseudo,
          username_discord: user.username_discord,
          avatar_discord: user.avatar_discord,
          is_premium: isPremium,
          premium_started_at: user.premium_started_at,
          premium_expires_at: isPremium ? user.premium_expires_at : null,
          referral_code: user.referral_code,
          referral_count: user.referral_count,
          favorites_count: user.favorites_count,
          reports_count: user.reports_count,
          role: user.role,
          is_banned: user.is_banned,
          ban_reason: user.ban_reason,
          created_at: user.created_at,
          last_login_at: user.last_login_at,
        },
      };
    } catch {
      return { user: null };
    }
  }

  // ── Public config (e.g., landing page background) ──
  // Cached for 30s to avoid 5 DB queries per unauthenticated call
  private _publicConfigCache: { data: any; expiresAt: number } | null = null;

  @Get('public-config')
  @Throttle({ medium: { limit: 30, ttl: 60000 } })
  async getPublicConfig() {
    const now = Date.now();
    if (this._publicConfigCache && this._publicConfigCache.expiresAt > now) {
      return this._publicConfigCache.data;
    }
    const [bgSetting, priceSetting, annActive, annText, annColor, bgBanned, bgMaintenance] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: 'background_landing' } }),
      this.prisma.setting.findUnique({ where: { key: 'premium_price' } }),
      this.prisma.setting.findUnique({ where: { key: 'announcement_active' } }),
      this.prisma.setting.findUnique({ where: { key: 'announcement_text' } }),
      this.prisma.setting.findUnique({ where: { key: 'announcement_color' } }),
      this.prisma.setting.findUnique({ where: { key: 'bckgrnd_banned' } }),
      this.prisma.setting.findUnique({ where: { key: 'bckgrnd_maintenance' } }),
    ]);
    const data = {
      background_landing: bgSetting?.value || null,
      premium_price: priceSetting?.value || null,
      announcement_active: annActive?.value === 'true',
      announcement_text: annText?.value || null,
      announcement_color: annColor?.value || null,
      bckgrnd_banned: bgBanned?.value || null,
      bckgrnd_maintenance: bgMaintenance?.value || null,
    };
    this._publicConfigCache = { data, expiresAt: now + 30_000 };
    return data;
  }

  // ── RSA public key (required by the frontend to encrypt requests) ──

  @Get('public-key')
  @SkipEncryption()
  @SkipThrottle({ short: true, medium: true, long: true })
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  getPublicKey() {
    return { publicKey: getRsaPublicKeyPem() };
  }

  // ── Token refresh (rotation) ──

  @Post('refresh')
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['xonaris_refresh'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    // Set new access token cookie
    res.cookie('xonaris_token', tokens.accessToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: ACCESS_MAX_AGE,
      path: '/',
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    });

    // Set new refresh token cookie
    res.cookie('xonaris_refresh', tokens.refreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    });

    return { message: 'Tokens renouvelés' };
  }

  /**
   * POST /auth/validate-register
   * Validates pseudo + captcha before redirecting to Discord OAuth.
   * Returns the Discord OAuth redirect URL if valid.
   */
  @Post('validate-register')
  async validateRegister(
    @Body() dto: ValidateRegisterDto,
    @Req() req: Request,
  ) {
    const { captcha_token } = dto;
    const ref = dto.ref?.trim() || dto.referral?.trim() || undefined;
    const pseudo = dto.pseudo?.trim() ?? '';

    // 1. Validate pseudo format + reserved words
    const validation = validatePseudo(pseudo);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // 2. Check uniqueness (case-insensitive)
    const existing = await this.prisma.user.findFirst({
      where: { pseudo: { equals: pseudo, mode: 'insensitive' } },
    });
    if (existing) {
      throw new BadRequestException('Ce pseudo est déjà pris');
    }

    // 3. Verify captcha — use CF-Connecting-IP (set by Cloudflare CDN) first, fallback to x-forwarded-for
    const ip =
      req.headers['cf-connecting-ip']?.toString() ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const captchaResult = await verifyTurnstile(captcha_token, ip);
    if (!captchaResult.success) {
      throw new BadRequestException(
        captchaResult.error || 'Vérification captcha échouée',
      );
    }

    // 4. Return redirect URL (frontend will open this)
    return {
      valid: true,
      redirect_url: `/auth/discord?mode=register&pseudo=${encodeURIComponent(pseudo)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`,
    };
  }

  /**
   * POST /auth/check-pseudo
   * Real-time pseudo validation for the register form.
   */
  @Post('check-pseudo')
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  async checkPseudo(@Body() dto: CheckPseudoDto) {
    const pseudo = dto.pseudo?.trim() ?? '';
    const validation = validatePseudo(pseudo);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }
    const existing = await this.prisma.user.findFirst({
      where: { pseudo: { equals: pseudo, mode: 'insensitive' } },
    });
    return { available: !existing, error: existing ? 'Ce pseudo est déjà pris' : undefined };
  }

  /**
   * POST /auth/check-referral
   * Validate a referral code and return the referrer's pseudo.
   */
  @Post('check-referral')
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  async checkReferral(@Body() dto: CheckReferralDto) {
    const code = dto.code?.trim() ?? '';
    if (!code) {
      return { valid: false, pseudo: null };
    }
    const referrer = await this.prisma.user.findUnique({
      where: { referral_code: code },
      select: { pseudo: true },
    });
    return {
      valid: !!referrer,
      pseudo: referrer?.pseudo ?? null,
    };
  }

  @Get('discord')
  @SkipEncryption()
  discordLogin(
    @Req() req: Request,
    @Res() res: Response,
    @Query('ref') referralCode?: string,
    @Query('pseudo') pseudo?: string,
    @Query('mode') mode?: string,
  ) {
    const state = randomBytes(16).toString('hex');

    // Store state + optional referral + pseudo in cookie
    const stateData = JSON.stringify({
      state,
      ref: referralCode || null,
      pseudo: pseudo || null,
      mode: mode || 'login',
    });
    res.cookie('oauth_state', stateData, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax', // Must be 'lax' (not 'strict') — OAuth redirects from Discord require the cookie to be sent on cross-site top-level navigation
      maxAge: 300000,
      path: '/auth',
    });

    const url = this.authService.getDiscordAuthUrl(state);
    res.redirect(url);
  }

  @Get('discord/callback')
  @SkipEncryption()
  async discordCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new UnauthorizedException('Paramètres OAuth manquants');
    }

    // Retrieve stored state
    const stateCookie = req.cookies?.['oauth_state'];
    if (!stateCookie) {
      throw new UnauthorizedException('Session OAuth expirée');
    }

    let storedData: { state: string; ref: string | null; pseudo: string | null; mode: string };
    try {
      storedData = JSON.parse(stateCookie);
    } catch {
      throw new UnauthorizedException('State OAuth corrompu');
    }

    // Clear oauth state cookie
    res.clearCookie('oauth_state', { path: '/auth' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      const result = await this.authService.handleCallback(
        code,
        state,
        storedData.state,
        ip,
        userAgent,
        storedData.ref || undefined,
        storedData.pseudo || undefined,
        storedData.mode || 'login',
      );

      // Set access token in httpOnly cookie (short-lived)
      res.cookie('xonaris_token', result.accessToken, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: ACCESS_MAX_AGE,
        path: '/',
        ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
      });

      // Set refresh token in httpOnly cookie (long-lived)
      res.cookie('xonaris_refresh', result.refreshToken, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: REFRESH_MAX_AGE,
        path: '/',
        ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
      });

      // Redirect to frontend — sync goes to profile, new/existing users go to channels
      let redirectPath = '/';
      if (storedData.mode === 'sync') redirectPath = '/profil?synced=true';
      return res.redirect(`${frontendUrl}${redirectPath}`);
    } catch (err: any) {
      const message = err?.response?.message || err?.message || 'Erreur inconnue';
      const mode = storedData.mode || 'login';
      const errorCode = toSafeErrorCode(message);

      // Redirect to appropriate frontend page with safe error code
      if (mode === 'sync') {
        return res.redirect(`${frontendUrl}/profil?sync_error=true&error=${encodeURIComponent(errorCode)}`);
      }
      if (mode === 'register') {
        return res.redirect(`${frontendUrl}/register?error=${encodeURIComponent(errorCode)}`);
      }
      // login mode
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorCode)}`);
    }
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    // Invalidate server-side session
    const refreshToken = req.cookies?.['xonaris_refresh'];
    if (refreshToken) {
      try {
        await this.authService.invalidateByRefreshToken(refreshToken);
      } catch {
        // Session invalidation failed — continue with cookie clearing
      }
    }

    res.clearCookie('xonaris_token', { path: '/', ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }) });
    res.clearCookie('xonaris_refresh', { path: '/', ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }) });
    return { message: 'Déconnecté' };
  }
}
