// apps/web/src/components/OwnershipGraph.tsx
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// Define node types, adding 'organization'
type NodeType = "user" | "organization" | "document";
// Add optional organizationId to User nodes for easier linking
type Node = {
  id: string;
  name: string;
  type: NodeType;
  organizationId?: string; // Add this
};
type Link = { source: string; target: string };
type GraphData = { nodes: Node[]; links: Link[] };

type AppUser = AppRouterOutputs["documents"]["getAppUsers"][0];
type OrgDocument = AppRouterOutputs["documents"]["getAll"][0];
type UserDocument = AppRouterOutputs["documents"]["getDocumentsByUserId"][0];

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<d3.ZoomTransform | null>(null);

  // State Management
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

  // --- Data Fetching ---
  const { data: currentUserData, isLoading: isLoadingCurrentUser } =
    trpc.user.getMe.useQuery();

  const {
    data: users,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = trpc.documents.getAppUsers.useQuery(undefined, {
    enabled: !!currentUserData?.organizationId,
  });

  const {
    data: allDocuments,
    isLoading: isLoadingAllDocs,
    isError: isAllDocsError,
    error: allDocsError,
  } = trpc.documents.getAll.useQuery(undefined, {
    enabled: !!currentUserData?.organizationId,
  });

  const { data: documentsData, isLoading: isLoadingDocsForPanel } =
    trpc.documents.getDocumentsByUserId.useQuery(selectedUserNode?.id || "", {
      enabled: !!selectedUserNode,
    });

  // --- Data Processing Effect ---
  useEffect(() => {
    // Org View: Show the organization node AND its users
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
        organizationId: user.organizationId ?? undefined, // Store orgId on node
      }));
      // Link users TO the organization node
      const userLinks: Link[] = userNodes.map((userNode) => ({
        source: userNode.id, // User is the source
        target: orgNode.id, // Org is the target
      }));

      setGraphData({
        nodes: [orgNode, ...userNodes],
        links: userLinks,
      });
      setSelectedOrg(null); // Clear selected org
    }
    // Detailed Org/Doc View: Show users and docs for the selected org
    else if (currentView === "doc" && selectedOrg && users && allDocuments) {
      const orgUsers = users.filter(
        (u: { organizationId: any }) => u.organizationId === selectedOrg.id
      );
      const orgDocs = allDocuments.filter(
        (d: { organizationId: any }) => d.organizationId === selectedOrg.id
      );

      const userNodes: Node[] = orgUsers.map((user: AppUser) => ({
        id: user.id,
        name: user.name || user.email || "User",
        type: "user",
        organizationId: user.organizationId ?? undefined,
      }));
      const docNodes: Node[] = orgDocs.map((doc: OrgDocument) => ({
        id: doc.id,
        name: doc.title,
        type: "document",
      }));
      const docLinks: Link[] = orgDocs.map((doc: OrgDocument) => ({
        source: doc.id,
        target: doc.uploadedById,
      }));

      setGraphData({
        nodes: [...userNodes, ...docNodes],
        links: [...docLinks],
      });
    } else {
      setGraphData({ nodes: [], links: [] });
    }
  }, [currentView, selectedOrg, currentUserData, users, allDocuments]);

  // Effect to update the documents in the side panel
  useEffect(() => {
    if (documentsData) {
      setUserDocuments(documentsData);
    } else {
      setUserDocuments([]);
    }
  }, [documentsData]);

  // --- UI Handlers ---
  const closeDetailsPanel = () => {
    setSelectedUserNode(null);
    d3.selectAll(".node-circle.selected").classed("selected", false);
  };

  const handleNodeClick = (event: MouseEvent, d: Node) => {
    event.stopPropagation();
    if (d.type === "organization") {
      const orgData = currentUserData?.organization;
      if (orgData && orgData.id === d.id) {
        setSelectedOrg(orgData);
        setCurrentView("doc");
        closeDetailsPanel();
      }
    } else if (d.type === "user" && currentView === "doc") {
      // Only allow user selection in doc view
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

  // --- D3 Rendering Effect ---
  // --- D3 Rendering Effect ---
  useEffect(() => {
    const svgElement = svgRef.current;
    if (graphData.nodes.length === 0 || !svgElement?.parentElement) {
      const svg = d3.select(svgElement);
      svg.selectAll("*").remove();
      return;
    }

    const { nodes, links } = graphData;
    const width = svgElement.parentElement.clientWidth;
    const height = svgElement.parentElement.clientHeight;
    const svg = d3
      .select(svgElement)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    // --- Add Back Button using D3 and CSS Classes ---
    if (currentView === "doc") {
      const backButton = svg
        .append("g")
        .attr("class", "back-button-group") // Apply main group class
        .style("cursor", "pointer")
        .on("click", handleBackClick);

      // Apply class to rect
      backButton
        .append("rect")
        .attr("x", 10)
        .attr("y", 10)
        .attr("width", 80)
        .attr("height", 30)
        .attr("rx", 5)
        .attr("class", "back-button-rect"); // Apply rect class

      // Apply class to text
      backButton
        .append("text")
        .attr("x", 20)
        .attr("y", 30) // Centering vertically: y = top_y + height / 2 + font_size / 3 (approx)
        .attr("class", "back-button-text") // Apply text class
        .text("⬅ Back");
    }

    const g = svg.append("g"); // Main group for zoom/pan

    // --- Zoom/Pan Behavior ---
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on("start", () => svg.classed("grabbing", true))
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        transformRef.current = event.transform;
      })
      .on("end", () => svg.classed("grabbing", false));

    svg.call(zoomBehavior).on("dblclick.zoom", null);

    // --- Simulation ---
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
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
        d3.forceManyBody().strength(currentView === "org" ? -600 : -200)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d) => {
            if ((d as Node).type === "organization") return 45;
            if ((d as Node).type === "user") return 35;
            return 25;
          })
          .strength(0.9)
      );

    // --- Drawing Links ---
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line");

    // --- Drawing Nodes ---
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes, (d: any) => d.id)
      .enter()
      .append("g")
      .style("cursor", (d) =>
        d.type === "organization" ||
        (d.type === "user" && currentView === "doc")
          ? "pointer"
          : "default"
      )
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d) => handleNodeClick(event, d as Node));

    node
      .append("circle")
      .attr("r", (d) => {
        if (d.type === "organization") return 35;
        if (d.type === "user") return 25;
        return 12;
      })
      .attr("class", (d) => `node-circle ${d.type}`)
      .classed("selected", (d) => d.id === selectedUserNode?.id);

    node
      .append("text")
      .text((d) => d.name)
      .attr("x", (d) => (d.type === "organization" ? 40 : 30))
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

    // --- Drag Functions ---
    function dragstarted(
      event: d3.D3DragEvent<SVGGElement, Node, any>,
      d: any
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event: d3.D3DragEvent<SVGGElement, Node, any>, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event: d3.D3DragEvent<SVGGElement, Node, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [graphData, currentView]); // Keep currentView dependency-run D3 effect also when currentView changes (for back button)

  // --- Loading/Error States ---
  const isLoading = isLoadingCurrentUser || isLoadingUsers || isLoadingAllDocs;
  const isError = isUsersError || isAllDocsError;
  const error = usersError || allDocsError;

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

  // --- Render Component ---
  return (
    <div className="graph-container">
      {/* Back button is now rendered inside SVG by D3 */}
      <div className="graph-canvas-wrapper">
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
                    {doc.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No documents uploaded by this user.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
