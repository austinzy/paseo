import { describe, expect, it } from "vitest";
import { isAbsolutePath, looksLikeWindowsPath, rewriteMsysDrivePath } from "./path";

describe("isAbsolutePath", () => {
  it("returns true for Unix absolute paths", () => {
    expect(isAbsolutePath("/")).toBe(true);
    expect(isAbsolutePath("/home/user")).toBe(true);
    expect(isAbsolutePath("/tmp/file.txt")).toBe(true);
  });

  it("returns true for Windows drive letter paths", () => {
    expect(isAbsolutePath("C:\\Users")).toBe(true);
    expect(isAbsolutePath("C:/Users")).toBe(true);
    expect(isAbsolutePath("d:\\projects")).toBe(true);
  });

  it("returns true for UNC paths", () => {
    expect(isAbsolutePath("\\\\server\\share")).toBe(true);
    expect(isAbsolutePath("\\\\\\\\host\\path")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isAbsolutePath("foo/bar")).toBe(false);
    expect(isAbsolutePath("./relative")).toBe(false);
    expect(isAbsolutePath("../parent")).toBe(false);
    expect(isAbsolutePath("")).toBe(false);
    expect(isAbsolutePath("file.txt")).toBe(false);
  });

  it("returns false for edge cases that are not absolute paths", () => {
    expect(isAbsolutePath("")).toBe(false);
    expect(isAbsolutePath("C:")).toBe(false);
  });

  it("handles mixed separators in absolute paths", () => {
    expect(isAbsolutePath("C:/Users\\mixed/path")).toBe(true);
    expect(isAbsolutePath("/tmp\\mixed/path")).toBe(true);
  });
});

describe("looksLikeWindowsPath", () => {
  it("returns true for drive letter paths", () => {
    expect(looksLikeWindowsPath("C:/x")).toBe(true);
    expect(looksLikeWindowsPath("c:\\x")).toBe(true);
  });

  it("returns true for UNC paths", () => {
    expect(looksLikeWindowsPath("\\\\server\\share\\x")).toBe(true);
    expect(looksLikeWindowsPath("//server/share/x")).toBe(true);
  });

  it("returns false for POSIX absolute paths", () => {
    expect(looksLikeWindowsPath("/repo")).toBe(false);
  });

  it("returns false for MSYS drive paths so they cannot prove the host is Windows", () => {
    expect(looksLikeWindowsPath("/c/repo")).toBe(false);
  });

  it("returns false for an empty value", () => {
    expect(looksLikeWindowsPath("")).toBe(false);
  });
});

describe("rewriteMsysDrivePath", () => {
  it("rewrites a leading single-letter segment to an uppercase drive", () => {
    expect(rewriteMsysDrivePath("/c/Users/x")).toBe("C:/Users/x");
    expect(rewriteMsysDrivePath("/d/other/app.tsx")).toBe("D:/other/app.tsx");
  });

  it("rewrites an already uppercase drive segment", () => {
    expect(rewriteMsysDrivePath("/C/Users/x")).toBe("C:/Users/x");
  });

  it("rewrites a bare drive segment to a drive root", () => {
    expect(rewriteMsysDrivePath("/c")).toBe("C:/");
  });

  it("leaves multi-letter leading segments untouched", () => {
    expect(rewriteMsysDrivePath("/usr/local/lib")).toBe("/usr/local/lib");
    expect(rewriteMsysDrivePath("/code/src")).toBe("/code/src");
  });

  it("leaves paths that are already Windows-shaped untouched", () => {
    expect(rewriteMsysDrivePath("C:/already/win")).toBe("C:/already/win");
  });

  it("leaves the root and an empty value untouched", () => {
    expect(rewriteMsysDrivePath("/")).toBe("/");
    expect(rewriteMsysDrivePath("")).toBe("");
  });
});
