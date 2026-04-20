import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { motion } from "motion/react";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: "core" | "site";
  title?: string;
  status?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

interface NeuralTopologyMapProps {
  sites: any[];
  setSelectedSite: (site: any) => void;
  setActiveTab: (tab: string) => void;
}

export const NeuralTopologyMap = ({ sites, setSelectedSite, setActiveTab }: NeuralTopologyMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 1200;
    const height = 800;

    const nodes: Node[] = [
      { id: "core", type: "core", title: "Neural Core" },
      ...sites.map(s => ({ id: s.id, type: "site" as const, title: s.title, status: s.isDeployed ? "active" : "staging", data: s }))
    ];

    const links: Link[] = sites.map(s => ({
      source: "core",
      target: s.id
    }));

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(250))
      .force("charge", d3.forceManyBody().strength(-2000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(120));

    // Neural Grid Background
    const grid = svg.append("g").attr("class", "grid");
    const gridSize = 100;
    for (let i = 0; i <= width; i += gridSize) {
      grid.append("line").attr("x1", i).attr("y1", 0).attr("x2", i).attr("y2", height).attr("stroke", "#F1F1F1").attr("stroke-width", 0.5);
    }
    for (let i = 0; i <= height; i += gridSize) {
      grid.append("line").attr("x1", 0).attr("y1", i).attr("x2", width).attr("y2", i).attr("stroke", "#F1F1F1").attr("stroke-width", 0.5);
    }

    const container = svg.append("g");

    const link = container.append("g")
      .attr("stroke", "#E0E0E0")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", "4,4")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

    const node = container.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .selectAll<SVGGElement, Node>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
         if (d.type === 'site' && (d as any).data) {
            setSelectedSite((d as any).data);
            setActiveTab("sites");
         }
      })
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", d => d.type === "core" ? 40 : 35)
      .attr("fill", d => d.type === "core" ? "#111111" : "#FFFFFF")
      .attr("stroke", d => d.type === "core" ? "#111111" : d.status === "active" ? "#22C55E" : "#EEEEEE")
      .attr("class", d => d.type === "core" ? "shadow-2xl" : "shadow-md");

    node.append("text")
      .text(d => d.title || "")
      .attr("y", d => d.type === "core" ? 65 : 60)
      .attr("text-anchor", "middle")
      .attr("fill", "#111111")
      .attr("font-size", d => d.type === "core" ? "12px" : "10px")
      .attr("font-weight", "bold")
      .attr("text-transform", "uppercase")
      .attr("letter-spacing", "1px");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [sites, setSelectedSite, setActiveTab]);

  return (
    <div className="card-minimal h-[800px] bg-white relative overflow-hidden group">
      <div className="absolute top-8 left-8 z-10">
         <h3 className="text-lg font-bold text-text-main tracking-tight">Empire Topology Map</h3>
         <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Real-time Visualization of Neural Asset Nodes</p>
      </div>
      
      <div className="absolute bottom-8 right-8 z-10 flex gap-4">
         <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-border rounded-lg">
            <div className="w-2 h-2 rounded-full bg-black" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Neural Core</span>
         </div>
         <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-border rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Active Node</span>
         </div>
      </div>

      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
