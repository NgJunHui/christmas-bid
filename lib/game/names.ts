import { LIMITS } from "./constants";

// Control characters and bidi overrides that could garble how a name renders.
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g;

/**
 * Names are letters and numbers (any alphabet) with single spaces between words,
 * e.g. "Mary Jane". No symbols, and no leading, trailing or double spaces.
 * Callers validate the *normalized* name, which already trims and collapses spaces.
 */
const NAME_PATTERN = /^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u;
const NOT_NAME_CHAR = /[^\p{L}\p{N} ]/gu;

export const NAME_RULE_MESSAGE = `Letters, numbers and spaces only, up to ${LIMITS.nameMaxLength}.`;

/** Trim, collapse whitespace, and strip invisible control characters. */
export function normalizeName(raw: string): string {
  return raw.normalize("NFC").replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim();
}

/** Length in user-perceived characters (code points), so accented letters count as one. */
export function nameLength(name: string): number {
  return [...name].length;
}

export function isValidName(name: string): boolean {
  const length = nameLength(name);
  return length >= 1 && length <= LIMITS.nameMaxLength && NAME_PATTERN.test(name);
}

/**
 * For inputs: drop disallowed characters and cap the length as the user types.
 * Spaces are tidied silently (no leading space, no doubles); a single trailing space
 * is kept so the next word can be typed. `changed` flags only real rule hits
 * (symbols removed or too long), so tidying spaces never shows an error.
 */
export function sanitizeNameInput(raw: string): { value: string; changed: boolean } {
  const spaced = raw.normalize("NFC").replace(/\s/gu, " ");
  const kept = spaced.replace(NOT_NAME_CHAR, "");
  const tidy = [...kept.replace(/ {2,}/g, " ").replace(/^ /, "")];
  const value = tidy.slice(0, LIMITS.nameMaxLength).join("");
  return { value, changed: kept !== spaced || tidy.length > LIMITS.nameMaxLength };
}

/** Case-insensitive comparison key for duplicate-name checks. */
export function nameKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase("en");
}
