import { describe, expect, it } from "vitest";
import { formatFileLinkDisplayText } from "./display-path";

describe("formatFileLinkDisplayText", () => {
  it("rewrites MSYS tokens to backslash Windows paths on a Windows host", () => {
    expect(
      formatFileLinkDisplayText({
        token: "/c/repo/src/app.tsx:12",
        workspaceRoot: "C:/repo",
      }),
    ).toBe("C:\\repo\\src\\app.tsx:12");
  });

  it("rewrites MSYS tokens without a line suffix", () => {
    expect(
      formatFileLinkDisplayText({
        token: "/c/repo/README.md",
        workspaceRoot: "C:/repo",
      }),
    ).toBe("C:\\repo\\README.md");
  });

  it("returns null for tokens that are already Windows-shaped", () => {
    expect(
      formatFileLinkDisplayText({
        token: "C:/repo/src/app.tsx:12",
        workspaceRoot: "C:/repo",
      }),
    ).toBeNull();
  });

  it("returns null when the workspace root does not prove a Windows host", () => {
    expect(
      formatFileLinkDisplayText({
        token: "/c/repo/src/app.tsx",
        workspaceRoot: "/repo",
      }),
    ).toBeNull();
  });

  it("returns null for multi-letter leading segments", () => {
    expect(
      formatFileLinkDisplayText({
        token: "/usr/local/lib/foo.ts",
        workspaceRoot: "C:/repo",
      }),
    ).toBeNull();
  });

  it("returns null for relative tokens", () => {
    expect(
      formatFileLinkDisplayText({
        token: "src/app.tsx",
        workspaceRoot: "C:/repo",
      }),
    ).toBeNull();
  });

  it("returns null when the workspace root is unavailable", () => {
    expect(formatFileLinkDisplayText({ token: "/c/repo/src/app.tsx:12" })).toBeNull();
  });
});
