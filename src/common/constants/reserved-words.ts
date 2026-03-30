/**
 * Pseudo validation rules for Xonaris accounts.
 * - 3–20 chars, letters/digits/underscore only
 * - Two-tier reserved word check:
 *   BLOCKED_SUBSTRINGS: blocked if found anywhere (brand/role names)
 *   BLOCKED_EXACT: blocked only on exact match (short common words)
 */

/** Words blocked as substring — never allowed inside a pseudo */
const BLOCKED_SUBSTRINGS = [
  'xonaris',
  'admin',
  'administrator',
  'administrateur',
  'moderator',
  'moderateur',
  'support',
  'official',
  'officiel',
  'anonymous',
  'anonyme',
  'undefined',
];

/** Words blocked only on exact match — too short to substring-block */
const BLOCKED_EXACT = [
  'mod',
  'root',
  'system',
  'systeme',
  'staff',
  'bot',
  'help',
  'aide',
  'info',
  'contact',
  'null',
  'test',
  'demo',
  'api',
  'server',
  'serveur',
];

export function validatePseudo(
  pseudo: string,
): { valid: boolean; error?: string } {
  if (!pseudo || typeof pseudo !== 'string') {
    return { valid: false, error: 'Le pseudo est requis' };
  }

  if (pseudo.length < 3 || pseudo.length > 20) {
    return {
      valid: false,
      error: 'Le pseudo doit contenir entre 3 et 20 caractères',
    };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(pseudo)) {
    return {
      valid: false,
      error:
        'Le pseudo ne peut contenir que des lettres (sans accents), chiffres et underscores',
    };
  }

  const letterCount = (pseudo.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 3) {
    return {
      valid: false,
      error: 'Le pseudo doit contenir au moins 3 lettres alphabétiques',
    };
  }

  const lower = pseudo.toLowerCase();

  // Substring check (brand / role names)
  for (const word of BLOCKED_SUBSTRINGS) {
    if (lower.includes(word)) {
      return {
        valid: false,
        error: `Le pseudo contient un mot réservé : "${word}"`,
      };
    }
  }

  // Exact match check (short words)
  for (const word of BLOCKED_EXACT) {
    if (lower === word) {
      return {
        valid: false,
        error: `Le pseudo "${word}" est réservé`,
      };
    }
  }

  return { valid: true };
}
