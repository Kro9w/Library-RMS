/* eslint-disable @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type {
  Node,
  LinkData,
  WorkerMessage,
  WorkerResponse,
} from "../types/graph";

// --- State ---
let orgHierarchy: any = null;
let userMap: Map<string, any> = new Map();
let deptMap: Map<string, any> = new Map();

// Simulation State
let simulation: d3.Simulation<Node, LinkData> | null = null;
let width = 1000;
let height = 800;
let currentNodes: Node[] = [];
let currentLinks: LinkData[] = [];
let bubbleDocuments: Node[] = [];

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
  bubbleDocs: Node[],
) {
  if (!orgHierarchy || viewStack.length === 0) return { nodes: [], links: [] };

  const currentRoot = viewStack[viewStack.length - 1];
  const nodes: Node[] = [];
  const links: LinkData[] = [];

  const bubbleDocIds = new Set(bubbleDocs.map((d) => d.id));

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
    bubbleDocs.forEach((doc) => {
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

function initSimulation(newNodes: Node[], newLinks: LinkData[]) {
  // Preserve old positions
  const oldNodes = new Map<string, Node>();
  if (currentNodes.length > 0) {
    currentNodes.forEach((n) => {
      oldNodes.set(n.id, n);
    });
  }

  const centerX = width / 2;
  const centerY = height / 2;

  newNodes.forEach((n) => {
    const old = oldNodes.get(n.id);
    if (old) {
      n.x = old.x;
      n.y = old.y;
      n.vx = old.vx;
      n.vy = old.vy;
      n.fx = old.fx;
      n.fy = old.fy;
    }

    // Initialize unknown positions
    if (typeof n.x === "undefined" || typeof n.y === "undefined") {
      n.x = centerX + (Math.random() - 0.5) * 50;
      n.y = centerY + (Math.random() - 0.5) * 50;
    }

    // Bubble document init logic
    const bubble = newNodes.find((bn) => bn.type === "bubble");
    if (
      n.type === "document" &&
      bubbleDocuments.some((bd) => bd.id === n.id) &&
      bubble
    ) {
      if (!n.x && !n.y) {
        n.x = bubble.x;
        n.y = bubble.y;
      }
    }
  });

  currentNodes = newNodes;
  currentLinks = newLinks;

  if (!simulation) {
    simulation = d3
      .forceSimulation<Node, LinkData>()
      .force(
        "link",
        d3.forceLink<Node, LinkData>().id((d: any) => d.id),
      )
      .force("charge", d3.forceManyBody().theta(1.2)) // Optimized
      .force("collide", d3.forceCollide())
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulation.on("tick", () => {
      const bubble = currentNodes.find((n) => n.type === "bubble");

      // --- Custom Bubble Physics ---
      if (bubble) {
        const bubbleRadius = 40 + bubbleDocuments.length * 5;
        const containedNodes = currentNodes.filter(
          (n) => n.isContainedInBubble && !(n as any)._isDragging,
        );

        containedNodes.forEach((doc) => {
          const dx = (bubble.x || 0) - (doc.x || 0);
          const dy = (bubble.y || 0) - (doc.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (doc.vx !== undefined && doc.vy !== undefined) {
            doc.vx *= 0.6;
            doc.vy *= 0.6;
            const pullStrength = 0.05;
            doc.vx += dx * pullStrength;
            doc.vy += dy * pullStrength;
          }

          const boundaryRadius = bubbleRadius - 12;
          if (dist > boundaryRadius) {
            const angle = Math.atan2(-dy, -dx);
            doc.x = (bubble.x || 0) + Math.cos(angle) * boundaryRadius;
            doc.y = (bubble.y || 0) + Math.sin(angle) * boundaryRadius;
            doc.vx = 0;
            doc.vy = 0;
          }
        });
      }

      // --- Optimized Data Transfer ---
      // We use Float32Array to send just positions (x, y) to main thread
      // Format: [x0, y0, x1, y1, ...]
      const positions = new Float32Array(currentNodes.length * 2);
      for (let i = 0; i < currentNodes.length; i++) {
        const n = currentNodes[i];
        positions[i * 2] = n.x || 0;
        positions[i * 2 + 1] = n.y || 0;
      }

      // We still need to send links for detached state?
      // Actually, main thread needs to update links too.
      // Links connect nodes by ID or index. D3 links are objects.
      // Optimally, links don't change topology every tick, just positions.
      // Main thread already knows topology from GRAPH_DATA.
      // It just needs positions to update lines.
      // But it needs to know "isDetached" status if it changes dynamically in worker (drag logic).
      // For now, let's keep sending full links array (simpler) but optimize nodes.
      // Or optimize links too? Links array is large.
      // Let's send a simplified links array or assume topology is static between GRAPH_DATA events.
      // Detached status changes on drag start/end which are events, not per-tick.
      // So we can just send positions!
      // BUT: d3.line needs source/target x/y.
      // If we send positions array, main thread needs to map it back to nodes.
      // We need to ensure order is preserved. `currentNodes` order is stable between GRAPH_DATA.

      const tickResponse: WorkerResponse = {
        type: "TICK",
        payload: {
          nodes: positions,
          links: currentLinks.map((l: any) => ({
            source: { id: l.source.id } as any,
            target: { id: l.target.id } as any,
            isDetached: l.isDetached,
          })),
        },
      };
      self.postMessage(tickResponse, { transfer: [positions.buffer] });
    });
  }

  // --- Apply Forces ---
  const sim = simulation;

  sim
    .force<d3.ForceLink<Node, LinkData>>("link")
    ?.links(currentLinks)
    .distance(150)
    .strength(0.5);

  sim.force<d3.ForceManyBody<Node>>("charge")?.strength((d) => {
    if ((d as any)._isDragging) return 0;
    if (d.isContainedInBubble) return 0;
    if (d.type === "document") return 0;
    if (d.type === "user") return -30;
    return -50;
  });

  const collideForce = d3.forceCollide<Node>().radius((d) => {
    if (d.type === "organization") return 50;
    if (d.type === "campus") return 45;
    if (d.type === "department") return 40;
    if (d.type === "user") return 35;
    if (d.type === "bubble")
      return 40 + (bubbleDocuments ? bubbleDocuments.length * 5 : 0);
    return 25;
  });

  const originalCollideInit = collideForce.initialize;
  collideForce.initialize = function (nodes, random) {
    originalCollideInit.call(
      this,
      nodes.filter((n) => !n.isContainedInBubble),
      random,
    );
  };

  sim.force("collide", collideForce);
  sim.force("center", d3.forceCenter(width / 2, height / 2));
  sim.nodes(currentNodes);
  sim.alpha(1).restart();
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case "INIT_DATA": {
      orgHierarchy = msg.payload;
      const maps = buildMaps(orgHierarchy);
      userMap = maps.userMap;
      deptMap = maps.deptMap;
      break;
    }

    case "CALCULATE_GRAPH": {
      try {
        const { viewStack, tempNodes, bubbleNode, bubbleDocuments: bDocs } =
          msg.payload;
        bubbleDocuments = bDocs;
        const result = computeGraphData(
          viewStack,
          tempNodes,
          bubbleNode,
          bubbleDocuments,
        );

        initSimulation(result.nodes, result.links);

        // Send full structure once
        const response: WorkerResponse = {
          type: "GRAPH_DATA",
          payload: result,
        };
        self.postMessage(response);
      } catch (err: any) {
        const response: WorkerResponse = {
          type: "ERROR",
          payload: err.message || "Unknown error",
        };
        self.postMessage(response);
      }
      break;
    }

    case "UPDATE_DIMENSIONS":
      if (msg.payload) {
        width = msg.payload.width;
        height = msg.payload.height;
        simulation?.force("center", d3.forceCenter(width / 2, height / 2));
        simulation?.alpha(0.3).restart();
      }
      break;

    case "START_SIMULATION":
      simulation?.restart();
      break;

    case "STOP_SIMULATION":
      simulation?.stop();
      break;

    case "DRAG_START": {
      const node = currentNodes.find((n) => n.id === msg.payload.id);
      if (node && simulation) {
        if (!msg.payload.active) simulation.alphaTarget(0.3).restart();

        node.fx = msg.payload.x;
        node.fy = msg.payload.y;
        (node as any)._isDragging = true;
      }
      break;
    }

    case "DRAG": {
      const node = currentNodes.find((n) => n.id === msg.payload.id);
      if (node) {
        node.fx = msg.payload.x;
        node.fy = msg.payload.y;
      }
      break;
    }

    case "DRAG_END": {
      const node = currentNodes.find((n) => n.id === msg.payload.id);
      if (node && simulation) {
        simulation.alphaTarget(0);
        node.fx = null;
        node.fy = null;
        (node as any)._isDragging = false;
      }
      break;
    }

    case "SET_MAGNET": {
      const { sourceId, targetId } = msg.payload;
      if (!simulation) break;

      if (sourceId && targetId) {
        const source = currentNodes.find((n) => n.id === sourceId);
        const target = currentNodes.find((n) => n.id === targetId);
        if (source && target) {
          simulation.force(
            "magnet",
            d3
              .forceLink<Node, LinkData>([
                { source: source, target: target } as any,
              ])
              .strength(2.0)
              .distance(0),
          );
          simulation.alpha(0.3).restart();
        }
      } else {
        simulation.force("magnet", null);
      }
      break;
    }
  }
};
