import type { Diagram, DiagramEdge, DiagramNode, ExcalidrawElementLike } from "@/types/diagram";

type NodeLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const GRID_GAP_X = 280;
const GRID_GAP_Y = 220;
const GRID_START_X = 80;
const GRID_START_Y = 80;

function randomInt() {
  return Math.floor(Math.random() * 2_147_483_647);
}

function createBaseElement() {
  return {
    id: crypto.randomUUID(),
    seed: randomInt(),
    version: 1,
    versionNonce: randomInt(),
    isDeleted: false,
    groupIds: [] as string[],
    frameId: null,
    updated: Date.now(),
    link: null,
    locked: false
  };
}

function createRectangleElement(node: DiagramNode, layout: NodeLayout): ExcalidrawElementLike {
  return {
    ...createBaseElement(),
    type: "rectangle",
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    angle: 0,
    strokeColor: "#1f2937",
    backgroundColor: "#dbeafe",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    roundness: { type: 3 },
    boundElements: null,
    customData: {
      sourceNodeId: node.id
    }
  };
}

function createLabelElement(node: DiagramNode, layout: NodeLayout): ExcalidrawElementLike {
  const fontSize = 24;
  const lineHeight = 1.25;
  const textWidth = Math.max(80, Math.min(layout.width - 24, node.label.length * 10));
  const textHeight = fontSize * lineHeight;

  return {
    ...createBaseElement(),
    type: "text",
    x: layout.x + 12,
    y: layout.y + layout.height / 2 - textHeight / 2,
    width: textWidth,
    height: textHeight,
    angle: 0,
    strokeColor: "#111827",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    roundness: null,
    boundElements: null,
    fontSize,
    fontFamily: 1,
    text: node.label,
    textAlign: "left",
    verticalAlign: "middle",
    baseline: fontSize,
    containerId: null,
    originalText: node.label,
    lineHeight,
    autoResize: true
  };
}

function createArrowElement(edge: DiagramEdge, from: NodeLayout, to: NodeLayout): ExcalidrawElementLike {
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  const endX = to.x + to.width / 2;
  const endY = to.y + to.height / 2;
  const dx = endX - startX;
  const dy = endY - startY;

  return {
    ...createBaseElement(),
    type: "arrow",
    x: startX,
    y: startY,
    width: Math.abs(dx),
    height: Math.abs(dy),
    angle: 0,
    strokeColor: "#1f2937",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    roundness: null,
    boundElements: null,
    points: [
      [0, 0],
      [dx, dy]
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
    customData: {
      from: edge.from,
      to: edge.to
    }
  };
}

function buildNodeLayout(nodes: DiagramNode[]): Record<string, NodeLayout> {
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const map: Record<string, NodeLayout> = {};

  nodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    map[node.id] = {
      x: GRID_START_X + col * GRID_GAP_X,
      y: GRID_START_Y + row * GRID_GAP_Y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    };
  });

  return map;
}

export function buildExcalidrawElements(diagram: Diagram): ExcalidrawElementLike[] {
  const layouts = buildNodeLayout(diagram.nodes);
  const elements: ExcalidrawElementLike[] = [];

  for (const node of diagram.nodes) {
    const layout = layouts[node.id];
    elements.push(createRectangleElement(node, layout));
    elements.push(createLabelElement(node, layout));
  }

  for (const edge of diagram.edges) {
    const fromLayout = layouts[edge.from];
    const toLayout = layouts[edge.to];

    if (!fromLayout || !toLayout) {
      continue;
    }

    elements.push(createArrowElement(edge, fromLayout, toLayout));
  }

  return elements;
}
