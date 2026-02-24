import { performance } from "perf_hooks";
import * as d3 from "d3";
import type { Node, LinkData } from "../../src/types/graph";

// Helper to create nodes/links
function createGraphData(numNodes: number) {
    const nodes: Node[] = [];
    const links: LinkData[] = [];

    // Center node
    nodes.push({ id: "root", name: "Root", type: "organization", x: 400, y: 300 });

    for (let i = 0; i < numNodes; i++) {
        nodes.push({
            id: `node-${i}`,
            name: `Node ${i}`,
            type: "user",
            x: Math.random() * 800,
            y: Math.random() * 600
        });
        links.push({ source: "root", target: `node-${i}` });
    }
    return { nodes, links };
}

const TICKS = 300;

function runBenchmark(numNodes: number, label: string) {
    console.log(`\n--- ${label} (${numNodes} nodes) ---`);
    const { nodes, links } = createGraphData(numNodes);

    const simulation = d3.forceSimulation<Node, LinkData>(nodes)
        .force("link", d3.forceLink<Node, LinkData>(links).id((d: Node) => d.id))
        .force("charge", d3.forceManyBody().theta(1.2)) // Optimized
        .force("collide", d3.forceCollide().radius(30))
        .force("center", d3.forceCenter(400, 300))
        .stop();

    const start = performance.now();
    for (let i = 0; i < TICKS; i++) {
        simulation.tick();
    }
    const end = performance.now();
    
    console.log(`Total Time: ${(end - start).toFixed(2)}ms`);
    console.log(`Avg Time per Tick: ${((end - start) / TICKS).toFixed(4)}ms`);
    console.log(`Est. FPS: ${(1000 / ((end - start) / TICKS)).toFixed(2)}`);
}

runBenchmark(500, "Medium Org");
runBenchmark(2000, "Large Org / Drilling Up");
runBenchmark(5000, "Stress Test");
