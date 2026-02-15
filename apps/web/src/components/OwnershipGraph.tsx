// apps/web/src/components/OwnershipGraph.tsx
import { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import { SendDocumentModal } from "./SendDocumentModal";
import { SendMultipleDocumentsModal } from "./SendMultipleDocumentsModal";
import { LoadingAnimation } from "./ui/LoadingAnimation";

type NodeType =
  | "organization"
  | "campus"
  | "department"
  | "user"
  | "document"
  | "bubble";

type Node = d3.SimulationNodeDatum & {
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

type LinkData = d3.SimulationLinkDatum<Node> & { isDetached?: boolean };

const truncateText = (name: string, type: NodeType, maxLength = 15) => {
  if (type !== "document" && name.length > maxLength) {
    return name.substring(0, maxLength) + "...";
  }
  return name;
};

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, LinkData> | null>(null);
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  const dropTargetNodeRef = useRef<Node | null>(null);

  // --- State ---
  const [viewStack, setViewStack] = useState<Node[]>([]);
  const [_expandedUserId, _setExpandedUserId] = useState<string | null>(null);
  const [selectedUserNode, setSelectedUserNode] = useState<Node | null>(null);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [_dropTargetNode, setDropTargetNode] = useState<Node | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  // Bubble State
  const [bubbleNode, setBubbleNode] = useState<Node | null>(null);
  const [bubbleDocuments, setBubbleDocuments] = useState<Node[]>([]);
  const [isMultiSendModalOpen, setIsMultiSendModalOpen] = useState(false);
  const [multiSendTargetId, setMultiSendTargetId] = useState<string | null>(
    null,
  );

  // New State for Binder
  const [activeTab, setActiveTab] = useState<"directory" | "details" | "tools">(
    "directory",
  );
  const [isBinderOpen, setIsBinderOpen] = useState(true);
  const [tempNodes, setTempNodes] = useState<Node[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: currentUserData, isLoading: isLoadingCurrentUser } =
    trpc.user.getMe.useQuery();
  const {
    data: orgHierarchy,
    isLoading: isLoadingHierarchy,
    isError,
    error,
  } = trpc.user.getOrgHierarchy.useQuery(undefined, {
    staleTime: 60000,
  });

  // Check if we are in "Document View" (User is root)
  const isDocumentView =
    viewStack.length > 0 && viewStack[viewStack.length - 1].type === "user";

  // --- 1. INITIAL STATE: Start at User's Campus & Expand Accordion ---
  useEffect(() => {
    if (orgHierarchy && currentUserData && viewStack.length === 0) {
      // Construct Org Node
      const orgNode: Node = {
        id: orgHierarchy.id,
        name: orgHierarchy.acronym,
        type: "organization",
        // Do NOT set fx/fy here, or it will be pinned to 0,0
      };

      let initialStack: Node[] = [orgNode];
      const initialExpanded = new Set<string>();

      // Find User's Campus
      if (currentUserData.campusId) {
        initialExpanded.add(currentUserData.campusId);

        const campus = orgHierarchy.campuses.find(
          (c: any) => c.id === currentUserData.campusId,
        );
        if (campus) {
          const campusNode: Node = {
            id: campus.id,
            name: campus.name,
            type: "campus",
            parentId: orgHierarchy.id,
            color: "var(--primary)",
          };
          initialStack.push(campusNode);
        }
      }

      setViewStack(initialStack);
      setExpandedIds(initialExpanded);
    }
  }, [orgHierarchy, currentUserData]);

  // --- Reset Temp Nodes on View Change ---
  useEffect(() => {
    // Whenever the view stack changes (navigation), clear any dragged-in temp nodes
    setTempNodes([]);
  }, [viewStack]);

  // --- Derived Graph Data ---
  const graphData = useMemo(() => {
    if (!orgHierarchy || viewStack.length === 0)
      return { nodes: [], links: [] };

    const currentRoot = viewStack[viewStack.length - 1];
    let nodes: Node[] = [];
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
      let dept: any = null;
      for (const c of orgHierarchy.campuses) {
        const d = c.departments.find((dep: any) => dep.id === currentRoot.id);
        if (d) {
          dept = d;
          break;
        }
      }
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
      let user: any = null;
      for (const c of orgHierarchy.campuses) {
        for (const d of c.departments) {
          const u = d.users.find((usr: any) => usr.id === currentRoot.id);
          if (u) {
            user = u;
            break;
          }
        }
        if (user) break;
      }

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
      // Create a stable bubble node reference if possible, but graphData recreates objects
      // We must ensure position is preserved via oldNodes map later.
      nodes.push(bubbleNode);

      // Add contained documents (they are "floating" inside bubble, not linked to anyone)
      bubbleDocuments.forEach((doc) => {
        // Ensure the flag is preserved/set
        // Check if this document ID is already in nodes to prevent accidental double-add if logic changed elsewhere
        if (!nodes.some((n) => n.id === doc.id)) {
          // Explicitly set the flag here again to be safe
          const bubbleDoc = { ...doc, isContainedInBubble: true };
          // Ensure it has coordinates near bubble if not set (fallback)
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
    // Filter out temp nodes that are already present in the natural view to avoid duplicates
    const existingIds = new Set(nodes.map((n) => n.id));
    const validTempNodes = tempNodes.filter((n) => !existingIds.has(n.id));

    // Add valid temp nodes and their documents
    validTempNodes.forEach((tn) => {
      // Add the temp user node itself (preserving dragged position)
      nodes.push(tn);

      // Find full user details to get documents
      let fullUser: any = null;
      for (const c of orgHierarchy.campuses) {
        for (const d of c.departments) {
          const u = d.users.find((usr: any) => usr.id === tn.id);
          if (u) {
            fullUser = u;
            break;
          }
        }
        if (fullUser) break;
      }

      if (fullUser && fullUser.documents) {
        fullUser.documents.forEach((doc: any) => {
          if (bubbleDocIds.has(doc.id)) return;
          // Add document nodes for temp user
          // We can initialize them near the user to avoid flying in from center
          const angle = Math.random() * 2 * Math.PI;
          const radius = 30; // Close to user
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

          // Link document to temp user
          links.push({
            source: tn.id,
            target: doc.id,
            isDetached: false,
          });
        });
      }
    });

    // Links for Natural Nodes
    nodes.forEach((n) => {
      // Only link natural nodes to root. Temp nodes float independently.
      // Also exclude root node itself from linking to itself
      // AND exclude documents that belong to temp users (they are already linked above)
      const isTempNode = tempNodes.some((tn) => tn.id === n.id);
      const isTempDoc = tempNodes.some((tn) => tn.id === n.parentId); // Doc child of temp node
      const isBubble = n.type === "bubble";

      // We check if the node is contained in the bubble using the flag we set earlier
      // If it is, we do NOT link it to the root, so it can float freely inside the bubble
      const isBubbleDoc = n.isContainedInBubble;

      if (
        n.id !== currentRoot.id &&
        !isTempNode &&
        !isTempDoc &&
        !isBubble &&
        !isBubbleDoc
      ) {
        // Apply detached state if link is dragged
        links.push({
          source: rootNodeForGraph.id,
          target: n.id,
          isDetached: false, // Initial state, physics handles dynamic detachment
        });
      }
    });

    return { nodes, links };
  }, [orgHierarchy, viewStack, tempNodes, bubbleNode, bubbleDocuments]);

  // --- Event Handlers ---
  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return;
    event.stopPropagation();

    // If in Document View (Root is User), ignore clicks on other User nodes (Temp Users)
    const isRootUser = viewStack[viewStack.length - 1]?.type === "user";
    if (
      isRootUser &&
      d.type === "user" &&
      viewStack[viewStack.length - 1].id !== d.id
    ) {
      return;
    }

    // Check if clicked node is already in the stack
    const stackIndex = viewStack.findIndex((n) => n.id === d.id);
    if (stackIndex !== -1) {
      if (stackIndex === viewStack.length - 1) return;
      const newStack = viewStack.slice(0, stackIndex + 1);
      setViewStack(newStack);
      if (d.type !== "user") setSelectedUserNode(null);
      return;
    }

    if (d.type === "campus" || d.type === "department" || d.type === "user") {
      setViewStack((prev) => {
        if (prev[prev.length - 1]?.id === d.id) return prev;
        return [...prev, d];
      });

      if (d.type === "user") {
        setSelectedUserNode(d);
        setActiveTab("details"); // Switch to Details tab
        setIsBinderOpen(true); // Open panel on drill down to user
      } else {
        setSelectedUserNode(null);
      }
    }
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      const newStack = viewStack.slice(0, viewStack.length - 1);
      setViewStack(newStack);
      const newRoot = newStack[newStack.length - 1];
      if (newRoot.type !== "user") {
        setSelectedUserNode(null);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newStack = viewStack.slice(0, index + 1);
    setViewStack(newStack);
    const newRoot = newStack[newStack.length - 1];
    if (newRoot.type !== "user") setSelectedUserNode(null);
  };

  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleTabClick = (tab: "directory" | "details" | "tools") => {
    if (activeTab === tab) {
      setIsBinderOpen(!isBinderOpen);
    } else {
      setActiveTab(tab);
      setIsBinderOpen(true);
    }
  };

  const spawnBubble = () => {
    if (bubbleNode) return; // Only one bubble for now

    const svgElement = svgRef.current;
    if (!svgElement) return;
    const width = svgElement.parentElement?.clientWidth || 500;
    const height = svgElement.parentElement?.clientHeight || 500;

    const newBubble: Node = {
      id: "bubble-tool",
      name: "", // Empty name to prevent text label rendering
      type: "bubble",
      x: width / 2,
      y: height / 2,
    };
    setBubbleNode(newBubble);
  };

  // --- Document Details Panel Data ---
  useEffect(() => {
    if (selectedUserNode && orgHierarchy) {
      let foundDocs: any[] = [];
      for (const c of orgHierarchy.campuses) {
        for (const d of c.departments) {
          const u = d.users.find((u: any) => u.id === selectedUserNode.id);
          if (u) {
            foundDocs = u.documents;
            break;
          }
        }
        if (foundDocs.length) break;
      }
      setUserDocuments(foundDocs);
    } else {
      setUserDocuments([]);
    }
  }, [selectedUserNode, orgHierarchy]);

  // --- D3 Simulation ---
  useEffect(() => {
    const svgElement = svgRef.current;
    if (graphData.nodes.length === 0 || !svgElement?.parentElement) {
      const svg = d3.select(svgElement);
      svg.selectAll("*").remove();
      simulationRef.current?.stop();
      return;
    }

    const { nodes, links } = graphData;
    const width = svgElement.parentElement.clientWidth;
    const height = svgElement.parentElement.clientHeight;
    const svg = d3.select(svgElement);

    if (!gRef.current) {
      // ... (SVG Initialization same as before) ...
      svg.attr("width", width).attr("height", height);
      const defs = svg.append("defs");
      const filter = defs.append("filter").attr("id", "gooey");
      filter
        .append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", "8")
        .attr("result", "blur");
      filter
        .append("feColorMatrix")
        .attr("in", "blur")
        .attr("mode", "matrix")
        .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9")
        .attr("result", "goo");
      filter.append("feBlend").attr("in", "SourceGraphic").attr("in2", "goo");

      const g = svg.append("g");
      gRef.current = g;
      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");
      g.append("g")
        .attr("class", "gooey-container")
        .style("filter", "url(#gooey)");

      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on("start", () => svg.classed("grabbing", true))
        .on("zoom", (event) => g.attr("transform", event.transform))
        .on("end", () => svg.classed("grabbing", false));
      svg.call(zoomBehavior).on("dblclick.zoom", null);
    }

    if (!simulationRef.current) {
      simulationRef.current = d3
        .forceSimulation<Node, LinkData>()
        .force(
          "link",
          d3.forceLink<Node, LinkData>().id((d: any) => d.id),
        )
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter(width / 2, height / 2));

      simulationRef.current.on("tick", () => {
        const g = gRef.current;
        if (!g) return;
        g.selectAll<SVGLineElement, LinkData>(".link")
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        // --- Custom Bubble Physics ---
        // Access nodes directly from simulation to avoid stale closures
        const currentNodes = simulationRef.current?.nodes() || [];
        const bubble = currentNodes.find((n) => n.type === "bubble");

        if (bubble) {
          const bubbleRadius = 40 + bubbleDocuments.length * 5;

          // Find nodes that are marked as contained in bubble
          const containedNodes = currentNodes.filter(
            (n) => n.isContainedInBubble && !(n as any)._isDragging,
          );

          containedNodes.forEach((doc) => {
            const dx = (bubble.x || 0) - (doc.x || 0);
            const dy = (bubble.y || 0) - (doc.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy);

            // INTERMEDIARY STATE LOGIC: Strong Containment
            // Treat the bubble interior like a viscous fluid with a hard boundary.

            if (doc.vx !== undefined && doc.vy !== undefined) {
              // 1. Friction / Viscosity: Continuously dampen velocity inside bubble
              // This prevents documents from "bouncing" around violently
              doc.vx *= 0.6;
              doc.vy *= 0.6;

              // 2. Centering Force: Gentle pull towards center to keep them clustered
              const pullStrength = 0.05;
              doc.vx += dx * pullStrength;
              doc.vy += dy * pullStrength;
            }

            // 3. Hard Boundary Constraint
            // If a node tries to escape the bubble radius, clamp it back inside.
            const boundaryRadius = bubbleRadius - 12; // Keep them strictly inside visual boundary
            if (dist > boundaryRadius) {
              // Calculate the angle towards the node from center
              // Note: dx/dy are (bubble - doc), so vector points TO bubble center.
              // We want vector FROM bubble center TO doc to clamp it.
              const angle = Math.atan2(-dy, -dx);

              // Teleport node to the boundary edge
              doc.x = (bubble.x || 0) + Math.cos(angle) * boundaryRadius;
              doc.y = (bubble.y || 0) + Math.sin(angle) * boundaryRadius;

              // Kill velocity to stop it from "pushing" against the wall
              doc.vx = 0;
              doc.vy = 0;
            }
          });
        }

        g.selectAll<SVGGElement, Node>(".node").attr(
          "transform",
          (d: any) => `translate(${d.x},${d.y})`,
        );

        // Update Tether Line if exists
        const tether = g.select(".tether");
        if (!tether.empty()) {
          // Tether update logic is handled in dragged()
        }

        // Update Bubble Close Button Position
        // Handled in animation timer now
      });
    }

    const simulation = simulationRef.current;

    // --- 2. FORCE TUNING & INITIALIZATION ---
    const centerX = width / 2;
    const centerY = height / 2;

    // PRESERVE POSITIONS: Capture old positions to enable smooth transitions
    const oldNodes = new Map<string, Node>();
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach((n) => {
        oldNodes.set(n.id, n);
      });
    }

    nodes.forEach((n) => {
      const old = oldNodes.get(n.id);
      if (old) {
        n.x = old.x;
        n.y = old.y;
        n.vx = old.vx;
        n.vy = old.vy;
      }

      // Temp nodes don't need forcing to center if they have x/y already from drag
      if (n.id === graphData.nodes[0]?.id) {
        n.x = centerX;
        n.y = centerY;
      } else if (typeof n.x === "undefined" || typeof n.y === "undefined") {
        // Initialize unknown positions
        n.x = centerX + (Math.random() - 0.5) * 50;
        n.y = centerY + (Math.random() - 0.5) * 50;
      }
      // If document is inside bubble, ensure it starts near bubble
      if (
        n.type === "document" &&
        bubbleDocuments.some((bd) => bd.id === n.id) &&
        bubbleNode
      ) {
        if (!n.x && !n.y) {
          n.x = bubbleNode.x;
          n.y = bubbleNode.y;
        }
      }
    });

    simulation
      .force<d3.ForceLink<Node, LinkData>>("link")
      ?.distance(150)
      .strength(0.5);

    // TUNED CHARGE FORCE FOR DOCUMENT DRAGGING
    simulation.force<d3.ForceManyBody<Node>>("charge")?.strength((d) => {
      if ((d as any)._isDragging) return 0;

      // If document is inside bubble, remove all repulsion/charge so they can clump naturally via custom physics
      if (d.isContainedInBubble) {
        return 0;
      }

      if (d.type === "document") return 0; // Reduce document repulsion
      if (d.type === "user") return -30; // Further reduce user repulsion (was -50, originally -300)
      return -50; // Moderate for others
    });

    // CUSTOM COLLISION FORCE: Exclude contained documents entirely
    // This prevents the bubble from being pushed by the documents inside it (drifting)
    const collideForce = d3.forceCollide<Node>().radius((d) => {
      if (d.type === "organization") return 50;
      if (d.type === "campus") return 45;
      if (d.type === "department") return 40;
      if (d.type === "user") return 35;
      if (d.type === "bubble")
        return 40 + (bubbleDocuments ? bubbleDocuments.length * 5 : 0);
      // Fallback (though contained docs are filtered out below)
      return 25;
    });

    // Monkey-patch initialize to filter out contained documents from collision force
    const originalCollideInit = collideForce.initialize;
    collideForce.initialize = function (nodes, random) {
      originalCollideInit.call(
        this,
        nodes.filter((n) => !n.isContainedInBubble),
        random,
      );
    };

    simulation.force("collide", collideForce);

    simulation.force("center", d3.forceCenter(width / 2, height / 2));

    simulation.alphaDecay(0.0228);

    // Render Links
    const link = gRef
      .current!.select(".links")
      .selectAll<SVGLineElement, LinkData>("line.link")
      .data(links, (d: any) => `${d.source.id}-${d.target.id}`);
    link.exit().remove();
    const linkEnter = link.enter().append("line").attr("class", "link");
    link.merge(linkEnter).classed("link-detached", (d) => !!d.isDetached);

    // Render Nodes
    const node = gRef
      .current!.select(".nodes")
      .selectAll<SVGGElement, Node>("g.node")
      .data(nodes, (d) => d.id);

    node.exit().transition().duration(200).attr("opacity", 0).remove();

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", (d) => `node ${d.type}`)
      .attr("data-id", (d) => d.id)
      .style("cursor", "pointer")
      .attr("opacity", 0);

    nodeEnter.transition().duration(200).attr("opacity", 1);

    // Standard nodes get circles
    nodeEnter.filter((d) => d.type !== "bubble").append("circle");

    // Bubble gets path for amoeba shape
    nodeEnter
      .filter((d) => d.type === "bubble")
      .append("path")
      .attr("class", "node-circle bubble-blob");

    // Close Button for Bubble (Top Right Edge)
    nodeEnter
      .filter((d) => d.type === "bubble")
      .append("text")
      .attr("class", "close-btn")
      .text("✕")
      .attr("text-anchor", "middle")
      // Initial Position (will be updated by animation loop)
      .attr("dx", 0)
      .attr("dy", 0)
      .on("click", (e, _d) => {
        e.stopPropagation();
        handlePopBubble();
      });

    // Node Label (Text) - Exclude for Bubble entirely
    nodeEnter
      .filter((d) => d.type !== "bubble")
      .append("text")
      .attr("class", "node-label")
      .attr("dy", 5)
      .attr("dx", 35);

    // Tooltip
    nodeEnter
      .on("mouseover", function (_e, d) {
        // Target only the label text to avoid overwriting the "X" close button
        d3.select(this).raise().select(".node-label").text(d.name);
      })
      .on("mouseout", function (_e, d) {
        d3.select(this)
          .select(".node-label")
          .text(truncateText(d.name, d.type));
      });

    const nodeMerge = node.merge(nodeEnter);

    nodeMerge
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      )
      .on("click", (e, d) => handleNodeClick(e, d));

    // Update Circles
    nodeMerge
      .select("circle")
      .attr("class", (d) => `node-circle ${d.type}`)
      .attr("r", (d) => {
        if (d.type === "organization") return 40;
        if (d.type === "campus") return 35;
        if (d.type === "department") return 30;
        if (d.type === "user") return 25;
        if (d.type === "document") {
          return d.isContainedInBubble ? 8 : 12;
        }
        return 12; // Fallback
      })
      .style("fill", (d) => {
        if (d.type === "document" && d.color) return `#${d.color}`;
        if (d.type === "campus" || d.type === "department")
          return "var(--primary)";
        if (d.type === "organization") return "var(--text)";
        return null;
      })
      .classed("selected", (d) => d.id === selectedUserNode?.id)
      .classed(
        "mother-node",
        (d) => d.id === viewStack[viewStack.length - 1]?.id,
      );

    // Update Bubble Path (Initial fill only, shape handled by timer)
    nodeMerge
      .select("path.bubble-blob")
      .style("fill", "var(--primary)") // Or specific bubble color
      .attr("opacity", 0.3);

    nodeMerge.select(".node-label").text((d) => truncateText(d.name, d.type));

    simulation.nodes(nodes);
    simulation.force<d3.ForceLink<Node, LinkData>>("link")?.links(links);
    simulation.alpha(1).restart();

    // --- Bubble Animation Loop ---
    const timer = d3.timer((elapsed) => {
      const bubble = nodes.find((n) => n.type === "bubble");
      if (bubble) {
        const radius = 40 + bubbleDocuments.length * 5;
        const points: [number, number][] = [];
        const numPoints = 12;

        // Generate Amoeba Points
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          // Organic oscillation
          const offset =
            Math.sin(angle * 3 + elapsed * 0.002) * 4 +
            Math.cos(angle * 5 - elapsed * 0.003) * 3;
          const r = radius + offset;
          points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
        }

        // Update Path
        const pathData = d3.line().curve(d3.curveBasisClosed)(points);
        const bubbleNode = gRef.current?.select(".node.bubble path");
        if (bubbleNode && pathData) {
          bubbleNode.attr("d", pathData);
        }

        // Update Close Button Position
        // Find point at roughly -45 degrees (top-right)
        // We can just calculate it using the same formula
        const angle = -Math.PI / 4; // -45 deg
        const offset =
          Math.sin(angle * 3 + elapsed * 0.002) * 4 +
          Math.cos(angle * 5 - elapsed * 0.003) * 3;
        const r = radius + offset;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        gRef.current
          ?.select(".node.bubble .close-btn")
          .attr("dx", x)
          .attr("dy", y);
      }
    });

    return () => {
      timer.stop();
    };

    // Drag Functions
    function dragstarted(event: any, d: any) {
      if (event.sourceEvent) event.sourceEvent.stopPropagation(); // Stop propagation to container
      if (!event.active) simulation?.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      (d as any)._isDragging = true;

      // If dragging a bubble, we want to allow it to "connect" to users for dropping
      if (d.type === "bubble") {
        return;
      }

      // If dragging a document already in bubble, detach it (allow it to be pulled out)
      if (d.isContainedInBubble) {
        // Temporarily allow it to move freely (physics will try to pull it back unless we drop it elsewhere)
        // No link to detach since it's floating
        // We do NOT return here, we proceed so physics can update fx/fy
      } else if (
        // If dragging a document owned by current user, detach link visually AND physically
        d.type === "document" &&
        currentUserData &&
        d.uploadedById === currentUserData.id &&
        !bubbleDocuments.some((bd) => bd.id === d.id) // Don't detach if already in bubble
      ) {
        const l = links.find(
          (lnk) =>
            (lnk.source as Node).id === d.id ||
            (lnk.target as Node).id === d.id,
        );
        if (l) {
          // 1. Mark as detached
          l.isDetached = true;
          (d as any)._activeLink = l;

          // 2. Update Simulation Physics: Remove this link temporarily
          simulation
            ?.force<d3.ForceLink<Node, LinkData>>("link")
            ?.links(links.filter((lnk) => !lnk.isDetached));

          // 3. Visual Update (CSS)
          const sourceId = (l.source as Node).id;
          const targetId = (l.target as Node).id;
          d3.select(svgRef.current!)
            .selectAll("line.link")
            .filter(
              (ld: any) =>
                ld.source.id === sourceId && ld.target.id === targetId,
            )
            .classed("link-detached", true);

          // Restart sim slightly to apply new forces
          simulation?.alpha(0.1).restart();
        }
      }
    }

    function dragged(this: any, event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;

      // Ensure that if we drag a document OUT of the bubble, the physics doesn't instantly snap it back while dragging
      // The tick function handles this via 'vx/vy' but since d.fx/d.fy are set, D3 overrides physics position.
      // So visual drag is fine.

      const g = gRef.current;
      if (!g) return;

      // --- 1. Bubble Drag Logic (Dropping Bubble onto User) ---
      if (d.type === "bubble" && bubbleDocuments.length > 0) {
        let target: Node | null = null;
        const threshold = 100;

        for (const u of nodes) {
          if (u.type !== "user") continue;
          const dx = (u.x || 0) - d.fx!;
          const dy = (u.y || 0) - d.fy!;
          if (Math.sqrt(dx * dx + dy * dy) < threshold) {
            target = u;
            break;
          }
        }

        handleGooeyEffect(d, target);
        dropTargetNodeRef.current = target;
        setDropTargetNode(target);
        return;
      }

      // --- 2. Document Drag Logic (Dropping Document into Bubble) ---
      // If we are dragging a document and a bubble exists
      if (
        d.type === "document" &&
        bubbleNode &&
        !bubbleDocuments.some((bd) => bd.id === d.id)
      ) {
        const threshold = (40 + bubbleDocuments.length * 5) * 1.5; // Bubble radius + padding
        const dx = (bubbleNode.x || 0) - d.fx!;
        const dy = (bubbleNode.y || 0) - d.fy!;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const bubblePath = gRef.current?.select(".node.bubble path");

        if (dist < threshold) {
          bubblePath?.classed("bubble-hover", true);
        } else {
          bubblePath?.classed("bubble-hover", false);
        }
      }

      // --- 3. Standard Document Transfer Logic ---
      const activeLink = (d as any)._activeLink;
      if (activeLink) {
        let target: Node | null = null;
        const threshold = 80;
        const originalOwnerId =
          (activeLink.target as Node).id === d.id
            ? (activeLink.source as Node).id
            : (activeLink.target as Node).id;

        // Check Bubble Intersection First
        if (bubbleNode) {
          const dx = (bubbleNode.x || 0) - d.fx!;
          const dy = (bubbleNode.y || 0) - d.fy!;
          // Use bubble radius
          const r = 40 + bubbleDocuments.length * 5;
          if (Math.sqrt(dx * dx + dy * dy) < r + 20) {
            target = bubbleNode;
          }
        }

        // If not bubble, check users
        if (!target) {
          for (const u of nodes) {
            if (u.type !== "user" || u.id === originalOwnerId) continue;
            // Calculate distance
            const dx = (u.x || 0) - d.fx!;
            const dy = (u.y || 0) - d.fy!;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) {
              target = u;
              break;
            }
          }
        }

        handleGooeyEffect(d, target);
        dropTargetNodeRef.current = target;
        setDropTargetNode(target);
      }
    }

    // Helper for Gooey Visuals
    function handleGooeyEffect(source: any, target: Node | null) {
      const g = gRef.current;
      if (!g) return;

      const isNearTarget = target !== null;
      const sourceElement = g.selectAll<SVGGElement, Node>(
        `g.node[data-id='${source.id}']`,
      );
      const targetElement = target
        ? g.selectAll<SVGGElement, Node>(`g.node[data-id='${target.id}']`)
        : null;

      if (
        isNearTarget &&
        !sourceElement.empty() &&
        targetElement &&
        !targetElement.empty()
      ) {
        const gooeyContainer = g.select(".gooey-container");

        // Move elements to gooey container
        if (g.select(".tether").empty()) {
          gooeyContainer.append(() => sourceElement.node()!);
          gooeyContainer.append(() => targetElement.node()!);

          // Add tether
          gooeyContainer
            .append("line")
            .attr("class", "tether")
            .attr("data-source-id", source.id)
            .attr("data-target-id", target!.id)
            .attr("x1", source.fx!)
            .attr("y1", source.fy!)
            .attr("x2", target!.x!)
            .attr("y2", target!.y!);
        } else {
          // Update tether
          g.select(".tether")
            .attr("x1", source.fx!)
            .attr("y1", source.fy!)
            .attr("x2", target!.x!)
            .attr("y2", target!.y!);
        }

        // Add classes
        sourceElement
          .select(".node-circle")
          .classed("armed-for-drop", true)
          .classed("drop-magnet", true);
        targetElement.select(".node-circle").classed("drop-magnet", true);

        // Magnet Force
        simulation!.force(
          "magnet",
          d3
            .forceLink<Node, LinkData>([
              { source: source, target: target! } as any,
            ])
            .strength(2.0)
            .distance(0),
        );
        simulation?.alpha(0.3).restart();
      } else {
        // Cleanup
        const gooeyContainer = g.select(".gooey-container");
        gooeyContainer.selectAll("g.node").each(function () {
          g.select(".nodes").append(() => this as Element);
        });
        g.select(".tether").remove();
        d3.selectAll(".node-circle.drop-magnet").classed("drop-magnet", false);
        d3.selectAll(".node-circle.armed-for-drop").classed(
          "armed-for-drop",
          false,
        );
        simulation!.force("magnet", null);
      }
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation?.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      (d as any)._isDragging = false;

      const target = dropTargetNodeRef.current;
      const g = gRef.current;

      // Case: Document Removed from Bubble (Dropped into Nothing)
      if (d.isContainedInBubble && !target) {
        // If we dragged a document OUT of the bubble and dropped it into void,
        // it should RETURN to its original owner (i.e. remove from bubble).
        // Check if it's far enough from bubble to be considered "removed"
        if (bubbleNode) {
          const dx = (bubbleNode.x || 0) - d.fx!;
          const dy = (bubbleNode.y || 0) - d.fy!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const bubbleRadius = 40 + bubbleDocuments.length * 5;

          if (dist > bubbleRadius + 50) {
            // Remove from bubble (will re-appear at owner due to graphData logic)
            setBubbleDocuments((prev) => prev.filter((doc) => doc.id !== d.id));
            d.isContainedInBubble = false;
            // Clear position so it can fly back to owner
            d.fx = null;
            d.fy = null;
            // No need to set activeLink, graphData handles re-linking
          } else {
            // Snapped back into bubble (didn't drag far enough)
            d.fx = null;
            d.fy = null;
            // Physics will pull it back to center
          }
        }
        // Cleanup and return
        g?.select(".node.bubble path").classed("bubble-hover", false);
        return;
      }

      // Case A: Bubble Dropped onto User
      if (d.type === "bubble" && target && target.type === "user") {
        setMultiSendTargetId(target.id);
        setIsMultiSendModalOpen(true);
      }

      // Case B: Document Dropped onto Bubble
      else if (
        d.type === "document" &&
        target &&
        target.type === "bubble" &&
        (d as any)._activeLink
      ) {
        // Ensure the node is free to be controlled by simulation
        d.fx = null;
        d.fy = null;
        d.isContainedInBubble = true;

        // Capture current position so it doesn't jump
        const nodeClone = { ...d, x: d.x, y: d.y, vx: 0, vy: 0 };

        // Add to bubble state
        setBubbleDocuments((prev) => [...prev, nodeClone]);
      }

      // Case C: Document Dropped onto User (Standard)
      else if (
        target &&
        target.type === "user" &&
        d.type === "document" &&
        (d as any)._activeLink
      ) {
        setSelectedDocId(d.id);
        setTargetUserId(target.id);
        setIsSendModalOpen(true);
      }

      // Case D: Drop Cancelled (Re-attach)
      else if ((d as any)._activeLink) {
        (d as any)._activeLink.isDetached = false;

        // 1. Update Simulation Physics: Restore link
        simulation?.force<d3.ForceLink<Node, LinkData>>("link")?.links(links);

        // 2. Visual Update (CSS)
        const sourceId = ((d as any)._activeLink.source as Node).id;
        const targetId = ((d as any)._activeLink.target as Node).id;
        d3.select(svgRef.current!)
          .selectAll("line.link")
          .filter(
            (ld: any) => ld.source.id === sourceId && ld.target.id === targetId,
          )
          .classed("link-detached", false);

        simulation?.alpha(0.1).restart();
      }

      // Cleanup DOM (Always move nodes back to main group)
      g?.selectAll(".gooey-container g.node").each(function () {
        g.select(".nodes").append(() => this as Element);
      });
      g?.select(".tether").remove();
      g?.select(".node.bubble path").classed("bubble-hover", false);
      d3.selectAll(".node-circle.drop-magnet").classed("drop-magnet", false);
      d3.selectAll(".node-circle.armed-for-drop").classed(
        "armed-for-drop",
        false,
      );
      simulation?.force("magnet", null);

      (d as any)._activeLink = null;
      dropTargetNodeRef.current = null;
      setDropTargetNode(null);
    }
  }, [graphData]); // Re-bind when graphData changes (e.g. bubble docs added)

  // Bubble Pop Handler
  const handlePopBubble = () => {
    // Just clear state; docs will disappear from graphData or re-appear at owner if we revert logic?
    // Current logic: Docs in bubble are just nodes in bubbleDocuments state.
    // If we clear state, they disappear. Wait, requirement: "re-attaches to original owner"
    // Since graphData re-calculates from orgHierarchy every render, clearing bubbleDocuments
    // means they stop being suppressed/hijacked and the original logic will render them linked to owner!
    // So simply clearing state is enough.
    setBubbleDocuments([]);
    setBubbleNode(null);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, user: any) => {
    e.dataTransfer.setData(
      "application/folio-user-node",
      JSON.stringify({
        id: user.id,
        name: `${user.firstName}, ${user.lastName ? user.lastName.charAt(0) : ""}.`,
        type: "user",
        email: user.email,
      }),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/folio-user-node");
    if (!data) return;

    const userNode = JSON.parse(data);

    // Check duplicate
    const allNodes = graphData.nodes;
    if (allNodes.some((n) => n.id === userNode.id)) {
      const status = document.createElement("div");
      status.className = "graph-status-message error";
      status.innerText = "User is already in view";
      status.style.top = "10%";
      status.style.zIndex = "1000";
      svgRef.current?.parentElement?.appendChild(status);
      setTimeout(() => status.remove(), 2000);
      return;
    }

    // Calculate Coords
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const zoomTransform = d3.zoomTransform(svg);

    // Mouse client coords relative to SVG
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Invert zoom to get graph coords
    const [x, y] = zoomTransform.invert([mouseX, mouseY]);

    const newNode: Node = {
      ...userNode,
      x,
      y,
    };

    setTempNodes((prev) => [...prev, newNode]);
  };

  if (isLoadingCurrentUser || isLoadingHierarchy) return <LoadingAnimation />;
  if (isError)
    return <div className="text-danger">Error: {error?.message}</div>;

  return (
    <div className="graph-container">
      {/* Binder Panel - Only visible in Document View (User node) */}
      {isDocumentView && (
        <div className={`binder-wrapper ${!isBinderOpen ? "collapsed" : ""}`}>
          <div className="binder-body">
            <div className="binder-content">
              {activeTab === "directory" && orgHierarchy && (
                <div className="directory-tree">
                  {/* Campus Level */}
                  {orgHierarchy.campuses.map((campus: any) => (
                    <div key={campus.id} className="tree-item">
                      <div
                        className={`tree-header ${expandedIds.has(campus.id) ? "expanded" : ""}`}
                        onClick={() => toggleAccordion(campus.id)}
                      >
                        <i className="bi bi-caret-right-fill caret"></i>
                        <i className="bi bi-bank icon-type"></i>
                        <span>{campus.name}</span>
                      </div>

                      {expandedIds.has(campus.id) && (
                        <div className="tree-children">
                          {campus.departments.map((dept: any) => (
                            <div key={dept.id} className="tree-item">
                              <div
                                className={`tree-header ${expandedIds.has(dept.id) ? "expanded" : ""}`}
                                onClick={() => toggleAccordion(dept.id)}
                              >
                                <i className="bi bi-caret-right-fill caret"></i>
                                <i className="bi bi-building icon-type"></i>
                                <span>{dept.name}</span>
                              </div>

                              {expandedIds.has(dept.id) && (
                                <div className="tree-children">
                                  {dept.users.map((u: any) => (
                                    <div
                                      key={u.id}
                                      className="user-draggable"
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(e, u)}
                                    >
                                      <div className="user-avatar-small">
                                        {u.firstName
                                          ? u.firstName.charAt(0)
                                          : u.email
                                            ? u.email.charAt(0).toUpperCase()
                                            : "U"}
                                      </div>
                                      <span>
                                        {u.firstName} {u.lastName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "details" && (
                <div className="details-content">
                  {selectedUserNode ? (
                    <>
                      <div className="d-flex justify-content-between align-items-center">
                        <h4>{selectedUserNode.name}</h4>
                        <span className="badge bg-secondary">User</span>
                      </div>
                      <p className="text-muted small mb-3">
                        {selectedUserNode.email}
                      </p>
                      <hr />
                      <h5>Documents</h5>
                      {userDocuments.length > 0 ? (
                        <ul className="list-group">
                          {userDocuments.map((doc: any) => (
                            <li key={doc.id} className="list-group-item">
                              {doc.title}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted">No documents found.</p>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-muted mt-5">
                      <i className="bi bi-cursor display-4"></i>
                      <p className="mt-3">
                        Select a user node to view details.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "tools" && (
                <div className="tools-content p-3">
                  <h5 className="mb-3">Tools</h5>
                  <div className="tools-grid">
                    <div
                      className={`tool-item ${bubbleNode ? "disabled" : ""}`}
                      onClick={spawnBubble}
                      title="Bubble: Collect documents to send"
                    >
                      <i className="bi bi-circle"></i>
                      <span>Bubble</span>
                    </div>
                    {/* Future tools can go here */}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="binder-tabs">
            <div
              className={`binder-tab ${activeTab === "directory" ? "active" : ""}`}
              onClick={() => handleTabClick("directory")}
              title="Directory"
            >
              <i className="bi bi-list-ul"></i> Directory
            </div>
            <div
              className={`binder-tab ${activeTab === "details" ? "active" : ""}`}
              onClick={() => handleTabClick("details")}
              title="Details"
            >
              <i className="bi bi-card-text"></i> Details
            </div>
            <div
              className={`binder-tab ${activeTab === "tools" ? "active" : ""}`}
              onClick={() => handleTabClick("tools")}
              title="Tools"
            >
              <i className="bi bi-tools"></i> Tools
            </div>
          </div>
        </div>
      )}

      <div
        className="graph-canvas-wrapper"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {viewStack.length > 1 && (
          <button
            className="btn-icon btn-back"
            onClick={handleBack}
            title="Go Back"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
        )}
        <div className="info-tooltip-container">
          <i className="bi bi-info-circle"></i>
          <div className="info-tooltip-text">
            Navigation: Click nodes to drill down. Click Users to see documents.
            Drag documents to transfer. Drag users from Directory to add them to
            view.
          </div>
        </div>
        <svg ref={svgRef}></svg>

        {/* Breadcrumbs */}
        <div className="breadcrumb-bar">
          {viewStack.map((node, index) => (
            <span key={node.id} className="breadcrumb-item-wrapper">
              <span
                className={`breadcrumb-item-text ${index === viewStack.length - 1 ? "active" : ""}`}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {index === 0 && node.type === "organization"
                  ? "University"
                  : node.name}
              </span>
              {index < viewStack.length - 1 && (
                <span className="breadcrumb-separator">›</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {selectedDocId && (
        <SendDocumentModal
          show={isSendModalOpen}
          onClose={() => {
            setIsSendModalOpen(false);
            setTargetUserId(null);
            const l = graphData.links.find(
              (lnk) =>
                (lnk.source as Node).id === selectedDocId ||
                (lnk.target as Node).id === selectedDocId,
            );
            if (l) {
              l.isDetached = false;
              // Restore Physics
              simulationRef.current
                ?.force<d3.ForceLink<Node, LinkData>>("link")
                ?.links(graphData.links);

              // Restore Visuals
              const sourceId = (l.source as Node).id;
              const targetId = (l.target as Node).id;
              d3.select(svgRef.current!)
                .selectAll("line.link")
                .filter(
                  (ld: any) =>
                    ld.source.id === sourceId && ld.target.id === targetId,
                )
                .classed("link-detached", false);

              simulationRef.current?.alpha(0.1).restart();
            }
          }}
          documentId={selectedDocId}
          initialRecipientId={targetUserId}
        />
      )}

      {/* Bulk Send Modal */}
      {isMultiSendModalOpen && (
        <SendMultipleDocumentsModal
          show={isMultiSendModalOpen}
          onClose={() => {
            setIsMultiSendModalOpen(false);
            setMultiSendTargetId(null);
          }}
          documentIds={bubbleDocuments.map((d) => d.id)}
          initialRecipientId={multiSendTargetId}
          onSuccess={() => {
            // Success: clear bubble
            setBubbleDocuments([]);
            setBubbleNode(null);
          }}
        />
      )}
    </div>
  );
}
