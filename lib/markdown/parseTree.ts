export interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
}

/**
 * Parse a strict nested markdown bullet list into a tree.
 * Expected shape (matches `lib/prompts/mindmap.ts`):
 *   - Root
 *     - Branch
 *       - Sub-node
 *
 * Supports `-`, `*`, `+` markers and 2-space OR tab indentation.
 * Lines that don't match the bullet pattern are ignored.
 * If multiple top-level bullets are present, they're wrapped under a synthetic root.
 */
export function parseMarkdownTree(md: string): TreeNode | null {
  const lines = md.split("\n");
  type Entry = { depth: number; label: string };
  const entries: Entry[] = [];

  for (const raw of lines) {
    const m = raw.match(/^([ \t]*)[-*+]\s+(.+?)\s*$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, "  ");
    const depth = Math.floor(indent.length / 2);
    const label = m[2].replace(/\*\*/g, "").trim();
    if (label) entries.push({ depth, label });
  }

  if (entries.length === 0) return null;

  // Normalize so the shallowest entry has depth 0.
  const minDepth = Math.min(...entries.map((e) => e.depth));
  for (const e of entries) e.depth -= minDepth;

  let counter = 0;
  const make = (label: string): TreeNode => ({
    id: `n${counter++}`,
    label,
    children: [],
  });

  // Build using a stack indexed by depth.
  const stack: TreeNode[] = [];
  const roots: TreeNode[] = [];

  for (const e of entries) {
    const node = make(e.label);
    if (e.depth === 0) {
      roots.push(node);
      stack.length = 0;
      stack[0] = node;
    } else {
      const parent = stack[e.depth - 1];
      if (!parent) {
        // Malformed — treat as root.
        roots.push(node);
      } else {
        parent.children.push(node);
      }
      stack[e.depth] = node;
      stack.length = e.depth + 1;
    }
  }

  if (roots.length === 1) return roots[0];
  return {
    id: "root",
    label: "Mindmap",
    children: roots,
  };
}
