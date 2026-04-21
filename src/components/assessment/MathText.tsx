/**
 * MathText — renders a string that may contain:
 *   1. Explicit LaTeX: \(...\) inline  or  \[...\] block
 *   2. Plain-text math notation (x^2, \frac{1}{2}, etc.) — auto-wrapped in KaTeX
 *
 * Usage:
 *   <MathText text="Find \(x^2 + 3x - 4\) when x = 2" />
 *   <MathText text="x^3 - 4x^2 + 4x" />          ← auto-detected as math
 */
import { Fragment } from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string | null | undefined;
  className?: string;
}

// ── Segment types ─────────────────────────────────────────────────────────────
type Segment =
  | { type: "text";   content: string }
  | { type: "inline"; content: string }
  | { type: "block";  content: string };

// ── Detect whether a plain string looks like math ─────────────────────────────
// Matches common patterns: exponents (x^2), subscripts (x_1), \frac, \sqrt,
// greek letters (\alpha), and polynomial coefficients combined with ^.
const MATH_LIKE_RE =
  /\^[{(]?\d+[)}]?|_[{(]?\d+[)}]?|\\(?:frac|sqrt|sum|int|prod|alpha|beta|gamma|delta|theta|pi|lambda|mu|sigma|infty|cdot|times|div|pm|leq|geq|neq|in|subset|cup|cap)\b|\d+x\^|\bx\^/;

function looksLikeMath(s: string): boolean {
  return MATH_LIKE_RE.test(s);
}

// ── Split explicit LaTeX delimiters ──────────────────────────────────────────
function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  // Match \[...\] (block) or \(...\) (inline)
  const re = /\\\[(.+?)\\\]|\\\((.+?)\\\)/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: raw.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "block", content: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: "inline", content: match[2] });
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: "text", content: raw.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content: raw }];
}

// ── Render a single KaTeX math segment, falling back gracefully ───────────────
function SafeInlineMath({ math }: { math: string }) {
  return (
    <InlineMath
      math={math}
      renderError={() => <span className="font-mono text-foreground">{math}</span>}
    />
  );
}

function SafeBlockMath({ math }: { math: string }) {
  return (
    <span className="block my-1">
      <BlockMath
        math={math}
        renderError={() => <span className="font-mono text-foreground">{math}</span>}
      />
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MathText({ text, className }: MathTextProps) {
  if (!text) return null;

  const segments = parseSegments(text);
  const hasOnlyText = segments.every((s) => s.type === "text");

  // If no explicit LaTeX delimiters but the whole string looks like math,
  // render the entire string as inline KaTeX.
  if (hasOnlyText && looksLikeMath(text)) {
    return (
      <span className={className}>
        <SafeInlineMath math={text} />
      </span>
    );
  }

  // Fast path — purely plain text, no math detected
  if (hasOnlyText) {
    return <span className={className}>{text}</span>;
  }

  // Mixed content — render segment by segment
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          // Each plain-text fragment may itself contain undelimited math
          if (looksLikeMath(seg.content)) {
            return <SafeInlineMath key={i} math={seg.content} />;
          }
          return <Fragment key={i}>{seg.content}</Fragment>;
        }
        if (seg.type === "block") {
          return <SafeBlockMath key={i} math={seg.content} />;
        }
        return <SafeInlineMath key={i} math={seg.content} />;
      })}
    </span>
  );
}
