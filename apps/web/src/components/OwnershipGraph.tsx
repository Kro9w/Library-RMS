// apps/web/src/components/OwnershipGraph.tsx
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { Link } from "react-router-dom";
// import { ConfirmModal } from "./ConfirmModal"; // Removed for this step

type NodeType = "user" | "organization" | "document";

type Node = d3.SimulationNodeDatum & {
  id: string;
  name: string;
  type: NodeType;
  organizationId?: string;
  email?: string;
  _detachedLink?: Link | null; // Keep this based on your logic
};

type Link = d3.SimulationLinkDatum<Node>;

type GraphData = { nodes: Node[]; links: Link[] };
type AppUser = AppRouterOutputs["documents"]["getAppUsers"][0];
type OrgDocument = AppRouterOutputs["documents"]["getAll"][0];
type UserDocument = AppRouterOutputs["documents"]["getDocumentsByUserId"][0];

const truncateText = (name: string, type: NodeType, maxLength = 10) => {
  if (type !== "document" || name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + "...";
};

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  // --- 1. Refs for drag logic ---
  const dragTimer = useRef<NodeJS.Timeout | null>(null);
  // FIX: Store the line ELEMENT, not its data
  const detachedLineElementRef = useRef<SVGLineElement | null>(null);
  // --- Drop target ref for drag ---
  const dropTargetNodeRef = useRef<Node | null>(null);
  // -------------------------------

  const [currentView, setCurrentView] = useState<"org" | "doc">("org");
  const [selectedOrg, setSelectedOrg] = useState<
    AppRouterOutputs["user"]["getMe"]["organization"] | null
  >(null);
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [selectedUserNode, setSelectedUserNode] = useState<Node | null>(null);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);

  // --- 1. Add state for drop target ---
  const [dropTargetNode, setDropTargetNode] = useState<Node | null>(null);
  // ------------------------------------

  // (Data Fetching is unchanged)
  const { data: currentUserData, isLoading: isLoadingCurrentUser } =
    trpc.user.getMe.useQuery();

  const usersQuery = trpc.documents.getAppUsers.useQuery(undefined, {
    enabled: !!currentUserData?.organizationId,
  });

  const allDocumentsQuery = trpc.documents.getAll.useQuery(undefined, {
    enabled: !!currentUserData?.organizationId,
  });

  const { data: documentsData, isLoading: isLoadingDocsForPanel } =
    trpc.documents.getDocumentsByUserId.useQuery(selectedUserNode?.id || "", {
      enabled: !!selectedUserNode,
    });

  // (Removed tRPC mutation)

  // (Data Processing Effect - Unchanged)
  useEffect(() => {
    const users = usersQuery.data;
    const allDocuments = allDocumentsQuery.data;

    if (currentView === "org" && currentUserData?.organization && users) {
      const orgNode: Node = {
        id: currentUserData.organization.id,
        name: currentUserData.organization.name,
        type: "organization",
      };
      const userNodes: Node[] = users.map((user: AppUser) => ({
        id: user.id,
        name: user.name || user.email || "User",
        type: "user",
        organizationId: user.organizationId ?? undefined,
        email: user.email,
      }));
      const userLinks: Link[] = userNodes.map((userNode) => ({
        source: userNode, // Use node object
        target: orgNode, // Use node object
      }));
      setGraphData({
        nodes: [orgNode, ...userNodes],
        links: userLinks,
      });
      setSelectedOrg(null);
    } else if (currentView === "doc" && selectedOrg && users && allDocuments) {
      const orgUsers = users.filter(
        (u: { organizationId: any }) => u.organizationId === selectedOrg.id
      );
      const orgDocs = allDocuments.filter(
        (d: OrgDocument) => d.organizationId === selectedOrg.id
      );

      const userNodes: Node[] = orgUsers.map((user: AppUser) => ({
        id: user.id,
        name: user.name || user.email || "User",
        type: "user",
        organizationId: user.organizationId ?? undefined,
        email: user.email,
      }));
      const docNodes: Node[] = orgDocs.map((doc: OrgDocument) => ({
        id: doc.id,
        name: doc.title,
        type: "document",
      }));

      const nodes = [...userNodes, ...docNodes];
      const docLinks: Link[] = orgDocs
        .map((doc: OrgDocument) => {
          const sourceNode = nodes.find((n) => n.id === doc.id);
          const targetNode = nodes.find((n) => n.id === doc.uploadedById);
          if (sourceNode && targetNode) {
            return {
              source: sourceNode, // Use node object
              target: targetNode, // Use node object
            };
          }
          return null;
        })
        .filter((l: Link | null): l is Link => l !== null);
      setGraphData({
        nodes,
        links: docLinks,
      });
    } else {
      setGraphData({ nodes: [], links: [] });
    }
  }, [
    currentView,
    selectedOrg,
    currentUserData,
    usersQuery.data,
    allDocumentsQuery.data,
  ]);

  // (User Documents Effect is unchanged)
  useEffect(() => {
    if (documentsData) {
      setUserDocuments(documentsData);
    } else {
      setUserDocuments([]);
    }
  }, [documentsData]);

  // (UI Handlers are unchanged...)
  const closeDetailsPanel = () => {
    setSelectedUserNode(null);
    d3.selectAll(".node-circle.selected").classed("selected", false);
  };
  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return; // Prevents click on drag
    event.stopPropagation();
    if (d.type === "organization") {
      const orgData = currentUserData?.organization;
      if (orgData && orgData.id === d.id) {
        setSelectedOrg(orgData);
        setCurrentView("doc");
        closeDetailsPanel();
      }
    } else if (d.type === "user" && currentView === "doc") {
      setSelectedUserNode(d);
      d3.selectAll(".node-circle.selected").classed("selected", false);
      d3.select(event.currentTarget as SVGGElement)
        .select(".node-circle")
        .classed("selected", true);
    } else {
      closeDetailsPanel();
    }
  };
  const handleBackClick = () => {
    setCurrentView("org");
    setSelectedOrg(null);
    closeDetailsPanel();
  };

  // (Removed Modal Handlers)

  // (D3 Rendering Effect)
  useEffect(() => {
    const svgElement = svgRef.current;
    if (graphData.nodes.length === 0 || !svgElement?.parentElement) {
      const svg = d3.select(svgElement);
      svg.selectAll("*").remove();
      return;
    }

    const nodes = graphData.nodes;
    const links = graphData.links;

    const width = svgElement.parentElement.clientWidth;
    const height = svgElement.parentElement.clientHeight;
    const svg = d3
      .select(svgElement)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on("start", () => svg.classed("grabbing", true))
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
      .on("end", () => svg.classed("grabbing", false));
    svg.call(zoomBehavior).on("dblclick.zoom", null);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(currentView === "org" ? 120 : 80)
          .strength(0.6)
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d: d3.SimulationNodeDatum) => {
          const node = d as Node;
          // 🧠 Disable charge repulsion while dragging
          if ((node as any)._isDragging) return 0;
          if (currentView === "org") {
            return node.type === "organization" ? -600 : -400;
          }
          return node.type === "document" ? -0 : -50;
        })
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d: any) => {
            if ((d as Node).type === "organization") return 45;
            if ((d as Node).type === "user") return 35;
            return 25;
          })
          .strength(0.9)
      );

    simulationRef.current = simulation as d3.Simulation<Node, Link>;

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line");

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes, (d: any) => d.id)
      .enter()
      .append("g")
      .style("cursor", (d: any) => {
        const n = d as Node;
        if (n.type === "organization") return "pointer";
        if (n.type === "user" && currentView === "doc") return "pointer";
        if (n.type === "document" && currentView === "doc") return "grab";
        return "default";
      })
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d: any) => handleNodeClick(event, d as Node))
      .on("mouseover", function (_event, d: any) {
        d3.select(this).raise();
        d3.select(this)
          .select("text")
          .text((d as Node).name);
      })
      .on("mouseout", function (_event, d: any) {
        d3.select(this)
          .select("text")
          .text(truncateText((d as Node).name, (d as Node).type));
      });

    node
      .append("circle")
      .attr("r", (d: any) => {
        if ((d as Node).type === "organization") return 35;
        if ((d as Node).type === "user") return 25;
        return 12;
      })
      .attr("class", (d: any) => `node-circle ${(d as Node).type}`)
      .classed("selected", (d: any) => d.id === selectedUserNode?.id);

    node
      .append("text")
      .text((d: any) => truncateText((d as Node).name, (d as Node).type))
      .attr("x", (d: any) => ((d as Node).type === "organization" ? 40 : 30))
      .attr("y", 5)
      .attr("class", "node-label");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // --- 2. Simplified Drag Handlers ---
    function dragstarted(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      event.sourceEvent.stopPropagation();
      if (!event.active) simulation.alphaTarget(0.1).restart();

      // Set dragging flag for forceManyBody
      (d as any)._isDragging = true;
      simulation.alpha(0.1).restart();

      d.fx = d.x;
      d.fy = d.y;

      const node = d as Node;
      if (node.type === "document" && currentView === "doc") {
        d3.select(event.sourceEvent.currentTarget).raise();

        if (dragTimer.current) clearTimeout(dragTimer.current);
        detachedLineElementRef.current = null;
        d3.selectAll(".links line.link-detached").classed(
          "link-detached",
          false
        );
        d3.selectAll(".node-circle.armed-for-drop").classed(
          "armed-for-drop",
          false
        );

        // 🟢 Add global mouseup listener
        const handleMouseUp = () => {
          if (detachedLineElementRef.current) {
            d3.select(detachedLineElementRef.current).classed(
              "link-detached",
              false
            );
            detachedLineElementRef.current = null;
          }
          d3.select(window).on("mouseup.drag-cleanup", null); // remove listener
        };
        d3.select(window).on("mouseup.drag-cleanup", handleMouseUp);

        // Remove timeout logic for armed-for-drop: now handled in dragged()
        // Instead, detach the link immediately
        const simulation = simulationRef.current;
        if (!simulation) return;
        const linkForce = simulation.force<d3.ForceLink<Node, Link>>("link");
        if (!linkForce) return;

        const linkData = linkForce
          .links()
          .find(
            (l: Link) =>
              (l.source as Node).id === d.id || (l.target as Node).id === d.id
          );

        if (linkData) {
          // Remove the link from the simulation
          const links = linkForce.links().filter((l) => l !== linkData);
          linkForce.links(links);
          (d as any)._detachedLink = linkData; // Store on node

          const lineElement = d3
            .selectAll<SVGLineElement, Link>(".links line")
            .filter((l: Link) => l === linkData)
            .node();

          if (lineElement) {
            detachedLineElementRef.current = lineElement;
            d3.select(lineElement).classed("link-detached", true);
          }
        }
      }
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      d.fx = event.x;
      d.fy = event.y;

      const detachedLink = (d as any)._detachedLink;
      if (!detachedLink) return;

      let target: Node | null = null;
      const threshold = 70;
      const originalOwnerId = (detachedLink.target as Node).id;

      for (const u of nodes) {
        if (u.type !== "user" || u.id === originalOwnerId) continue;
        if (!u.x || !u.y || !d.fx || !d.fy) continue;
        const dx = u.x - d.fx;
        const dy = u.y - d.fy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < threshold) {
          target = u;
          break; // nearest user within 100px
        }
      }

      // Type-safe selection for the dragged node's <g> element and its circle
      const nodeElement = d3
        .selectAll<SVGGElement, Node>(".nodes g")
        .filter((n) => n.id === d.id)
        .node();
      if (nodeElement) {
        d3.select(nodeElement)
          .select<SVGCircleElement>(".node-circle")
          .classed("armed-for-drop", target !== null);
      }

      // Update drop target ref and state
      dropTargetNodeRef.current = target;
      if (target) {
        setDropTargetNode(target);
      } else {
        setDropTargetNode(null);
      }
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);

      // Reset dragging flag for forceManyBody
      (d as any)._isDragging = false;
      simulation.alpha(0.3).restart();

      if (dragTimer.current) {
        clearTimeout(dragTimer.current);
        dragTimer.current = null;
      }

      // --- 3. Log drop target from ref and clear drop target state on drag end ---
      if (dropTargetNodeRef.current) {
        console.log("Dropped near user:", dropTargetNodeRef.current.name);
      }
      dropTargetNodeRef.current = null;
      setDropTargetNode(null);
      // ------------------------------------------

      d.fx = null;
      d.fy = null;

      // Restore the link to the simulation if it was detached
      const linkForce = simulation.force<d3.ForceLink<Node, Link>>("link");
      const detachedLink = (d as any)._detachedLink;
      if (linkForce && detachedLink) {
        const links = linkForce.links();
        links.push(detachedLink);
        linkForce.links(links);
        (d as any)._detachedLink = null;
      }

      // ✅ Safely remove visual cue from all nodes instead of relying on currentTarget
      d3.selectAll(".node-circle.armed-for-drop").classed(
        "armed-for-drop",
        false
      );

      d3.select(window).on("mouseup.drag-cleanup", null);

      if (detachedLineElementRef.current) {
        d3.select(detachedLineElementRef.current).classed(
          "link-detached",
          false
        );
        detachedLineElementRef.current = null;
      }
    }
    // ------------------------------------

    return () => {
      simulation.stop();
      simulationRef.current = null;
      if (dragTimer.current) {
        clearTimeout(dragTimer.current);
      }
    };
  }, [graphData, currentView, selectedUserNode]);

  // --- 4. Add effect to apply/remove .drop-target class ---
  useEffect(() => {
    if (!svgRef.current) return;
    // Apply/remove class based on React state
    d3.select(svgRef.current)
      .selectAll(".node-circle.user")
      .classed("drop-target", (d: any) => d.id === dropTargetNode?.id);
  }, [dropTargetNode]);
  // ------------------------------------------------------

  // (Loading/Error States are unchanged)
  const isLoading =
    isLoadingCurrentUser || usersQuery.isLoading || allDocumentsQuery.isLoading;
  const isError = usersQuery.isError || allDocumentsQuery.isError;
  const error = usersQuery.error || allDocumentsQuery.error;

  if (isLoading)
    return <div className="graph-status-message">Loading graph data...</div>;
  if (isError)
    return (
      <div className="graph-status-message error">Error: {error?.message}</div>
    );
  if (!currentUserData?.organization) {
    return (
      <div className="graph-status-message">
        <h4>No Organization Found</h4>
        <p className="text-muted">You must join or create an organization.</p>
      </div>
    );
  }

  // (Render Component)
  return (
    <div className="graph-container">
      <div className="graph-canvas-wrapper">
        {currentView === "doc" && (
          <button
            className="btn-icon btn-back"
            onClick={handleBackClick}
            title="Go Back"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
        )}
        <svg ref={svgRef}></svg>
      </div>
      <div
        className={`details-panel ${
          selectedUserNode && currentView === "doc" ? "visible" : ""
        }`}
      >
        {selectedUserNode && (
          <>
            <div className="d-flex justify-content-between align-items-center">
              <h4>Documents for {selectedUserNode.name}</h4>
              <button
                className="btn-close"
                onClick={closeDetailsPanel}
              ></button>
            </div>
            <hr />
            {isLoadingDocsForPanel ? (
              <p>Loading documents...</p>
            ) : userDocuments.length > 0 ? (
              <ul className="list-group">
                {userDocuments.map((doc: UserDocument) => (
                  <li key={doc.id} className="list-group-item">
                    <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No documents uploaded by this user.</p>
            )}
          </>
        )}
      </div>

      {/* (Removed Modal from render) */}
    </div>
  );
}
