import { Controller, Get, Param, Query, Headers, Res, HttpStatus, UseGuards } from '@nestjs/common';
import * as crypto from 'crypto';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import axios from 'axios';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipEncryption } from '../common/decorators/skip-encryption.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { validateExternalUrl, isSameHost } from '../common/utils/ssrf-guard';
import { StreamService } from './stream.service';

@Controller('stream')
@Throttle({ medium: { limit: 120, ttl: 60000 } })
export class StreamController {
  /** AES-256-CBC key derived from ENCRYPTION_KEY, used to hide segment URLs in &f= params */
  private readonly segmentEncKey: Buffer;

  constructor(private readonly streamService: StreamService) {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) throw new Error('ENCRYPTION_KEY environment variable must be set');
    this.segmentEncKey = crypto.scryptSync(secret, 'hls-segment-f-v1', 32);
  }

  @Get('verify')
  @SkipEncryption()
  async verifyStream(
    @Headers('x-stream-token') token: string,
    @Res() res: Response,
  ) {
    const valid = this.streamService.verifyToken(token);
    if (valid) {
      return res.status(HttpStatus.OK).send();
    }
    return res.status(HttpStatus.FORBIDDEN).send();
  }

  /**
   * Reverse-proxy for HLS content.
   * The raw source URL is NEVER exposed to the client.
   *
   * GET /stream/proxy/:streamId?token=xxx           → serve root m3u8
   * GET /stream/proxy/:streamId?token=xxx&f=<url>   → serve segment / sub-playlist
   */
  @Get('proxy/:streamId')
  @Throttle({ short: { limit: 30, ttl: 1000 }, medium: { limit: 600, ttl: 60000 } })
  @SkipEncryption()
  async proxyStream(
    @Param('streamId') streamId: string,
    @Query('token') token: string,
    @Query('f') filePath: string | undefined,
    @Res() res: Response,
  ) {
    // ── Token verification ──
    if (!token) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Token manquant' });
    }
    const tokenPayload = this.streamService.verifyTokenFull(token);
    if (!tokenPayload) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Token invalide ou expiré' });
    }

    // ── Re-check user ban status (prevents banned users from streaming with old tokens) ──
    const bannedCheck = await this.streamService.isUserBanned(tokenPayload.user_id);
    if (bannedCheck) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Compte banni' });
    }

    // ── Decrypt the &f= segment URL if present ──
    if (filePath) {
      const decrypted = this.decryptSegmentUrl(filePath);
      if (!decrypted) {
        return res.status(HttpStatus.FORBIDDEN).json({ message: 'Paramètre invalide' });
      }
      filePath = decrypted;
    }

    // ── Resolve the actual HLS URL from DB ──
    const hlsUrl = await this.streamService.resolveHlsUrl(streamId, tokenPayload.channel_id);
    if (!hlsUrl) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Source introuvable' });
    }

    // Xtream Codes compat: swap .ts → .m3u8 for initial manifest request only
    const resolvedHlsUrl = !filePath && /\.ts(\?.*)?$/.test(hlsUrl)
      ? hlsUrl.replace(/\.ts(\?.*)?$/, (_, qs) => `.m3u8${qs ?? ''}`)
      : hlsUrl;
    const baseUrl = resolvedHlsUrl.substring(0, resolvedHlsUrl.lastIndexOf('/') + 1);

    // ── Build target URL ──
    let targetUrl: string;
    if (!filePath) {
      targetUrl = resolvedHlsUrl;
    } else if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      targetUrl = filePath;
    } else if (filePath.startsWith('/')) {
      try {
        const base = new URL(resolvedHlsUrl);
        targetUrl = `${base.protocol}//${base.host}${filePath}`;
      } catch {
        targetUrl = `${baseUrl}${filePath.slice(1)}`;
      }
    } else {
      targetUrl = `${baseUrl}${filePath}`;
    }

    // ── SSRF protection ──
    // For segment requests on the same host as the resolved HLS URL,
    // skip full DNS re-validation (host was already validated for the manifest).
    const sameHost = filePath ? isSameHost(targetUrl, resolvedHlsUrl) : false;
    if (!sameHost) {
      try {
        await validateExternalUrl(targetUrl);
      } catch {
        return res.status(HttpStatus.FORBIDDEN).json({ message: 'URL bloquée' });
      }
    }

    // ── Fetch & proxy (with retry for manifests) ──
    const maxAttempts = filePath ? 1 : 2; // retry initial manifest once
    let lastErr: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.fetchAndProxy(targetUrl, filePath, streamId, token, res);
        return; // success
      } catch (err: any) {
        lastErr = err;
        if (res.headersSent) return;

        // If .ts→.m3u8 swap was applied, retry with the original .ts URL as fallback
        if (!filePath && resolvedHlsUrl !== hlsUrl) {
          try {
            await validateExternalUrl(hlsUrl);
            await this.fetchAndProxy(hlsUrl, filePath, streamId, token, res);
            return;
          } catch { /* fallback also failed */ }
        }

        // Wait briefly before retrying manifest
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    if (res.headersSent) return;
    const status = lastErr?.response?.status || 502;
    const upstreamMsg = lastErr?.code === 'ECONNABORTED' ? 'Délai de connexion dépassé'
      : lastErr?.code === 'ECONNREFUSED' ? 'Source inaccessible'
      : lastErr?.response?.status === 404 ? 'Source introuvable (404)'
      : lastErr?.response?.status === 403 ? 'Accès refusé par la source (403)'
      : 'Erreur lors du chargement du flux';
    return res.status(status).json({ message: upstreamMsg });
  }

  /**
   * Build request headers for a given upstream URL.
   * IPTV CDNs often enforce User-Agent and Referer checks.
   * We cycle through UA profiles so a 403 triggers a retry with a different profile.
   */
  private buildUpstreamHeaders(targetUrl: string, uaProfile: 'vlc' | 'firefox' | 'chrome' | 'bare'): Record<string, string> {
    let origin = '';
    try {
      const u = new URL(targetUrl);
      origin = `${u.protocol}//${u.host}`;
    } catch { /* ignore */ }

    const common: Record<string, string> = {
      Connection: 'keep-alive',
    };

    switch (uaProfile) {
      case 'vlc':
        return {
          ...common,
          'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
          Accept: '*/*',
        };
      case 'firefox':
        return {
          ...common,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
          Accept: '*/*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
          Referer: origin ? `${origin}/` : '',
          Origin: origin,
        };
      case 'chrome':
        return {
          ...common,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: '*/*',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          Referer: origin ? `${origin}/` : '',
          Origin: origin,
        };
      case 'bare':
      default:
        return { ...common, 'User-Agent': 'curl/8.5.0', Accept: '*/*' };
    }
  }

  /**
   * Fetch an HLS resource from upstream and send it through the proxy.
   * Playlists are detected (headers + content sniffing) and rewritten.
   * Binary segments are piped through directly.
   * On 403/407, automatically retries with different UA/header profiles.
   */
  private async fetchAndProxy(
    targetUrl: string,
    filePath: string | undefined,
    streamId: string,
    token: string,
    res: Response,
  ): Promise<void> {
    // Use a shorter timeout for segments, longer for manifests
    const isSegment = !!filePath;
    const timeout = isSegment ? 10000 : 20000;

    // For segments, only try two lightweight profiles — CDN blocking is not UA-dependent
    // and iterating through all 4 adds ~30 s latency before giving up.
    // For manifests, try all profiles in case the CDN inspects User-Agent.
    const uaProfiles: Array<'vlc' | 'firefox' | 'chrome' | 'bare'> = isSegment
      ? ['vlc', 'bare']
      : ['vlc', 'firefox', 'chrome', 'bare'];
    let upstream: any = null;
    let lastFetchErr: any = null;

    for (const profile of uaProfiles) {
      try {
        const headers = this.buildUpstreamHeaders(targetUrl, profile);
        // Remove empty string headers (e.g. empty Referer/Origin for VLC profile)
        Object.keys(headers).forEach((k) => { if (!headers[k]) delete headers[k]; });

        upstream = await axios.get(targetUrl, {
          responseType: 'stream',
          timeout,
          maxRedirects: 5,
          headers,
          validateStatus: (s) => s < 400,
        });
        lastFetchErr = null;
        break; // success
      } catch (err: any) {
        lastFetchErr = err;
        const status = err?.response?.status;
        // Only retry on 403 / 407 — other errors (network, 404) should bubble up immediately
        if (status !== 403 && status !== 407) break;
      }
    }

    if (lastFetchErr) throw lastFetchErr;
    if (!upstream) throw new Error('All header profiles failed');

    const ct = (upstream.headers['content-type'] as string || '').toLowerCase();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // ── Classify the response ──
    const pathOnly = targetUrl.split('?')[0];
    const ext = (pathOnly.split('/').pop() || '').split('.').pop()?.toLowerCase() || '';

    const isPlaylistBySignal = ct.includes('mpegurl') || ext === 'm3u8' || !filePath;
    const isBinaryBySignal = !isPlaylistBySignal && (
      /^(video|audio)\//.test(ct) || ct.includes('octet-stream') ||
      ['ts', 'aac', 'mp4', 'fmp4', 'cmfv', 'cmfa', 'mp3'].includes(ext)
    );

    // ── Binary segment → pipe directly ──
    if (isBinaryBySignal) {
      if (ct) res.setHeader('Content-Type', ct);
      upstream.data.pipe(res);
      upstream.data.on('error', () => { if (!res.headersSent) res.status(502).end(); });
      return;
    }

    // ── Possibly a playlist → buffer (max 5 MB) for detection & rewriting ──
    const MAX_PLAYLIST_SIZE = 1 * 1024 * 1024; // 1 MB — typical HLS manifests are < 100 KB
    const bodyBuf = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let settled = false;
      const settle = (err?: Error, buf?: Buffer) => {
        if (settled) return;
        settled = true;
        err ? reject(err) : resolve(buf!);
      };
      upstream.data.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_PLAYLIST_SIZE) {
          upstream.data.destroy();
          settle(new Error('Réponse upstream trop volumineuse'));
        } else {
          chunks.push(chunk);
        }
      });
      upstream.data.on('end', () => settle(undefined, Buffer.concat(chunks)));
      upstream.data.on('error', (err: Error) => settle(err));
    });

    const bodyStr = bodyBuf.toString('utf-8');
    const isPlaylist = isPlaylistBySignal || bodyStr.trimStart().startsWith('#EXTM3U');

    if (isPlaylist) {
      // ── Use the final URL after any 302 redirects as the base for segment resolution ──
      // If the CDN redirects manifest requests to a different server, segment paths like
      // /hls/HASH/*.ts must be resolved against the FINAL host, not the original URL.
      let effectivePlaylistUrl = targetUrl;
      try {
        const req = upstream.request as any;
        if (req?.res?.responseUrl) {
          // axios (some builds) sets responseUrl on the underlying IncomingMessage
          effectivePlaylistUrl = req.res.responseUrl;
        } else if (req?.path && typeof req?.getHeader === 'function') {
          const host = req.getHeader('host') as string;
          const proto = req?.socket?.encrypted ? 'https' : 'http';
          if (host) effectivePlaylistUrl = `${proto}://${host}${req.path}`;
        }
      } catch { /* keep original targetUrl */ }

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return void res.send(this.rewritePlaylist(bodyStr, effectivePlaylistUrl, streamId, token));
    }

    // Unknown content — pass through as-is
    if (ct) res.setHeader('Content-Type', ct);
    return void res.send(bodyBuf);
  }

  /**
   * Rewrite all URLs inside an HLS playlist so they route through the proxy.
   * Handles:
   *  - Segment / sub-playlist URLs (non-tag lines)
   *  - URI="…" inside #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA, #EXT-X-I-FRAME-STREAM-INF, etc.
   */
  private rewritePlaylist(body: string, playlistUrl: string, streamId: string, token: string): string {
    // Normalise line endings
    body = body.replace(/\r\n/g, '\n');

    const playlistBase = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);

    const resolveUrl = (url: string): string => {
      try { return new URL(url).toString(); } catch {}
      if (url.startsWith('/')) {
        try {
          const origin = new URL(playlistBase);
          return `${origin.protocol}//${origin.host}${url}`;
        } catch { return `${playlistBase}${url.slice(1)}`; }
      }
      return `${playlistBase}${url}`;
    };

    const toProxy = (absoluteUrl: string) =>
      `${streamId}?token=${token}&f=${this.encryptSegmentUrl(absoluteUrl)}`;

    // 1. Rewrite URI="…" inside HLS tags (EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA, etc.)
    body = body.replace(/URI="([^"]+)"/gi, (_, uri: string) =>
      `URI="${toProxy(resolveUrl(uri.trim()))}"`,
    );

    // 2. Rewrite segment / sub-playlist URLs (non-empty, non-tag lines)
    body = body.replace(/^(?!#)(\S.*)$/gm, (match) => {
      const fname = match.trim();
      if (!fname) return match;
      return toProxy(resolveUrl(fname));
    });

    return body;
  }

  // ── Segment URL encryption helpers ──
  private encryptSegmentUrl(url: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.segmentEncKey, iv);
    let enc = cipher.update(url, 'utf8', 'base64');
    enc += cipher.final('base64');
    const combined = Buffer.concat([iv, Buffer.from(enc, 'base64')]);
    // base64url (URL-safe, no padding)
    return combined.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private decryptSegmentUrl(encrypted: string): string | null {
    try {
      const b64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
      const combined = Buffer.from(padded, 'base64');
      if (combined.length < 17) return null; // iv(16) + at least 1 byte ciphertext
      const iv = combined.subarray(0, 16);
      const ciphertext = combined.subarray(16);
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.segmentEncKey, iv);
      let dec = decipher.update(ciphertext, undefined, 'utf8');
      dec += decipher.final('utf8');
      return dec;
    } catch {
      return null;
    }
  }

  /**
   * Transparent image proxy for channel picons/logos stored as HTTP URLs.
   * Required because pages are served over HTTPS and browsers block mixed content
   * for http:// URLs whose host is a bare IP address (cannot be auto-upgraded).
   *
   * The `url` query param must be base64url-encoded.
   * Only image/* content types are forwarded. SSRF guard is applied.
   */
  @Get('picon')
  @SkipThrottle()
  @SkipEncryption()
  async proxyPicon(
    @Query('url') encodedUrl: string | undefined,
    @Res() res: Response,
  ) {
    if (!encodedUrl) return res.status(400).end();

    // Decode base64url → original URL
    let targetUrl: string;
    try {
      const b64 = encodedUrl.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
      targetUrl = Buffer.from(padded, 'base64').toString('utf-8');
    } catch {
      return res.status(400).end();
    }

    // Basic URL validation
    try { new URL(targetUrl); } catch { return res.status(400).end(); }

    // SSRF protection — blocks private/loopback/reserved ranges
    try {
      await validateExternalUrl(targetUrl);
    } catch {
      return res.status(403).end();
    }

    // Fetch and proxy (5 s timeout, max 2 redirects)
    try {
      const upstream = await axios.get<import('stream').Readable>(targetUrl, {
        responseType: 'stream',
        timeout: 5000,
        maxRedirects: 2,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
        validateStatus: (s) => s === 200,
      });

      const ct = ((upstream.headers['content-type'] as string) || '').toLowerCase();
      if (!ct.startsWith('image/')) {
        (upstream.data as any).destroy?.();
        return res.status(403).end();
      }

      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      (upstream.data as any).pipe(res);
    } catch {
      if (!res.headersSent) return res.status(502).end();
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getStream(
    @Param('id', ParseUuidPipe) id: string,
    @Query('sourceId') sourceId: string | undefined,
    @Query('ad_token') adToken: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.streamService.getStreamUrl(id, user, sourceId, adToken);
  }
}
