// apps/web/src/components/OwnershipGraph.tsx
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { Link } from "react-router-dom";

// (Type definitions are unchanged)
type NodeType = "user" | "organization" | "document";
type Node = {
  id: string;
  name: string;
  type: NodeType;
  organizationId?: string;
};
type Link = { source: string; target: string };
type GraphData = { nodes: Node[]; links: Link[] };
type AppUser = AppRouterOutputs["documents"]["getAppUsers"][0];
type OrgDocument = AppRouterOutputs["documents"]["getAll"][0];
type UserDocument = AppRouterOutputs["documents"]["getDocumentsByUserId"][0];

// --- 1. THIS IS THE FIX ---
// I've changed the default maxLength from 15 to 10.
const truncateText = (name: string, type: NodeType, maxLength = 10) => {
  if (type !== "document" || name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + "...";
};
// ------------------------------

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  // (State Management is unchanged)
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

  // (Data Processing Effect is unchanged)
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
      }));
      const userLinks: Link[] = userNodes.map((userNode) => ({
        source: userNode.id,
        target: orgNode.id,
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

  // (UI Handlers are unchanged)
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

  // (D3 Rendering Effect is unchanged)
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
          .radius((d: any) => {
            if ((d as Node).type === "organization") return 45;
            if ((d as Node).type === "user") return 35;
            return 25;
          })
          .strength(0.9)
      );

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
      .style("cursor", (d: any) =>
        (d as Node).type === "organization" ||
        ((d as Node).type === "user" && currentView === "doc")
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
      .on("click", (event, d: any) => handleNodeClick(event, d as Node))
      .on("mouseover", function (_event, d: any) {
        d3.select(this).raise();
        d3.select(this).select("text").text((d as Node).name);
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

    function dragstarted(
      event: d3.D3DragEvent<SVGGElement, any, any>,
      d: any
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData, currentView, selectedUserNode]);

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

  // (Render Component is unchanged)
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
    </div>
  );
}