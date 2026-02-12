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

  const [viewStack, setViewStack] = useState<Node[]>([]);
  const [_expandedUserId, _setExpandedUserId] = useState<string | null>(null);
  const [selectedUserNode, setSelectedUserNode] = useState<Node | null>(null);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [_dropTargetNode, setDropTargetNode] = useState<Node | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

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

  // --- 1. INITIAL STATE: Start at User's Campus ---
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

      // Find User's Campus
      if (currentUserData.campusId) {
        const campus = orgHierarchy.campuses.find(
          (c) => c.id === currentUserData.campusId,
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
      // Note: Not auto-drilling to Department, as per "default view is the campus level only"
      // (which implies seeing the Campus and its departments).

      setViewStack(initialStack);
    }
  }, [orgHierarchy, currentUserData]);

  // --- Derived Graph Data ---
  const graphData = useMemo(() => {
    if (!orgHierarchy || viewStack.length === 0)
      return { nodes: [], links: [] };

    const currentRoot = viewStack[viewStack.length - 1];
    const nodes: Node[] = [];
    const links: LinkData[] = [];

    // Mother Node (Starts at Center, Movable)
    const rootNodeForGraph: Node = {
      ...currentRoot,
      // Important: Reset previous velocity to avoid "flinging" when switching views
      vx: 0,
      vy: 0,
      // Explicitly remove fx/fy if they were set by previous drags or initialization
      fx: undefined,
      fy: undefined,
    };
    nodes.push(rootNodeForGraph);

    // Children Generator Helper
    const addNode = (n: Node) => {
      // Initialize child positions randomly AROUND (0,0).
      // We will offset this to the center of the screen in useEffect.
      const angle = Math.random() * 2 * Math.PI;
      const radius = 50 + Math.random() * 100;
      n.x = Math.cos(angle) * radius;
      n.y = Math.sin(angle) * radius;
      nodes.push(n);
    };

    if (currentRoot.type === "organization") {
      orgHierarchy.campuses.forEach((c) => {
        addNode({
          id: c.id,
          name: c.name,
          type: "campus",
          parentId: currentRoot.id,
          color: "var(--primary)",
        });
      });
    } else if (currentRoot.type === "campus") {
      const campus = orgHierarchy.campuses.find((c) => c.id === currentRoot.id);
      if (campus) {
        campus.departments.forEach((d) => {
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
        const d = c.departments.find((dep) => dep.id === currentRoot.id);
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
          // Users don't expand docs here unless clicked (handled by viewStack push below)
        });
      }
    } else if (currentRoot.type === "user") {
      // --- NEW: User as Root View ---
      // Find user
      let user: any = null;
      // Efficient lookup map would be better but this works for now
      for (const c of orgHierarchy.campuses) {
        for (const d of c.departments) {
          const u = d.users.find((usr) => usr.id === currentRoot.id);
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

    // Links
    nodes.forEach((n) => {
      if (n.id !== currentRoot.id) {
        links.push({ source: rootNodeForGraph.id, target: n.id });
      }
    });

    return { nodes, links };
  }, [orgHierarchy, viewStack]);

  // --- Event Handlers ---
  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return;
    event.stopPropagation();

    // Check if clicked node is already in the stack (anywhere)
    const stackIndex = viewStack.findIndex((n) => n.id === d.id);
    if (stackIndex !== -1) {
      // If it's the current root (last item), do nothing (or maybe refresh?)
      if (stackIndex === viewStack.length - 1) return;

      // If it's higher up in the stack, navigate back to it
      // This handles "repeatedly clicking... keep on appending"
      const newStack = viewStack.slice(0, stackIndex + 1);
      setViewStack(newStack);

      // Reset selections if we went up
      if (d.type !== "user") setSelectedUserNode(null);
      return;
    }

    // Normal Drill Down
    if (d.type === "campus" || d.type === "department" || d.type === "user") {
      // Drill Down
      setViewStack((prev) => {
        // Prevent duplicate pushing if the node is already the last one
        if (prev[prev.length - 1]?.id === d.id) return prev;
        return [...prev, d];
      });

      // If it's a user, also select for panel
      if (d.type === "user") {
        setSelectedUserNode(d);
      } else {
        setSelectedUserNode(null);
      }
    }
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      const newStack = viewStack.slice(0, viewStack.length - 1);
      setViewStack(newStack);

      // If we went back from User, clear selection? Or keep?
      // Clearing for cleaner state
      const newRoot = newStack[newStack.length - 1];
      if (newRoot.type !== "user") setSelectedUserNode(null);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newStack = viewStack.slice(0, index + 1);
    setViewStack(newStack);
    const newRoot = newStack[newStack.length - 1];
    if (newRoot.type !== "user") setSelectedUserNode(null);
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
      });
    }

    const simulation = simulationRef.current;

    // --- 2. FORCE TUNING & INITIALIZATION ---

    // Initialize positions centered on screen
    // This ensures the graph spawns in the center without "flying in"
    const centerX = width / 2;
    const centerY = height / 2;

    nodes.forEach((n) => {
      // If it's the root node (first in list), force it to center
      if (n.id === graphData.nodes[0]?.id) {
        n.x = centerX;
        n.y = centerY;
      } else {
        // Offset relative positions (calculated in addNode) by center coordinates
        // Check if x/y are defined (they should be from addNode)
        if (typeof n.x === "number" && typeof n.y === "number") {
          n.x += centerX;
          n.y += centerY;
        } else {
          n.x = centerX + (Math.random() - 0.5) * 50;
          n.y = centerY + (Math.random() - 0.5) * 50;
        }
      }
    });

    simulation
      .force<d3.ForceLink<Node, LinkData>>("link")
      ?.distance(150) // Constant distance as requested
      .strength(0.5);

    simulation.force<d3.ForceManyBody<Node>>("charge")?.strength((d) => {
      if ((d as any)._isDragging) return 0;
      return -300; // Constant repulsion for similar physics
    });

    simulation.force<d3.ForceCollide<Node>>("collide")?.radius((d) => {
      // Maintain visual hierarchy in collision radius
      if (d.type === "organization") return 50;
      if (d.type === "campus") return 45;
      if (d.type === "department") return 40;
      if (d.type === "user") return 35;
      return 25; // Docs
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
    simulation.alpha(1).restart(); // Full restart on data change

    // Drag Functions (Same as before)
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation?.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      (d as any)._isDragging = true;
      if (
        d.type === "document" &&
        currentUserData &&
        d.uploadedById === currentUserData.id
      ) {
        const l = links.find((lnk) => (lnk.source as Node).id === d.id);
        if (l) {
          l.isDetached = true;
          (d as any)._activeLink = l;
          d3.select(svgRef.current!)
            .selectAll("line.link")
            .filter((ld: any) => ld === l)
            .classed("link-detached", true);
        }
      }
    }
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
      const activeLink = (d as any)._activeLink;
      if (activeLink) {
        let target: Node | null = null;
        const originalOwnerId = (activeLink.target as Node).id;
        for (const u of nodes) {
          if (u.type !== "user" || u.id === originalOwnerId) continue;
          const dx = u.x! - d.fx!;
          const dy = u.y! - d.fy!;
          if (Math.sqrt(dx * dx + dy * dy) < 60) {
            target = u;
            break;
          }
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
      if (targetUser && d.type === "document" && (d as any)._activeLink) {
        setSelectedDocId(d.id);
        setTargetUserId(targetUser.id);
        setIsSendModalOpen(true);
      } else if ((d as any)._activeLink) {
        (d as any)._activeLink.isDetached = false;
        d3.select(svgRef.current!)
          .selectAll("line.link")
          .filter((ld: any) => ld === (d as any)._activeLink)
          .classed("link-detached", false);
      }
      (d as any)._activeLink = null;
      dropTargetNodeRef.current = null;
      setDropTargetNode(null);
    }
  }, [graphData]);

  if (isLoadingCurrentUser || isLoadingHierarchy) return <LoadingAnimation />;
  if (isError)
    return <div className="text-danger">Error: {error?.message}</div>;

  return (
    <div className="graph-container">
      <div className="graph-canvas-wrapper">
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
            Drag documents to transfer.
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

      <div className={`details-panel ${selectedUserNode ? "visible" : ""}`}>
        {selectedUserNode && (
          <>
            <div className="d-flex justify-content-between align-items-center">
              <h4>Documents for {selectedUserNode.name}</h4>
              <button
                className="btn-close"
                onClick={() => setSelectedUserNode(null)}
              ></button>
            </div>
            <hr />
            {userDocuments.length > 0 ? (
              <ul className="list-group">
                {userDocuments.map((doc: any) => (
                  <li key={doc.id} className="list-group-item">
                    {doc.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No documents.</p>
            )}
          </>
        )}
      </div>

      {selectedDocId && (
        <SendDocumentModal
          show={isSendModalOpen}
          onClose={() => {
            setIsSendModalOpen(false);
            setTargetUserId(null);
            const l = graphData.links.find(
              (lnk) => (lnk.source as Node).id === selectedDocId,
            );
            if (l) l.isDetached = false;
          }}
          documentId={selectedDocId}
          initialRecipientId={targetUserId}
        />
      )}
    </div>
  );
}
