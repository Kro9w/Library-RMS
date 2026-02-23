/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Node, LinkData, WorkerMessage, WorkerResponse } from "../types/graph";

// State
let orgHierarchy: any = null;
let userMap: Map<string, any> = new Map();
let deptMap: Map<string, any> = new Map();

// Helper Functions
function buildMaps(orgHierarchy: any) {
  const uMap = new Map<string, any>();
  const dMap = new Map<string, any>();

  if (orgHierarchy) {
    for (const c of orgHierarchy.campuses) {
      for (const d of c.departments) {
        dMap.set(d.id, d);
        for (const u of d.users) {
          uMap.set(u.id, u);
        }
      }
    }
  }
  return { userMap: uMap, deptMap: dMap };
}

function computeGraphData(
  viewStack: Node[],
  tempNodes: Node[],
  bubbleNode: Node | null,
  bubbleDocuments: Node[]
) {
    if (!orgHierarchy || viewStack.length === 0)
      return { nodes: [], links: [] };

    const currentRoot = viewStack[viewStack.length - 1];
    const nodes: Node[] = [];
    const links: LinkData[] = [];

    const bubbleDocIds = new Set(bubbleDocuments.map((d) => d.id));

    // Mother Node (Starts at Center, Movable)
    const rootNodeForGraph: Node = {
      ...currentRoot,
      vx: 0,
      vy: 0,
      fx: undefined,
      fy: undefined,
    };
    nodes.push(rootNodeForGraph);

    // Children Generator Helper
    const addNode = (n: Node) => {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 50 + Math.random() * 100;
      n.x = Math.cos(angle) * radius;
      n.y = Math.sin(angle) * radius;
      nodes.push(n);
    };

    if (currentRoot.type === "organization") {
      orgHierarchy.campuses.forEach((c: any) => {
        addNode({
          id: c.id,
          name: c.name,
          type: "campus",
          parentId: currentRoot.id,
          color: "var(--primary)",
        });
      });
    } else if (currentRoot.type === "campus") {
      const campus = orgHierarchy.campuses.find(
        (c: any) => c.id === currentRoot.id,
      );
      if (campus) {
        campus.departments.forEach((d: any) => {
          addNode({
            id: d.id,
            name: d.name,
            type: "department",
            parentId: currentRoot.id,
            color: "var(--primary)",
          });
        });
      }
    } else if (currentRoot.type === "department") {
      const dept = deptMap.get(currentRoot.id);
      if (dept) {
        dept.users.forEach((u: any) => {
          const first = u.firstName;
          const last = u.lastName;
          const name = !first
            ? u.email || "User"
            : `${first}, ${last ? last.charAt(0) : ""}.`;
          addNode({
            id: u.id,
            name: name,
            type: "user",
            parentId: currentRoot.id,
            email: u.email,
          });
        });
      }
    } else if (currentRoot.type === "user") {
      // Find user
      const user = userMap.get(currentRoot.id);

      if (user) {
        user.documents.forEach((doc: any) => {
          if (bubbleDocIds.has(doc.id)) return;
          addNode({
            id: doc.id,
            name: doc.title,
            type: "document",
            parentId: user.id,
            uploadedById: user.id,
            color: doc.documentType?.color,
          });
        });
      }
    }
    
    // --- Merge Bubble Node ---
    if (bubbleNode) {
      nodes.push(bubbleNode);
      bubbleDocuments.forEach((doc) => {
        if (!nodes.some((n) => n.id === doc.id)) {
          const bubbleDoc = { ...doc, isContainedInBubble: true };
          if (
            (typeof bubbleDoc.x === "undefined" ||
              typeof bubbleDoc.y === "undefined") &&
            bubbleNode.x &&
            bubbleNode.y
          ) {
            bubbleDoc.x = bubbleNode.x;
            bubbleDoc.y = bubbleNode.y;
          }
          nodes.push(bubbleDoc);
        }
      });
    }

    // --- Merge Temp Nodes ---
    const existingIds = new Set(nodes.map((n) => n.id));
    const validTempNodes = tempNodes.filter((n) => !existingIds.has(n.id));

    validTempNodes.forEach((tn) => {
      nodes.push(tn);
      const fullUser = userMap.get(tn.id);

      if (fullUser && fullUser.documents) {
        fullUser.documents.forEach((doc: any) => {
          if (bubbleDocIds.has(doc.id)) return;
          const angle = Math.random() * 2 * Math.PI;
          const radius = 30; 
          nodes.push({
            id: doc.id,
            name: doc.title,
            type: "document",
            parentId: tn.id,
            uploadedById: fullUser.id,
            color: doc.documentType?.color,
            x: (tn.x || 0) + Math.cos(angle) * radius,
            y: (tn.y || 0) + Math.sin(angle) * radius,
          });

          links.push({
            source: tn.id,
            target: doc.id,
            isDetached: false,
          });
        });
      }
    });

    const tempNodeIds = new Set(tempNodes.map((tn) => tn.id));

    nodes.forEach((n) => {
      const isTempNode = tempNodeIds.has(n.id);
      const isTempDoc = n.parentId ? tempNodeIds.has(n.parentId) : false;
      const isBubble = n.type === "bubble";
      const isBubbleDoc = n.isContainedInBubble;

      if (
        n.id !== currentRoot.id &&
        !isTempNode &&
        !isTempDoc &&
        !isBubble &&
        !isBubbleDoc
      ) {
        links.push({
          source: rootNodeForGraph.id,
          target: n.id,
          isDetached: false, 
        });
      }
    });

    return { nodes, links };
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { type, payload } = e.data;

    if (type === "INIT_DATA") {
        orgHierarchy = payload;
        const maps = buildMaps(orgHierarchy);
        userMap = maps.userMap;
        deptMap = maps.deptMap;
    } else if (type === "CALCULATE_GRAPH") {
        try {
            const { viewStack, tempNodes, bubbleNode, bubbleDocuments } = payload;
            const result = computeGraphData(viewStack, tempNodes, bubbleNode, bubbleDocuments);
            const response: WorkerResponse = { type: "GRAPH_DATA", payload: result };
            self.postMessage(response);
        } catch (err: any) {
            const response: WorkerResponse = { type: "ERROR", payload: err.message || "Unknown error" };
            self.postMessage(response);
        }
    }
};
