/**
 * Global input sanitization middleware.
 * Strips dangerous characters and blocks prototype-pollution keys.
 * Applied AFTER encryption decryption, BEFORE validation pipes.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/[<>]/g, '')    // Strip basic XSS vectors
      .replace(/\0/g, '')      // Null bytes
      .replace(/javascript:/gi, '')  // JS URI scheme
      .replace(/data:\s*text\/html/gi, '')  // data: HTML URI scheme
      .replace(/on\w+\s*=/gi, '')    // Inline event handlers
      .replace(/on\w+\s*\n*\s*=/gi, '')  // Event handlers with newlines
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Block prototype-pollution vectors
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    result[key] = sanitizeValue(val);
  }
  return result;
}

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    // Sanitize ALL routes including admin — prevents stored XSS
    // Admin content is sanitized on input; safe HTML should use a
    // dedicated allowlist-based sanitizer if needed in the future.

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    // Sanitize query params
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeValue(req.query[key]) as string;
        }
      }
    }
    next();
  }
}
