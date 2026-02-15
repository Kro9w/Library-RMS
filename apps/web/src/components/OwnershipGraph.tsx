// apps/web/src/components/OwnershipGraph.tsx
import { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import { SendDocumentModal } from "./SendDocumentModal";
import { LoadingAnimation } from "./ui/LoadingAnimation";

type NodeType = "organization" | "campus" | "department" | "user" | "document";

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

  // New State for Binder
  const [activeTab, setActiveTab] = useState<"directory" | "details">(
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

  // --- Derived Graph Data ---
  const graphData = useMemo(() => {
    if (!orgHierarchy || viewStack.length === 0)
      return { nodes: [], links: [] };

    const currentRoot = viewStack[viewStack.length - 1];
    let nodes: Node[] = [];
    const links: LinkData[] = [];

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

    // --- Merge Temp Nodes ---
    // Filter out temp nodes that are already present in the natural view to avoid duplicates
    const existingIds = new Set(nodes.map((n) => n.id));
    const validTempNodes = tempNodes.filter((n) => !existingIds.has(n.id));

    // Add valid temp nodes
    nodes = [...nodes, ...validTempNodes];

    // Links
    nodes.forEach((n) => {
      // Only link natural nodes to root. Temp nodes float independently.
      // Also exclude root node itself from linking to itself
      if (n.id !== currentRoot.id && !tempNodes.find((tn) => tn.id === n.id)) {
        // Apply detached state if link is dragged
        links.push({
          source: rootNodeForGraph.id,
          target: n.id,
          isDetached: false, // Initial state, physics handles dynamic detachment
        });
      }
    });

    return { nodes, links };
  }, [orgHierarchy, viewStack, tempNodes]);

  // --- Event Handlers ---
  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return;
    event.stopPropagation();

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

  const handleTabClick = (tab: "directory" | "details") => {
    if (activeTab === tab) {
      setIsBinderOpen(!isBinderOpen);
    } else {
      setActiveTab(tab);
      setIsBinderOpen(true);
    }
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

        g.selectAll<SVGGElement, Node>(".node").attr(
          "transform",
          (d: any) => `translate(${d.x},${d.y})`,
        );

        // Update Tether Line if exists
        const tether = g.select(".tether");
        if (!tether.empty()) {
          // Tether update logic is handled in dragged()
        }
      });
    }

    const simulation = simulationRef.current;

    // --- 2. FORCE TUNING & INITIALIZATION ---
    const centerX = width / 2;
    const centerY = height / 2;

    nodes.forEach((n) => {
      // Temp nodes don't need forcing to center if they have x/y already from drag
      if (n.id === graphData.nodes[0]?.id) {
        n.x = centerX;
        n.y = centerY;
      } else if (typeof n.x === "undefined" || typeof n.y === "undefined") {
        // Initialize unknown positions
        n.x = centerX + (Math.random() - 0.5) * 50;
        n.y = centerY + (Math.random() - 0.5) * 50;
      }
      // If x/y are defined (from drag or previous tick), keep them.
    });

    simulation
      .force<d3.ForceLink<Node, LinkData>>("link")
      ?.distance(150)
      .strength(0.5);

    // TUNED CHARGE FORCE FOR DOCUMENT DRAGGING
    simulation.force<d3.ForceManyBody<Node>>("charge")?.strength((d) => {
      if ((d as any)._isDragging) return 0;
      if (d.type === "document") return 0; // Reduce document repulsion
      if (d.type === "user") return -30; // Further reduce user repulsion (was -50, originally -300)
      return -50; // Moderate for others
    });

    simulation.force<d3.ForceCollide<Node>>("collide")?.radius((d) => {
      if (d.type === "organization") return 50;
      if (d.type === "campus") return 45;
      if (d.type === "department") return 40;
      if (d.type === "user") return 35;
      return 25;
    });

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
      .attr("class", "node")
      .attr("data-id", (d) => d.id)
      .style("cursor", "pointer")
      .attr("opacity", 0)
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      )
      .on("click", (e, d) => handleNodeClick(e, d));

    nodeEnter.transition().duration(200).attr("opacity", 1);

    nodeEnter.append("circle");
    nodeEnter
      .append("text")
      .attr("class", "node-label")
      .attr("dy", 5)
      .attr("dx", 35);

    // Tooltip
    nodeEnter
      .on("mouseover", function (_e, d) {
        d3.select(this).raise().select("text").text(d.name);
      })
      .on("mouseout", function (_e, d) {
        d3.select(this).select("text").text(truncateText(d.name, d.type));
      });

    const nodeMerge = node.merge(nodeEnter);

    nodeMerge
      .select("circle")
      .attr("class", (d) => `node-circle ${d.type}`)
      .attr("r", (d) => {
        if (d.type === "organization") return 40;
        if (d.type === "campus") return 35;
        if (d.type === "department") return 30;
        if (d.type === "user") return 25;
        return 12; // Docs
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

    nodeMerge.select("text").text((d) => truncateText(d.name, d.type));

    simulation.nodes(nodes);
    simulation.force<d3.ForceLink<Node, LinkData>>("link")?.links(links);
    simulation.alpha(1).restart();

    // Drag Functions
    function dragstarted(event: any, d: any) {
      if (event.sourceEvent) event.sourceEvent.stopPropagation(); // Stop propagation to container
      if (!event.active) simulation?.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      (d as any)._isDragging = true;

      // If dragging a document owned by current user, detach link visually AND physically
      if (
        d.type === "document" &&
        currentUserData &&
        d.uploadedById === currentUserData.id
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

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
      const activeLink = (d as any)._activeLink;

      if (activeLink) {
        let target: Node | null = null;
        const threshold = 80;
        const originalOwnerId =
          (activeLink.target as Node).id === d.id
            ? (activeLink.source as Node).id
            : (activeLink.target as Node).id;

        // Find potential target
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

        const g = gRef.current;
        if (!g) return;

        const isNearTarget = target !== null;
        const docNodeElement = g.selectAll<SVGGElement, Node>(
          `g.node[data-id='${d.id}']`,
        );
        const targetNodeElement = target
          ? g.selectAll<SVGGElement, Node>(`g.node[data-id='${target.id}']`)
          : null;

        if (
          isNearTarget &&
          !docNodeElement.empty() &&
          targetNodeElement &&
          !targetNodeElement.empty()
        ) {
          const gooeyContainer = g.select(".gooey-container");

          // 1. Move elements to gooey container if not already there
          if (g.select(".tether").empty()) {
            gooeyContainer.append(() => docNodeElement.node()!);
            gooeyContainer.append(() => targetNodeElement.node()!);

            // Add tether
            gooeyContainer
              .append("line")
              .attr("class", "tether")
              .attr("data-source-id", d.id)
              .attr("data-target-id", target!.id)
              .attr("x1", d.fx!)
              .attr("y1", d.fy!)
              .attr("x2", target!.x!)
              .attr("y2", target!.y!);
          } else {
            // Update tether
            g.select(".tether")
              .attr("x1", d.fx!)
              .attr("y1", d.fy!)
              .attr("x2", target!.x!)
              .attr("y2", target!.y!);
          }

          // 2. Add classes
          docNodeElement
            .select(".node-circle")
            .classed("armed-for-drop", true)
            .classed("drop-magnet", true);
          targetNodeElement.select(".node-circle").classed("drop-magnet", true);

          // 3. Apply Magnet Force with Stronger Pull
          simulation!.force(
            "magnet",
            d3
              .forceLink<Node, LinkData>([
                { source: d, target: target! } as any,
              ])
              .strength(2.0) // Increased strength to overcome charge
              .distance(0),
          );
          simulation?.alpha(0.3).restart();
        } else {
          // Cleanup if moved away
          const gooeyContainer = g.select(".gooey-container");
          gooeyContainer.selectAll("g.node").each(function () {
            g.select(".nodes").append(() => this as Element);
          });
          g.select(".tether").remove();
          d3.selectAll(".node-circle.drop-magnet").classed(
            "drop-magnet",
            false,
          );
          d3.selectAll(".node-circle.armed-for-drop").classed(
            "armed-for-drop",
            false,
          );
          simulation!.force("magnet", null);
        }

        dropTargetNodeRef.current = target;
        setDropTargetNode(target);
      }
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation?.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      (d as any)._isDragging = false;

      const targetUser = dropTargetNodeRef.current;
      const g = gRef.current;

      if (targetUser && d.type === "document" && (d as any)._activeLink) {
        setSelectedDocId(d.id);
        setTargetUserId(targetUser.id);
        setIsSendModalOpen(true);
        // Note: We keep the link detached until the modal action completes or is cancelled
      } else if ((d as any)._activeLink) {
        // Drop cancelled: Re-attach
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
  }, [graphData]);

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
    </div>
  );
}
