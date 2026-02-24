import { z } from "zod";

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200)
});

export const diagramEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1)
});

export const diagramSchema = z.object({
  nodes: z.array(diagramNodeSchema).max(200),
  edges: z.array(diagramEdgeSchema).max(400)
});

export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
export type Diagram = z.infer<typeof diagramSchema>;

export type ExcalidrawElementLike = Record<string, unknown>;

export type GenerateRouteRequest = {
  prompt: string;
  model: string;
};

export type GenerateRouteResponse = {
  elements: ExcalidrawElementLike[];
  diagram: Diagram;
};
