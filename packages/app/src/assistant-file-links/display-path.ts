import { looksLikeWindowsPath, rewriteMsysDrivePath } from "@/utils/path";

interface FormatFileLinkDisplayTextInput {
  token: string;
  workspaceRoot?: string;
}

export function formatFileLinkDisplayText({
  token,
  workspaceRoot,
}: FormatFileLinkDisplayTextInput): string | null {
  if (!workspaceRoot || !looksLikeWindowsPath(workspaceRoot)) {
    return null;
  }

  const rewritten = rewriteMsysDrivePath(token);
  return rewritten === token ? null : rewritten.replace(/\//g, "\\");
}
