import { Text } from "react-native";
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import type {
  CodeBlockRendererProps,
  LinkRendererProps,
  MarkdownRenderers,
} from "react-native-enriched-markdown";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import {
  formatFileLinkDisplayText,
  useAssistantFileLinkEnvironment,
  useFileLink,
} from "@/assistant-file-links";
import { useForgeShorthand } from "@/git/forge-shorthand";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HighlightedCodeBlock } from "@/components/highlighted-code-block";
import type { Theme } from "@/styles/theme";
import { MermaidFence } from "./fence/mermaid";
import { markdownLinkSource } from "./source";

const ThemedCodeBlock = withUnistyles(HighlightedCodeBlock);
const codeStyle = (theme: Theme) => ({
  inheritedStyles: {
    color: theme.colors.foreground,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.code,
  },
  textStyle: { backgroundColor: theme.colors.surface2, padding: 12, borderRadius: 8 },
});
function WebCodeBlock({ code, language }: CodeBlockRendererProps) {
  if (language?.toLowerCase() === "mermaid") return <MermaidFence code={code} />;
  return <ThemedCodeBlock code={code} language={language} uniProps={codeStyle} />;
}

// The library styles links inline, so a stylesheet :hover rule cannot underline them.
const LINK_HOVER_STYLE = { textDecoration: "underline" } as const;

/**
 * The only two fields we read off the engine's RenderNode children. The library does not
 * export `RenderNodeProps` from its public entry, and importing it out of the build output
 * breaks on any upgrade that moves the file, so this mirrors just what we touch and the
 * guard below degrades to the untouched children if that shape ever changes.
 */
interface PathTextNode {
  type: string;
  content: string;
}

function isPathTextNode(child: ReactNode): child is ReactElement<{ node: PathTextNode }> {
  if (!isValidElement<{ node?: Partial<PathTextNode> }>(child)) return false;
  const node = child.props.node;
  if (!node || typeof node.content !== "string") return false;
  return node.type === "Text" || node.type === "Code";
}

/**
 * Swap the path a link displays while leaving the engine to render its own nodes, so
 * inline-code fonts and backgrounds survive. Only a link whose visible text is a single
 * path token qualifies: replacing several nodes would repeat the whole path in each one.
 */
function withDisplayPathText(children: ReactNode, displayText: string): ReactNode {
  if (Children.toArray(children).filter(isPathTextNode).length !== 1) return children;
  return Children.map(children, (child) =>
    isPathTextNode(child)
      ? cloneElement(child, { node: { ...child.props.node, content: displayText } })
      : child,
  );
}

function WebLink({ link, anchorProps, children }: LinkRendererProps) {
  const { workspaceRoot } = useAssistantFileLinkEnvironment();
  const forgeShorthand = useForgeShorthand();
  // A forge reference like `#12` carries its web URL so hover, copy and new-tab opens work.
  const forgeUrl = link.sourceType === "text" ? forgeShorthand?.resolve(link.url) : null;
  const { target, tooltipPath, onHoverIn } = useFileLink(
    forgeUrl ? markdownLinkSource(forgeUrl) : markdownLinkSource(link.url, link.sourceType),
  );
  const tooltip = forgeUrl ?? tooltipPath;
  const displayText =
    target && link.sourceType !== "markdown"
      ? formatFileLinkDisplayText({ token: target.raw, workspaceRoot })
      : null;
  const displayChildren =
    displayText === null ? children : withDisplayPathText(children, displayText);
  const [hovered, setHovered] = useState(false);
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const anchorStyle = useMemo(
    () => ({
      ...anchorProps.style,
      overflowWrap: "anywhere" as const,
      ...(hovered ? LINK_HOVER_STYLE : null),
    }),
    [anchorProps.style, hovered],
  );
  const anchor = (
    <a
      {...anchorProps}
      href={forgeUrl ?? anchorProps.href}
      style={anchorStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {displayChildren}
    </a>
  );
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild onHoverIn={onHoverIn}>
        <InlineLinkTrigger>{anchor}</InlineLinkTrigger>
      </TooltipTrigger>
      {tooltip ? (
        <TooltipContent side="top" align="start" maxWidth={520}>
          <Text selectable={false} style={styles.tooltipPath}>
            {tooltip}
          </Text>
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}
// TooltipTrigger also supplies native Pressable handlers; forward only DOM events.
// A View renders a div, which is invalid inside the library's prose paragraphs.
const InlineLinkTrigger = forwardRef<HTMLSpanElement, ComponentProps<"span">>(
  function InlineLinkTrigger({ children, onMouseEnter, onMouseLeave, onFocus, onBlur }, ref) {
    return (
      <span
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {children}
      </span>
    );
  },
);
const styles = StyleSheet.create((theme) => ({
  tooltipPath: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
}));

export const WEB_RENDERERS: MarkdownRenderers = { codeBlock: WebCodeBlock, link: WebLink };
