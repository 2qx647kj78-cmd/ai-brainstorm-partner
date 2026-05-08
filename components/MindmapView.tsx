"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TreeNode } from "@/lib/markdown/parseTree";

const COLUMN_WIDTH = 240;
const ROW_HEIGHT = 56;

interface Layout {
  nodes: Node[];
  edges: Edge[];
}

function buildLayout(root: TreeNode): Layout {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Count leaves so we can compute vertical centers.
  function leafCount(n: TreeNode): number {
    if (n.children.length === 0) return 1;
    return n.children.reduce((sum, c) => sum + leafCount(c), 0);
  }

  // Walk the tree and compute (x, y) for every node.
  let leafCursor = 0;
  function place(
    node: TreeNode,
    depth: number,
    parentId: string | null,
  ): number {
    const x = depth * COLUMN_WIDTH;
    let y: number;

    if (node.children.length === 0) {
      y = leafCursor * ROW_HEIGHT;
      leafCursor += 1;
    } else {
      const childYs = node.children.map((c) => place(c, depth + 1, node.id));
      y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }

    const isRoot = depth === 0;
    nodes.push({
      id: node.id,
      position: { x, y },
      data: { label: node.label },
      type: "default",
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: isRoot ? "#18181b" : "#ffffff",
        color: isRoot ? "#ffffff" : "#18181b",
        border: isRoot ? "1px solid #18181b" : "1px solid #e4e4e7",
        borderRadius: 12,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: isRoot ? 600 : 400,
        width: COLUMN_WIDTH - 40,
      },
    });
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: "smoothstep",
        style: { stroke: "#a1a1aa", strokeWidth: 1.5 },
      });
    }
    return y;
  }

  place(root, 0, null);
  return { nodes, edges };
}

export default function MindmapView({ tree }: { tree: TreeNode }) {
  const { nodes, edges } = useMemo(() => buildLayout(tree), [tree]);

  return (
    <div className="h-[480px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background gap={20} size={1} color="#e4e4e7" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
