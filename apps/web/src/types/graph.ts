import * as d3 from "d3";

export type NodeType =
  | "organization"
  | "campus"
  | "department"
  | "user"
  | "document"
  | "bubble";

export type Node = d3.SimulationNodeDatum & {
  id: string;
  name: string;
  type: NodeType;
  organizationId?: string;
  campusId?: string;
  departmentId?: string;
  uploadedById?: string;
  email?: string;
  color?: string;
  parentId?: string;
  containedNodes?: Node[];
  isContainedInBubble?: boolean;
};

export type LinkData = d3.SimulationLinkDatum<Node> & { isDetached?: boolean };

export type WorkerMessage =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: "INIT_DATA"; payload: any } // orgHierarchy
  | {
      type: "CALCULATE_GRAPH";
      payload: {
        viewStack: Node[];
        tempNodes: Node[];
        bubbleNode: Node | null;
        bubbleDocuments: Node[];
      };
    };

export type WorkerResponse =
  | { type: "GRAPH_DATA"; payload: { nodes: Node[]; links: LinkData[] } }
  | { type: "ERROR"; payload: string };
