import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * The only fields we read off the engine's RenderNode children. The library does not
 * export `RenderNodeProps` from its public entry, and importing it out of the build output
 * breaks on any upgrade that moves the file, so this mirrors just what we touch and the
 * guard below degrades to the untouched children if that shape ever changes.
 */
interface PathTextNode {
  type: string;
  content?: string;
  children?: unknown[];
}

/**
 * A `Text` node holds its string in `content`. The engine builds inline code from child text
 * nodes and leaves `content` unset, and its code renderer reads those children only when
 * `content` is missing, so writing `content` replaces what either node displays.
 */
function isPathTextNode(child: ReactNode): child is ReactElement<{ node: PathTextNode }> {
  if (!isValidElement<{ node?: Partial<PathTextNode> }>(child)) return false;
  const node = child.props.node;
  if (!node) return false;
  if (node.type === "Text") return typeof node.content === "string";
  if (node.type !== "Code") return false;
  return typeof node.content === "string" || Array.isArray(node.children);
}

/**
 * Swap the path a link displays while leaving the engine to render its own nodes, so
 * inline-code fonts and backgrounds survive. Only a link whose visible text is a single
 * path token qualifies: replacing several nodes would repeat the whole path in each one.
 */
export function withDisplayPathText(children: ReactNode, displayText: string): ReactNode {
  if (Children.toArray(children).filter(isPathTextNode).length !== 1) return children;
  return Children.map(children, (child) =>
    isPathTextNode(child)
      ? cloneElement(child, { node: { ...child.props.node, content: displayText } })
      : child,
  );
}
