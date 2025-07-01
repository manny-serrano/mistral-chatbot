"use client"

import ForceGraph2D from "react-force-graph-2d"
import { useEffect, useRef, useState } from "react"

export const NetworkGraph = () => {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sample network data
  const graphData = {
    nodes: [{ id: "node1" }, { id: "node2" }, { id: "node3" }, { id: "node4" }, { id: "node5" }],
    links: [
      { source: "node1", target: "node2" },
      { source: "node2", target: "node3" },
      { source: "node3", target: "node4" },
      { source: "node4", target: "node5" },
      { source: "node5", target: "node1" },
    ],
  }

  // Track container size
  const [dims, setDims] = useState({ width: 300, height: 300 })

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDims({ width, height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Handle scroll events to prevent propagation outside the graph
  const handleWheel = (e: React.WheelEvent) => {
    // Allow the graph to handle zoom/pan, but stop propagation to parent
    e.stopPropagation()
  }

  const handleMouseEnter = () => {
    // Disable page scroll when mouse enters graph
    document.body.style.overflow = 'hidden'
  }

  const handleMouseLeave = () => {
    // Re-enable page scroll when mouse leaves graph
    document.body.style.overflow = 'auto'
  }

  return (
    <div 
      ref={containerRef} 
      style={{ width: "100%", height: "500px" }}
      onWheel={handleWheel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="overflow-hidden relative border border-zinc-700 rounded-lg bg-zinc-900"
    >
      <ForceGraph2D
        ref={graphRef}
        width={dims.width}
        height={dims.height}
        graphData={graphData}
        nodeAutoColorBy="group"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        backgroundColor="transparent"
      />
    </div>
  )
}
