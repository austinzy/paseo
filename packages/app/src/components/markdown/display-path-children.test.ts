import { Children, createElement, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { withDisplayPathText } from "./display-path-children";

const DISPLAY = "C:\\repo\\src\\app.tsx:12";

function node(props: { type: string; content?: string; children?: unknown[] }): ReactNode {
  return createElement("span", { key: props.type, node: props });
}

function renderedNodes(children: ReactNode): Array<Record<string, unknown>> {
  return Children.toArray(children)
    .filter(isValidElement<{ node?: Record<string, unknown> }>)
    .map((child) => child.props.node ?? {});
}

describe("withDisplayPathText", () => {
  it("replaces the content of a lone text node", () => {
    const result = withDisplayPathText(
      [node({ type: "Text", content: "/c/repo/src/app.tsx:12" })],
      DISPLAY,
    );
    expect(renderedNodes(result)).toEqual([{ type: "Text", content: DISPLAY }]);
  });

  // The engine builds inline code from child text nodes and leaves `content` unset, and its
  // code renderer only falls back to those children when `content` is missing.
  it("replaces an inline-code node that carries its text in children", () => {
    const children = [
      node({ type: "Code", children: [{ type: "Text", content: "/c/repo/src/app.tsx:12" }] }),
    ];
    expect(renderedNodes(withDisplayPathText(children, DISPLAY))).toEqual([
      {
        type: "Code",
        content: DISPLAY,
        children: [{ type: "Text", content: "/c/repo/src/app.tsx:12" }],
      },
    ]);
  });

  it("replaces an inline-code node that carries its own content", () => {
    const children = [node({ type: "Code", content: "/c/repo/src/app.tsx:12" })];
    expect(renderedNodes(withDisplayPathText(children, DISPLAY))).toEqual([
      { type: "Code", content: DISPLAY },
    ]);
  });

  it("leaves several candidate nodes alone so the path is not repeated in each", () => {
    const children = [
      node({ type: "Text", content: "/c/repo/" }),
      node({ type: "Code", content: "src/app.tsx:12" }),
    ];
    expect(renderedNodes(withDisplayPathText(children, DISPLAY))).toEqual([
      { type: "Text", content: "/c/repo/" },
      { type: "Code", content: "src/app.tsx:12" },
    ]);
  });

  it("keeps the engine's own rendering when the node shape is unfamiliar", () => {
    expect(renderedNodes(withDisplayPathText([node({ type: "Strong" })], DISPLAY))).toEqual([
      { type: "Strong" },
    ]);
    expect(renderedNodes(withDisplayPathText([node({ type: "Code" })], DISPLAY))).toEqual([
      { type: "Code" },
    ]);
    expect(
      renderedNodes(withDisplayPathText([createElement("span", { key: "bare" })], DISPLAY)),
    ).toEqual([{}]);
  });

  it("leaves children that are not elements alone", () => {
    expect(withDisplayPathText("/c/repo/src/app.tsx:12", DISPLAY)).toBe("/c/repo/src/app.tsx:12");
  });
});
