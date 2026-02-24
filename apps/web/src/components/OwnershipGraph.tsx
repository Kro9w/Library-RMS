// apps/web/src/components/OwnershipGraph.tsx
import { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import { SendDocumentModal } from "./SendDocumentModal";
import { SendMultipleDocumentsModal } from "./SendMultipleDocumentsModal";
import { LoadingAnimation } from "./ui/LoadingAnimation";
import { FileIcon } from "./FileIcon";
import type { Node, LinkData, NodeType, WorkerResponse } from "../types/graph";

const truncateText = (name: string, type: NodeType, maxLength = 15) => {
  if (type !== "document" && name.length > maxLength) {
    return name.substring(0, maxLength) + "...";
  }
  return name;
};

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  const dropTargetNodeRef = useRef<Node | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // --- State ---
  const [graphData, setGraphData] = useState<{
    nodes: Node[];
    links: LinkData[];
  }>({ nodes: [], links: [] });
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

  // Refs for faster access during TICK
  const nodeMapRef = useRef<Map<string, Node>>(new Map());

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

  // O(1) Lookup Maps
  const { userMap } = useMemo(() => {
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
  }, [orgHierarchy]);

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

          // Find User's Department
          if (currentUserData.departmentId) {
            initialExpanded.add(currentUserData.departmentId);

            const dept = campus.departments.find(
              (d: any) => d.id === currentUserData.departmentId,
            );

            if (dept) {
              const deptNode: Node = {
                id: dept.id,
                name: dept.name,
                type: "department",
                parentId: campus.id,
                color: "var(--primary)",
              };
              initialStack.push(deptNode);

              // Find User Node
              const user = dept.users.find(
                (u: any) => u.id === currentUserData.id,
              );

              if (user) {
                const name = !user.firstName
                  ? user.email || "User"
                  : `${user.firstName}, ${user.lastName ? user.lastName.charAt(0) : ""}.`;

                const userNode: Node = {
                  id: user.id,
                  name: name,
                  type: "user",
                  parentId: dept.id,
                  email: user.email,
                };
                initialStack.push(userNode);
                setSelectedUserNode(userNode);
                setActiveTab("details");
                setIsBinderOpen(true);
              }
            }
          }
        }
      }

      setViewStack(initialStack);
      setExpandedIds(initialExpanded);
    }
  }, [orgHierarchy, currentUserData]);

  // --- Reset Temp Nodes on View Change ---
  useEffect(() => {
    setTempNodes([]);
  }, [viewStack]);

  // --- Worker Setup ---
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/graph.worker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type, payload } = e.data;
      if (type === "GRAPH_DATA") {
        setGraphData(payload);
        // Build map for fast lookup during TICK
        const map = new Map<string, Node>();
        payload.nodes.forEach((n) => map.set(n.id, n));
        nodeMapRef.current = map;
      } else if (type === "TICK") {
        // Optimized TICK Handling with Float32Array
        const { nodes: positions, links: _tickLinks } = payload;
        const g = gRef.current;
        if (!g) return;

        // Update Nodes
        g.selectAll<SVGGElement, Node>(".node").each(function (d, i) {
          const x = positions[i * 2];
          const y = positions[i * 2 + 1];

          if (!isNaN(x) && !isNaN(y)) {
            d.x = x;
            d.y = y;
            d3.select(this).attr("transform", `translate(${x},${y})`);
          }
        });

        // Update Links
        const currentNodes = g.selectAll<SVGGElement, Node>(".node").data();
        const posMap = new Map<string, { x: number; y: number }>();

        for (let i = 0; i < currentNodes.length; i++) {
          const d = currentNodes[i];
          const x = positions[i * 2];
          const y = positions[i * 2 + 1];
          d.x = x;
          d.y = y;
          posMap.set(d.id, { x, y });
        }

        g.selectAll<SVGGElement, Node>(".node").attr(
          "transform",
          (d) => `translate(${d.x},${d.y})`,
        );

        // Links
        g.selectAll<SVGLineElement, LinkData>(".link").each(function (d) {
          const srcId = d.source as unknown as string;
          const tgtId = d.target as unknown as string;

          const srcPos = posMap.get(srcId);
          const tgtPos = posMap.get(tgtId);

          if (srcPos && tgtPos) {
            d3.select(this)
              .attr("x1", srcPos.x)
              .attr("y1", srcPos.y)
              .attr("x2", tgtPos.x)
              .attr("y2", tgtPos.y);
          }
        });

        // Tether
        const tether = g.select(".tether");
        if (!tether.empty()) {
          const sourceId = tether.attr("data-source-id");
          const targetId = tether.attr("data-target-id");
          const src = posMap.get(sourceId);
          const tgt = posMap.get(targetId);
          if (src && tgt) {
            tether
              .attr("x1", src.x)
              .attr("y1", src.y)
              .attr("x2", tgt.x)
              .attr("y2", tgt.y);
          }
        }
      } else if (type === "ERROR") {
        console.error("Worker Error:", payload);
      }
    };

    // Initialize Dimensions
    const svgElement = svgRef.current;
    if (svgElement?.parentElement) {
      workerRef.current.postMessage({
        type: "UPDATE_DIMENSIONS",
        payload: {
          width: svgElement.parentElement.clientWidth,
          height: svgElement.parentElement.clientHeight,
        },
      });
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Sync Hierarchy to Worker
  useEffect(() => {
    if (orgHierarchy && workerRef.current) {
      workerRef.current.postMessage({
        type: "INIT_DATA",
        payload: orgHierarchy,
      });
    }
  }, [orgHierarchy]);

  // Request Graph Calculation from Worker
  useEffect(() => {
    if (orgHierarchy && viewStack.length > 0 && workerRef.current) {
      workerRef.current.postMessage({
        type: "CALCULATE_GRAPH",
        payload: {
          viewStack,
          tempNodes,
          bubbleNode,
          bubbleDocuments,
        },
      });
    } else {
      setGraphData({ nodes: [], links: [] });
    }
  }, [orgHierarchy, viewStack, tempNodes, bubbleNode, bubbleDocuments]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const svgElement = svgRef.current;
      if (svgElement?.parentElement && workerRef.current) {
        workerRef.current.postMessage({
          type: "UPDATE_DIMENSIONS",
          payload: {
            width: svgElement.parentElement.clientWidth,
            height: svgElement.parentElement.clientHeight,
          },
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Event Handlers ---
  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return;
    event.stopPropagation();

    const isRootUser = viewStack[viewStack.length - 1]?.type === "user";
    if (
      isRootUser &&
      d.type === "user" &&
      viewStack[viewStack.length - 1].id !== d.id
    ) {
      return;
    }

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
        setActiveTab("details");
        setIsBinderOpen(true);
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
    if (bubbleNode) return;
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const width = svgElement.parentElement?.clientWidth || 500;
    const height = svgElement.parentElement?.clientHeight || 500;

    const newBubble: Node = {
      id: "bubble-tool",
      name: "",
      type: "bubble",
      x: width / 2,
      y: height / 2,
    };
    setBubbleNode(newBubble);
  };

  // --- Document Details Panel Data ---
  useEffect(() => {
    if (selectedUserNode && userMap.size > 0) {
      const u = userMap.get(selectedUserNode.id);
      setUserDocuments(u ? u.documents : []);
    } else {
      setUserDocuments([]);
    }
  }, [selectedUserNode, userMap]);

  // --- D3 Render Logic ---
  useEffect(() => {
    const svgElement = svgRef.current;
    if (graphData.nodes.length === 0 || !svgElement?.parentElement) {
      const svg = d3.select(svgElement);
      svg.selectAll("*").remove();
      workerRef.current?.postMessage({ type: "STOP_SIMULATION" });
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

    // Render Links
    const link = gRef
      .current!.select(".links")
      .selectAll<SVGLineElement, LinkData>("line.link")
      .data(links, (d: any) => `${d.source}-${d.target}`);
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

    nodeEnter.filter((d) => d.type !== "bubble").append("circle");

    nodeEnter
      .filter((d) => d.type === "bubble")
      .append("path")
      .attr("class", "node-circle bubble-blob");

    nodeEnter
      .filter((d) => d.type === "bubble")
      .append("text")
      .attr("class", "close-btn")
      .text("✕")
      .attr("text-anchor", "middle")
      .attr("dx", 0)
      .attr("dy", 0)
      .on("click", (e, _d) => {
        e.stopPropagation();
        handlePopBubble();
      });

    nodeEnter
      .filter((d) => d.type !== "bubble")
      .append("text")
      .attr("class", "node-label")
      .attr("dy", 5)
      .attr("dx", 35);

    nodeEnter
      .on("mouseover", function (_e, d) {
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
        return 12;
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

    nodeMerge
      .select("path.bubble-blob")
      .style("fill", "var(--primary)")
      .attr("opacity", 0.3);

    nodeMerge.select(".node-label").text((d) => truncateText(d.name, d.type));

    // Start Simulation via Worker
    workerRef.current?.postMessage({ type: "START_SIMULATION" });

    // --- Bubble Animation Loop (Visual Only) ---
    const timer = d3.timer((elapsed) => {
      const bubble = nodes.find((n) => n.type === "bubble");
      if (bubble) {
        const radius = 40 + bubbleDocuments.length * 5;
        const points: [number, number][] = [];
        const numPoints = 12;

        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const offset =
            Math.sin(angle * 3 + elapsed * 0.002) * 4 +
            Math.cos(angle * 5 - elapsed * 0.003) * 3;
          const r = radius + offset;
          points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
        }

        const pathData = d3.line().curve(d3.curveBasisClosed)(points);
        const bubbleNode = gRef.current?.select(".node.bubble path");
        if (bubbleNode && pathData) {
          bubbleNode.attr("d", pathData);
        }

        const angle = -Math.PI / 4;
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
      if (event.sourceEvent) event.sourceEvent.stopPropagation();
      workerRef.current?.postMessage({
        type: "DRAG_START",
        payload: { id: d.id, x: event.x, y: event.y, active: !!event.active },
      });
      d.fx = d.x;
      d.fy = d.y;
      (d as any)._isDragging = true;

      if (d.type === "bubble") return;

      if (d.isContainedInBubble) {
        // logic handled in dragged
      } else if (
        d.type === "document" &&
        currentUserData &&
        d.uploadedById === currentUserData.id &&
        !bubbleDocuments.some((bd) => bd.id === d.id)
      ) {
        const l = links.find(
          (lnk) =>
            (typeof lnk.source === "object"
              ? (lnk.source as any).id
              : lnk.source) === d.id ||
            (typeof lnk.target === "object"
              ? (lnk.target as any).id
              : lnk.target) === d.id,
        );
        if (l) {
          l.isDetached = true;
          (d as any)._activeLink = l;

          const sourceId =
            typeof l.source === "object" ? (l.source as any).id : l.source;
          const targetId =
            typeof l.target === "object" ? (l.target as any).id : l.target;

          d3.select(svgRef.current!)
            .selectAll("line.link")
            .filter(
              (ld: any) =>
                (typeof ld.source === "object" ? ld.source.id : ld.source) ===
                  sourceId &&
                (typeof ld.target === "object" ? ld.target.id : ld.target) ===
                  targetId,
            )
            .classed("link-detached", true);
        }
      }
    }

    function dragged(this: any, event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
      workerRef.current?.postMessage({
        type: "DRAG",
        payload: { id: d.id, x: event.x, y: event.y },
      });

      const g = gRef.current;
      if (!g) return;

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

      if (
        d.type === "document" &&
        bubbleNode &&
        !bubbleDocuments.some((bd) => bd.id === d.id)
      ) {
        const threshold = (40 + bubbleDocuments.length * 5) * 1.5;
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

      const activeLink = (d as any)._activeLink;
      if (activeLink) {
        let target: Node | null = null;
        const threshold = 80;
        const originalOwnerId =
          (typeof activeLink.target === "object"
            ? (activeLink.target as any).id
            : activeLink.target) === d.id
            ? typeof activeLink.source === "object"
              ? (activeLink.source as any).id
              : activeLink.source
            : typeof activeLink.target === "object"
              ? (activeLink.target as any).id
              : activeLink.target;

        if (bubbleNode) {
          const dx = (bubbleNode.x || 0) - d.fx!;
          const dy = (bubbleNode.y || 0) - d.fy!;
          const r = 40 + bubbleDocuments.length * 5;
          if (Math.sqrt(dx * dx + dy * dy) < r + 20) {
            target = bubbleNode;
          }
        }

        if (!target) {
          for (const u of nodes) {
            if (u.type !== "user" || u.id === originalOwnerId) continue;
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

    function handleGooeyEffect(source: any, target: Node | null) {
      const g = gRef.current;
      if (!g) return;

      workerRef.current?.postMessage({
        type: "SET_MAGNET",
        payload: {
          sourceId: source.id,
          targetId: target ? target.id : null,
        },
      });

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

        if (g.select(".tether").empty()) {
          gooeyContainer.append(() => sourceElement.node()!);
          gooeyContainer.append(() => targetElement.node()!);

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
          g.select(".tether")
            .attr("x1", source.fx!)
            .attr("y1", source.fy!)
            .attr("x2", target!.x!)
            .attr("y2", target!.y!);
        }

        sourceElement
          .select(".node-circle")
          .classed("armed-for-drop", true)
          .classed("drop-magnet", true);
        targetElement.select(".node-circle").classed("drop-magnet", true);
      } else {
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
      }
    }

    function dragended(_event: any, d: any) {
      workerRef.current?.postMessage({
        type: "DRAG_END",
        payload: { id: d.id },
      });
      d.fx = null;
      d.fy = null;
      (d as any)._isDragging = false;

      const target = dropTargetNodeRef.current;
      const g = gRef.current;

      if (d.isContainedInBubble && !target) {
        if (bubbleNode) {
          const dx = (bubbleNode.x || 0) - d.x!;
          const dy = (bubbleNode.y || 0) - d.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const bubbleRadius = 40 + bubbleDocuments.length * 5;

          if (dist > bubbleRadius + 50) {
            setBubbleDocuments((prev) => prev.filter((doc) => doc.id !== d.id));
            d.isContainedInBubble = false;
            d.fx = null;
            d.fy = null;
          } else {
            d.fx = null;
            d.fy = null;
          }
        }
        g?.select(".node.bubble path").classed("bubble-hover", false);
        return;
      }

      if (d.type === "bubble" && target && target.type === "user") {
        setMultiSendTargetId(target.id);
        setIsMultiSendModalOpen(true);
      } else if (
        d.type === "document" &&
        target &&
        target.type === "bubble" &&
        (d as any)._activeLink
      ) {
        d.fx = null;
        d.fy = null;
        d.isContainedInBubble = true;
        const nodeClone = { ...d, x: d.x, y: d.y, vx: 0, vy: 0 };
        setBubbleDocuments((prev) => [...prev, nodeClone]);
      } else if (
        target &&
        target.type === "user" &&
        d.type === "document" &&
        (d as any)._activeLink
      ) {
        setSelectedDocId(d.id);
        setTargetUserId(target.id);
        setIsSendModalOpen(true);
      } else if ((d as any)._activeLink) {
        (d as any)._activeLink.isDetached = false;
        const sourceId =
          typeof (d as any)._activeLink.source === "object"
            ? (d as any)._activeLink.source.id
            : (d as any)._activeLink.source;
        const targetId =
          typeof (d as any)._activeLink.target === "object"
            ? (d as any)._activeLink.target.id
            : (d as any)._activeLink.target;

        d3.select(svgRef.current!)
          .selectAll("line.link")
          .filter(
            (ld: any) =>
              (typeof ld.source === "object" ? ld.source.id : ld.source) ===
                sourceId &&
              (typeof ld.target === "object" ? ld.target.id : ld.target) ===
                targetId,
          )
          .classed("link-detached", false);
      }

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

      workerRef.current?.postMessage({
        type: "SET_MAGNET",
        payload: { sourceId: null, targetId: null },
      });

      (d as any)._activeLink = null;
      dropTargetNodeRef.current = null;
      setDropTargetNode(null);
    }
  }, [graphData]);

  // Bubble Pop Handler
  const handlePopBubble = () => {
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

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const zoomTransform = d3.zoomTransform(svg);

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

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
      {/* Binder Panel */}
      {isDocumentView && (
        <div className={`binder-wrapper ${!isBinderOpen ? "collapsed" : ""}`}>
          <div className="binder-body">
            <div className="binder-content">
              {activeTab === "directory" && orgHierarchy && (
                <div className="directory-tree">
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
                        <div className="document-list">
                          {userDocuments.map((doc: any) => (
                            <div key={doc.id} className="document-list-item">
                              <div className="doc-icon-wrapper">
                                <FileIcon
                                  fileType={doc.documentType?.name}
                                  fileName={doc.title}
                                />
                              </div>
                              <div className="doc-info">
                                <span className="doc-title">{doc.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
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
                (typeof lnk.source === "object"
                  ? (lnk.source as any).id
                  : lnk.source) === selectedDocId ||
                (typeof lnk.target === "object"
                  ? (lnk.target as any).id
                  : lnk.target) === selectedDocId,
            );
            if (l) {
              l.isDetached = false;
              // Restore Visuals
              const sourceId =
                typeof (l.source as any) === "object"
                  ? (l.source as any).id
                  : l.source;
              const targetId =
                typeof (l.target as any) === "object"
                  ? (l.target as any).id
                  : l.target;

              d3.select(svgRef.current!)
                .selectAll("line.link")
                .filter(
                  (ld: any) =>
                    (typeof ld.source === "object"
                      ? ld.source.id
                      : ld.source) === sourceId &&
                    (typeof ld.target === "object"
                      ? ld.target.id
                      : ld.target) === targetId,
                )
                .classed("link-detached", false);

              workerRef.current?.postMessage({ type: "START_SIMULATION" });
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
            setBubbleDocuments([]);
            setBubbleNode(null);
          }}
        />
      )}
    </div>
  );
}
