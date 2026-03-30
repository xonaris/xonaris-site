import { Controller, Get, Param, Query, Headers, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import axios from 'axios';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipEncryption } from '../common/decorators/skip-encryption.decorator';
import { validateExternalUrl } from '../common/utils/ssrf-guard';
import { StreamService } from './stream.service';

@Controller('stream')
@Throttle({ medium: { limit: 120, ttl: 60000 } })
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

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
   * GET /stream/proxy/:streamId?token=xxx&f=seg.ts  → serve segment / sub-playlist
   */
  @Get('proxy/:streamId')
  @SkipEncryption()
  async proxyStream(
    @Param('streamId') streamId: string,
    @Query('token') token: string,
    @Query('f') filePath: string | undefined,
    @Res() res: Response,
  ) {
    // Verify the stream token and extract payload
    if (!token) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Token manquant' });
    }
    const tokenPayload = this.streamService.verifyTokenFull(token);
    if (!tokenPayload) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Token invalide ou expiré' });
    }

    // Resolve the actual HLS base URL from DB, validating it belongs to the token's channel
    const hlsUrl = await this.streamService.resolveHlsUrl(streamId, tokenPayload.channel_id);
    if (!hlsUrl) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Source introuvable' });
    }

    // Build the target URL
    const baseUrl = hlsUrl.substring(0, hlsUrl.lastIndexOf('/') + 1);
    const targetUrl = filePath ? `${baseUrl}${filePath}` : hlsUrl;

    // SSRF protection: validate the target URL points to external host
    try {
      await validateExternalUrl(targetUrl);
    } catch {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'URL bloquée' });
    }

    try {
      const upstream = await axios.get(targetUrl, {
        responseType: 'stream',
        timeout: 15000,
        headers: { 'User-Agent': 'Xonaris-StreamProxy/1.0' },
      });

      // Set appropriate content type
      const contentType = upstream.headers['content-type'] as string | undefined;
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const isM3u8 = !filePath || filePath.endsWith('.m3u8') ||
        (contentType && contentType.includes('mpegurl'));

      if (isM3u8) {
        // Rewrite playlist segment URLs to go through our proxy as ?f= param
        const chunks: Buffer[] = [];
        upstream.data.on('data', (chunk: Buffer) => chunks.push(chunk));
        upstream.data.on('end', () => {
          let body = Buffer.concat(chunks).toString('utf-8');
          // Compute the base directory of the current playlist for relative resolution
          const playlistBase = filePath
            ? (() => {
                const idx = filePath.lastIndexOf('/');
                return idx >= 0 ? filePath.substring(0, idx + 1) : '';
              })()
            : '';
          body = body.replace(/^(?!#)(.+)$/gm, (match) => {
            let fname = match.trim();
            if (!fname) return match;
            // Handle absolute URLs: extract path relative to the base URL
            try {
              const u = new URL(fname);
              const baseParsed = new URL(baseUrl);
              // If same host, compute relative path from base
              if (u.host === baseParsed.host) {
                const basePath = baseParsed.pathname.replace(/\/[^/]*$/, '/');
                fname = u.pathname.startsWith(basePath)
                  ? u.pathname.slice(basePath.length)
                  : u.pathname;
                if (u.search) fname += u.search;
              } else {
                // External URL — keep as relative of full path
                fname = u.pathname.split('/').pop() || fname;
                if (u.search) fname += u.search;
              }
            } catch {
              // Relative URL — resolve against current playlist directory
              if (!fname.startsWith('/')) {
                fname = playlistBase + fname;
              }
            }
            return `${streamId}?token=${token}&f=${encodeURIComponent(fname)}`;
          });
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.send(body);
        });
        upstream.data.on('error', () => {
          if (!res.headersSent) res.status(502).json({ message: 'Erreur upstream' });
        });
      } else {
        // Binary segments — pipe directly
        upstream.data.pipe(res);
      }
    } catch (err: any) {
      if (!res.headersSent) {
        const status = err?.response?.status || 502;
        res.status(status).json({ message: 'Erreur lors du chargement du flux' });
      }
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getStream(
    @Param('id') id: string,
    @Query('sourceId') sourceId: string | undefined,
    @Query('ad_token') adToken: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.streamService.getStreamUrl(id, user, sourceId, adToken);
  }
}
