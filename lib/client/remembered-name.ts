/** Per-device convenience: prefill the last name used. Never relied on for anything important. */
const KEY = "christmas-bid:name";

export function readRememberedName(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberName(name: string): void {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {
    /* storage blocked: fine */
  }
}
