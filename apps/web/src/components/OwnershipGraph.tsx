// apps/web/src/components/OwnershipGraph.tsx
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { Link } from "react-router-dom";
import { ConfirmModal } from "./ConfirmModal";

type NodeType = "user" | "organization" | "document";

type Node = d3.SimulationNodeDatum & {
  id: string;
  name: string;
  type: NodeType;
  organizationId?: string;
  email?: string;
  _detachedLink?: Link | null;
};

type Link = d3.SimulationLinkDatum<Node>;

type TransferDetails = {
  docNode: Node;
  userNode: Node;
  detachedLink: Link | null;
};

type GraphData = { nodes: Node[]; links: Link[] };
// --- MODIFIED: Update types to use new global procedures ---
type AppUser = AppRouterOutputs["documents"]["getAllUsers"][0];
type OrgDocument = AppRouterOutputs["documents"]["getAllDocs"][0];
type Org = AppRouterOutputs["documents"]["getAllOrgs"][0];
// ----------------------------------------------------------
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

  // --- 1. Add ref for the main <g> element ---
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  const dragTimer = useRef<NodeJS.Timeout | null>(null);
  const detachedLineElementRef = useRef<SVGLineElement | null>(null);
  const dropTargetNodeRef = useRef<Node | null>(null);

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

  const [dropTargetNode, setDropTargetNode] = useState<Node | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferDetails, setTransferDetails] =
    useState<TransferDetails | null>(null);

  const [expandedUserNodeId, setExpandedUserNodeId] = useState<string | null>(
    null
  );

  const utils = trpc.useContext();

  const { data: currentUserData, isLoading: isLoadingCurrentUser } =
    trpc.user.getMe.useQuery();

  // --- MODIFIED: Use new global tRPC procedures ---
  const allOrgsQuery = trpc.documents.getAllOrgs.useQuery();
  const allUsersQuery = trpc.documents.getAllUsers.useQuery();
  const allDocsQuery = trpc.documents.getAllDocs.useQuery();
  // ------------------------------------------------

  const { data: documentsData, isLoading: isLoadingDocsForPanel } =
    trpc.documents.getDocumentsByUserId.useQuery(selectedUserNode?.id || "", {
      enabled: !!selectedUserNode,
    });

  const transferMutation = trpc.documents.transferDocument.useMutation({
    onSuccess: () => {
      // --- MODIFIED: Invalidate new global query ---
      utils.documents.getAllDocs.invalidate();
      // ---------------------------------------------
      utils.documents.getDocumentsByUserId.invalidate(selectedUserNode?.id);
      handleCloseModal();
    },
    onError: (error) => {
      console.error("Transfer failed:", error);
      alert(`Transfer failed: ${error.message}`);
    },
  });

  // --- MODIFIED: Re-written data processing effect ---
  useEffect(() => {
    const allUsers = allUsersQuery.data;
    const allDocuments = allDocsQuery.data;
    const allOrgs = allOrgsQuery.data;

    if (currentView === "org" && allOrgs && allUsers) {
      const orgNodes: Node[] = allOrgs.map((org: Org) => ({
        id: org.id,
        name: org.name,
        type: "organization",
      }));

      const userNodes: Node[] = allUsers.map((user: AppUser) => ({
        id: user.id,
        name: user.name || user.email || "User",
        type: "user",
        organizationId: user.organizationId ?? undefined,
        email: user.email,
      }));

      const userLinks: Link[] = userNodes.flatMap((userNode) => {
        if (!userNode.organizationId) return [];
        const orgNode = orgNodes.find(
          (org) => org.id === userNode.organizationId
        );
        if (!orgNode) return [];
        return [
          {
            source: userNode,
            target: orgNode,
          } as Link,
        ];
      });

      let finalNodes = [...orgNodes, ...userNodes];
      let finalLinks = [...userLinks];

      if (expandedUserNodeId && allDocuments) {
        const expandedUserNode = userNodes.find(
          (u) => u.id === expandedUserNodeId
        );

        if (expandedUserNode) {
          const userDocs = allDocuments.filter(
            (d: OrgDocument) => d.uploadedById === expandedUserNodeId
          );

          const docNodes: Node[] = userDocs.map((doc: OrgDocument) => ({
            id: doc.id,
            name: doc.title,
            type: "document",
          }));

          const docLinks: Link[] = docNodes.map((docNode) => ({
            source: docNode, // Doc is source
            target: expandedUserNode, // User is target
          }));

          finalNodes = [...finalNodes, ...docNodes];
          finalLinks = [...finalLinks, ...docLinks];
        }
      }

      setGraphData({
        nodes: finalNodes,
        links: finalLinks,
      });
      setSelectedOrg(null);
    } else if (
      currentView === "doc" &&
      selectedOrg &&
      allUsers &&
      allDocuments
    ) {
      // This logic remains valid as it filters from the global data
      const orgUsers = allUsers.filter(
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
              source: sourceNode,
              target: targetNode,
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
    // currentUserData, // Not needed for graph building anymore
    allOrgsQuery.data,
    allUsersQuery.data,
    allDocsQuery.data,
    expandedUserNodeId,
  ]);
  // --- END MODIFIED EFFECT ---

  // (User Documents Effect - Unchanged)
  useEffect(() => {
    if (documentsData) {
      setUserDocuments(documentsData);
    } else {
      setUserDocuments([]);
    }
  }, [documentsData]);

  // (UI Handlers - Unchanged)
  const closeDetailsPanel = () => {
    setSelectedUserNode(null);
    d3.selectAll(".node-circle.selected").classed("selected", false);
  };

  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return;
    event.stopPropagation();

    if (d.type === "organization") {
      const orgData = allOrgsQuery.data?.find(
        (org: { id: string }) => org.id === d.id
      );
      if (orgData) {
        setSelectedOrg(orgData as any);
        setCurrentView("doc");
        setExpandedUserNodeId(null);
        closeDetailsPanel();
      }
    } else if (d.type === "user" && currentView === "org") {
      if (expandedUserNodeId === d.id) {
        setExpandedUserNodeId(null);
      } else {
        setExpandedUserNodeId(d.id);
      }
      closeDetailsPanel();
    } else if (d.type === "user" && currentView === "doc") {
      setSelectedUserNode(d);
      setExpandedUserNodeId(null);
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
    setExpandedUserNodeId(null);
    closeDetailsPanel();
  };

  // (Modal Handlers - Unchanged)
  const handleConfirmTransfer = () => {
    if (transferDetails && transferDetails.userNode.email) {
      transferMutation.mutate({
        docId: transferDetails.docNode.id,
        newOwnerEmail: transferDetails.userNode.email,
      });
    } else {
      console.error("Missing transfer details or target user email");
      alert("Could not initiate transfer: target user email is missing.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (transferDetails?.detachedLink && !transferMutation.isSuccess) {
      const simulation = simulationRef.current;
      const linkForce = simulation?.force<d3.ForceLink<Node, Link>>("link");
      if (linkForce) {
        const links = linkForce.links();
        links.push(transferDetails.detachedLink);
        linkForce.links(links);
        simulation?.alpha(0.1).restart();
      }
    }
    if (detachedLineElementRef.current) {
      d3.select(detachedLineElementRef.current).classed("link-detached", false);
      detachedLineElementRef.current = null;
    }
    setTransferDetails(null);
  };

  // --- 2. MAJOR REFACTOR: D3 Enter/Update/Exit Pattern ---
  useEffect(() => {
    const svgElement = svgRef.current;
    if (graphData.nodes.length === 0 || !svgElement?.parentElement) {
      const svg = d3.select(svgElement);
      svg.selectAll("*").remove(); // Clear if no data
      simulationRef.current?.stop();
      simulationRef.current = null;
      gRef.current = null;
      return;
    }

    const nodes = graphData.nodes;
    const links = graphData.links;

    const width = svgElement.parentElement.clientWidth;
    const height = svgElement.parentElement.clientHeight;
    const svg = d3.select(svgElement);

    // --- INIT-ONCE: Create simulation, g, and zoom ---
    if (!simulationRef.current) {
      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove(); // Clear canvas ONCE

      const g = svg.append("g");
      gRef.current = g;

      // Add groups for links and nodes (nodes on top)
      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");

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
        .forceSimulation<Node, Link>()
        .force(
          "link",
          d3
            .forceLink<Node, Link>([]) // Start with empty links
            .id((d: any) => d.id)
        )
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide());

      simulationRef.current = simulation;

      // --- TICK HANDLER (defined once) ---
      simulation.on("tick", () => {
        g.selectAll<SVGLineElement, Link>(".link")
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        g.selectAll<SVGGElement, Node>(".node").attr(
          "transform",
          (d: any) => `translate(${d.x},${d.y})`
        );
      });
    }

    // --- GET PERSISTENT SIMULATION AND G-LAYER ---
    const simulation = simulationRef.current;
    const g = gRef.current;
    if (!g) return;

    // --- UPDATE FORCES (dynamic based on view) ---
    simulation
      .force<d3.ForceLink<Node, Link>>("link")
      ?.distance((l: any) => {
        if (l.source.type === "user" && l.target.type === "organization") {
          return 100;
        }
        if (l.source.type === "document" && l.target.type === "user") {
          return 70;
        }
        return currentView === "org" ? 100 : 70;
      })
      .strength(0.6);

    simulation
      .force<d3.ForceManyBody<Node>>("charge")
      ?.strength((d: d3.SimulationNodeDatum) => {
        const node = d as Node;
        if ((node as any)._isDragging) return 0;
        if (currentView === "org") {
          if (node.type === "organization") return -1;
          if (node.type === "user") return -1;
          return 10;
        } else {
          if (node.type === "document") return 0;
          if (node.type === "user") return -50;
          return -50;
        }
      });

    simulation
      .force<d3.ForceCollide<Node>>("collide")
      ?.radius((d: any) => {
        if ((d as Node).type === "organization") return 45;
        if ((d as Node).type === "user") return 30;
        return 20;
      })
      .strength(0.4);

    // --- DATA-BINDING (LINKS) ---
    const link = g
      .select(".links")
      .selectAll<SVGLineElement, Link>("line.link")
      .data(links, (d: any) => `${d.source.id}-${d.target.id}`); // Key links

    // Exit
    link.exit().remove();

    // Enter
    const linkEnter = link.enter().append("line").attr("class", "link");

    // Merge
    const linkMerge = link.merge(linkEnter);

    // --- DATA-BINDING (NODES) ---
    const node = g
      .select(".nodes")
      .selectAll<SVGGElement, Node>("g.node")
      .data(nodes, (d: any) => d.id); // Key nodes

    // Exit
    node.exit().remove();

    // Enter
    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", (d: any) => {
        const n = d as Node;
        if (n.type === "organization") return "pointer";
        if (n.type === "user") return "pointer";
        if (n.type === "document") return "grab";
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

    // Append circle to ENTERING nodes
    nodeEnter
      .append("circle")
      .attr("r", (d: any) => {
        if ((d as Node).type === "organization") return 35;
        if ((d as Node).type === "user") return 25;
        return 12; // document
      })
      .attr("class", (d: any) => `node-circle ${(d as Node).type}`);

    // Append text to ENTERING nodes
    nodeEnter
      .append("text")
      .text((d: any) => truncateText((d as Node).name, (d as Node).type))
      .attr("x", (d: any) => {
        const node = d as Node;
        if (node.type === "organization") return 40;
        if (node.type === "user") return 30;
        if (node.type === "document") return 15;
        return 30;
      })
      .attr("y", 5)
      .attr("class", "node-label");

    // --- UPDATE (All nodes, new and old) ---
    const nodeMerge = node.merge(nodeEnter);

    nodeMerge
      .select<SVGCircleElement>(".node-circle")
      .classed("selected", (d: any) => d.id === selectedUserNode?.id)
      .classed("expanded", (d: any) => d.id === expandedUserNodeId);

    // In case node text needs to be truncated differently (e.g. on mouseout)
    nodeMerge
      .select<SVGTextElement>("text")
      .text((d: any) => truncateText((d as Node).name, (d as Node).type));

    // --- UPDATE SIMULATION DATA & RESTART ---
    simulation.nodes(nodes);
    simulation.force<d3.ForceLink<Node, Link>>("link")?.links(links);
    simulation.alpha(0.3).restart(); // Re-heat the simulation

    // --- Drag Handlers (must be inside useEffect) ---
    function dragstarted(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      event.sourceEvent.stopPropagation();
      if (!event.active) simulation.alphaTarget(0.1).restart();

      (d as any)._isDragging = true;
      simulation.alpha(0.1).restart();

      d.fx = d.x;
      d.fy = d.y;

      const node = d as Node;
      if (node.type === "document") {
        const linkForce = simulation.force<d3.ForceLink<Node, Link>>("link");
        if (!linkForce) return;

        const linkData = linkForce
          .links()
          .find((l: Link) => (l.source as Node).id === d.id);

        if (!linkData || !currentUserData) {
          return;
        }

        const ownerNode = linkData.target as Node;
        if (ownerNode.id !== currentUserData.id) {
          return; // Not the owner
        }

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

        const handleMouseUp = () => {
          if (detachedLineElementRef.current) {
            d3.select(detachedLineElementRef.current).classed(
              "link-detached",
              false
            );
            detachedLineElementRef.current = null;
          }
          d3.select(window).on("mouseup.drag-cleanup", null);
        };
        d3.select(window).on("mouseup.drag-cleanup", handleMouseUp);

        const links = linkForce.links().filter((l) => l !== linkData);
        linkForce.links(links);
        (d as any)._detachedLink = linkData;

        // We update link data, so D3's .data() will handle the visual
        simulation.force<d3.ForceLink<Node, Link>>("link")?.links(links);

        const lineElement = g!
          .selectAll<SVGLineElement, Link>("line.link")
          .filter((l: Link) => l === linkData)
          .node();

        if (lineElement) {
          detachedLineElementRef.current = lineElement;
          d3.select(lineElement).classed("link-detached", true);
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
          break;
        }
      }

      const nodeElement = g
        ?.selectAll<SVGGElement, Node>("g.node")
        .filter((n) => n.id === d.id)
        .node();
      if (nodeElement) {
        d3.select(nodeElement)
          .select<SVGCircleElement>(".node-circle")
          .classed("armed-for-drop", target !== null);
      }

      dropTargetNodeRef.current = target;
      if (target) {
        setDropTargetNode(target);
      } else {
        setDropTargetNode(null);
      }
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);

      (d as any)._isDragging = false;
      simulation.alpha(0.3).restart();

      if (dragTimer.current) {
        clearTimeout(dragTimer.current);
        dragTimer.current = null;
      }

      d.fx = null;
      d.fy = null;

      const targetUser = dropTargetNodeRef.current;
      const draggedDoc = d as Node;
      const linkForce = simulation.force<d3.ForceLink<Node, Link>>("link");
      const detachedLink = (d as any)._detachedLink;

      if (
        targetUser &&
        draggedDoc.type === "document" &&
        targetUser.email &&
        detachedLink
      ) {
        setTransferDetails({
          docNode: draggedDoc,
          userNode: targetUser,
          detachedLink: detachedLink,
        });
        setIsModalOpen(true);
        (d as any)._detachedLink = null;
      } else if (linkForce && detachedLink) {
        // Restore link
        const links = linkForce.links();
        links.push(detachedLink);
        linkForce.links(links); // Update simulation links
        (d as any)._detachedLink = null;
        if (detachedLineElementRef.current) {
          d3.select(detachedLineElementRef.current).classed(
            "link-detached",
            false
          );
          detachedLineElementRef.current = null;
        }
      }

      dropTargetNodeRef.current = null;
      setDropTargetNode(null);

      d3.selectAll(".node-circle.armed-for-drop").classed(
        "armed-for-drop",
        false
      );

      d3.select(window).on("mouseup.drag-cleanup", null);

      if (!isModalOpen && detachedLineElementRef.current) {
        d3.select(detachedLineElementRef.current).classed(
          "link-detached",
          false
        );
        detachedLineElementRef.current = null;
      }
    }
    // --- End Drag Handlers ---

    // Note: No cleanup function here, as we want the simulation to persist
  }, [
    graphData,
    currentView,
    selectedUserNode,
    currentUserData,
    expandedUserNodeId,
    handleNodeClick, // Add memoized handlers if this causes re-renders
  ]);

  // --- 3. Add separate unmount effect ---
  useEffect(() => {
    // Return a cleanup function to run on unmount
    return () => {
      simulationRef.current?.stop();
      simulationRef.current = null;
      gRef.current = null;
    };
  }, []); // Empty array means this runs only on mount/unmount

  // (Drop Target Effect - Unchanged)
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll(".node-circle.user")
      .classed("drop-target", (d: any) => d.id === dropTargetNode?.id);
  }, [dropTargetNode]);

  // --- MODIFIED: Updated Loading/Error States ---
  const isLoading =
    isLoadingCurrentUser ||
    allOrgsQuery.isLoading ||
    allUsersQuery.isLoading ||
    allDocsQuery.isLoading;
  const isError =
    allOrgsQuery.isError || allUsersQuery.isError || allDocsQuery.isError;
  const error = allOrgsQuery.error || allUsersQuery.error || allDocsQuery.error;
  // --------------------------------------------

  if (isLoading)
    return <div className="graph-status-message">Loading graph data...</div>;
  if (isError)
    return (
      <div className="graph-status-message error">Error: {error?.message}</div>
    );

  // (Render Component - Unchanged)
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

      <ConfirmModal
        show={isModalOpen}
        title="Confirm Ownership Transfer"
        onClose={handleCloseModal}
        onConfirm={handleConfirmTransfer}
        isConfirming={transferMutation.isPending}
      >
        {transferDetails ? (
          <div>
            <p>Are you sure you want to transfer ownership of this document?</p>

            {/* Structured details box */}
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                margin: "12px 0",
                border: "1px solid #dee2e6",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Document:</strong> {transferDetails.docNode.name}
              </p>
              <hr style={{ margin: "8px 0" }} />
              <p style={{ margin: 0 }}>
                <strong>Recipient:</strong> {transferDetails.userNode.name}
              </p>
              <p style={{ margin: 0, marginTop: "4px" }}>
                <strong>Organization:</strong>{" "}
                {allOrgsQuery.data?.find(
                  (o: { id: string | undefined }) =>
                    o.id === transferDetails.userNode.organizationId
                )?.name || "N/A"}
              </p>
            </div>

            <p className="text-muted small mb-0">
              This action cannot be undone.
            </p>
          </div>
        ) : (
          <p>Loading transfer details...</p>
        )}
      </ConfirmModal>
    </div>
  );
}
