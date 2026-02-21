/**
 * Split `text` into alternating plain/highlighted segments based on the
 * raw (unstemmed) query words.  Matching is case-insensitive.
 *
 * @example
 * highlight("Quantum Kernel Training", ["kernel", "train"])
 * // → [
 * //     { text: "Quantum ", highlighted: false },
 * //     { text: "Kernel", highlighted: true },
 * //     { text: " ", highlighted: false },
 * //     { text: "Train", highlighted: true },
 * //     { text: "ing", highlighted: false },
 * //   ]
 */
export interface Segment {
  text: string;
  highlighted: boolean;
}

export function highlight(text: string, queryWords: string[]): Segment[] {
  if (!queryWords.length) return [{ text, highlighted: false }];

  // Build a regex that matches any query word (partial, case-insensitive)
  const escaped = queryWords
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (!escaped.length) return [{ text, highlighted: false }];

  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);

  const lower = queryWords.map((w) => w.toLowerCase());

  return parts
    .filter((p) => p.length > 0)
    .map((part) => ({
      text: part,
      highlighted: lower.some((w) => part.toLowerCase().startsWith(w.slice(0, 3))),
      // Use startsWith(prefix) so partial word matches (e.g. "Kernel" for "kern")
      // are highlighted even when the regex split point falls mid-word.
    }));
}
