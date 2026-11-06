export function isAbsolutePath(value: string): boolean {
  return value.startsWith("/") || value.startsWith("\\\\") || /^[A-Za-z]:[\\/]/.test(value);
}

export function looksLikeWindowsPath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\") || value.startsWith("//");
}

export function rewriteMsysDrivePath(value: string): string {
  return value.replace(/^\/([A-Za-z])(?:\/|$)/, (_, drive: string) => `${drive.toUpperCase()}:/`);
}
