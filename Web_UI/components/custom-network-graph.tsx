"use client"

import React, { useEffect, useRef, forwardRef, useCallback, useState, useImperativeHandle } from "react"
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  select,
  drag,
  zoom,
  zoomIdentity,
  Simulation,
} from "d3"

interface NetworkNode {
  id: string
  type: string
  label: string
  group: string
  ip?: string
  port?: number
  protocol?: string
  service?: string
  malicious?: boolean
  metadata?: any
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
  type: string
  weight?: number
  metadata?: any
}

export interface NetworkGraphData {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

interface CustomNetworkGraphProps {
  graphData: NetworkGraphData
  searchIp: string
  loading: boolean
  info: string | null
  error: string | null
  onClearSearch: () => void
}

const safeId = (id: string) => `label-${id.replace(/[^a-zA-Z0-9-_]/g, '_')}`

export const CustomNetworkGraph = forwardRef<any, CustomNetworkGraphProps>(({
  graphData,
  searchIp,
  loading,
  info,
  error,
  onClearSearch
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const zoomRef = useRef<any>(null)
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [copiedIp, setCopiedIp] = useState<string | null>(null)

  const getNodeColor = (node: NetworkNode): string => {
    if (searchIp && (node.id === searchIp || node.ip === searchIp)) return '#facc15' // Yellow for searched
    if (node.malicious) return '#f472b6' // Hot pink for malicious
    if (node.group === 'source_host') return '#2dd4bf' // Teal for source
    if (node.group === 'dest_host') return '#fb923c' // Orange for destination
    return '#6b7280'
  }

  const getNodeSize = (node: NetworkNode): number => {
    if (node.malicious) return 12
    if (node.group === 'source_host') return 10
    return 8
  }

  const getNodeEmoji = (node: NetworkNode): string => {
    if (node.malicious) return '💀'
    if (node.group === 'source_host') return '🖥️'
    if (node.group === 'dest_host') return '🌐'
    return ''
  }

  // Primary D3 rendering logic
  useEffect(() => {
    if (!svgRef.current) return

    // Clone data to avoid mutating original state during D3 simulation
    const nodesData = graphData.nodes.map(node => ({ ...node }))
    const linksData = graphData.links.map(link => ({ ...link }))

    // If dimensions are not set yet, try to get them from the container
    let width = dimensions.width
    let height = dimensions.height
    
    if (width === 0 || height === 0) {
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        width = rect.width || 800 // fallback width
        height = rect.height || 600 // fallback height
        
        // Update dimensions state for next render if they were 0
        if (dimensions.width === 0 && width > 0) {
          setDimensions({ width, height })
        }
      } else {
        // Final fallback if no container
        width = 800
        height = 600
      }
    }
    
    // Still don't render if we don't have valid dimensions
    if (width === 0 || height === 0) return

    const svg = select(svgRef.current)
    
    // Clear everything from the SVG first
    svg.selectAll('*').remove()

    // If we have no data and we're searching, show empty state
    if (searchIp && (!nodesData.length || !linksData.length)) {
      return
    }

    // Only proceed with graph rendering if we have data
    if (nodesData.length > 0) {
      // Use the local width and height variables we calculated above

      // Create container groups
      const linkGroup = svg.append("g").attr("class", "links")
      const nodeGroup = svg.append("g").attr("class", "nodes")
      
      const simulation = forceSimulation(nodesData)
        .force("link", forceLink(linksData).id((d: any) => d.id).distance(90))
        .force("charge", forceManyBody().strength(-200))
        .force("center", forceCenter(width / 2, height / 2))
        .force("collision", forceCollide().radius(d => getNodeSize(d as NetworkNode) + 8))

      const link = linkGroup
        .selectAll("line")
        .data(linksData)
        .join("line")
          .attr("stroke-width", 1.5)
          .style('pointer-events', 'none')
          .attr("stroke", "#ffffff")
          .attr("stroke-opacity", 0.6);

      const node = nodeGroup.selectAll('g.node')
        .data(nodesData)
        .join('g')
        .attr('class', 'node')
        .style('pointer-events', 'all')
        .call(d3drag(simulation) as any)
        .on('mouseover', function(event: any, d: NetworkNode) {
          select(this).raise()
          if (!tooltipRef.current) return
          const ipStr = d.ip || d.id || ''
          const labelStr = d.label && d.label !== ipStr ? d.label : ''
          tooltipRef.current.innerHTML = `${ipStr}${labelStr ? `<br/><span style='font-size:10px;color:#94a3b8'>${labelStr}</span>` : ''}${d.malicious ? '<br/><span style="font-size:10px;color:#f87171">⚠ malicious</span>' : ''}`
          tooltipRef.current.style.opacity = '1'
          select(this).select('text.label').style('display', 'block')
        })
        .on('click', function(event: any, d: NetworkNode) {
          const ipStr = d.ip || d.id || ''
          navigator.clipboard.writeText(ipStr).then(() => {
            setCopiedIp(ipStr)
            // auto-hide after 2 seconds
            setTimeout(() => setCopiedIp(null), 2000)
            if (tooltipRef.current) {
              tooltipRef.current.innerHTML = `<span style='color:#4ade80'>✔ Copied ${ipStr}</span>`
              tooltipRef.current.style.opacity = '1'
            }
          })
        })
        .on('mousemove', (event:any) => {
          if (!tooltipRef.current) return
          const { pageX, pageY } = event
          tooltipRef.current.style.left = pageX + 12 + 'px'
          tooltipRef.current.style.top = pageY + 12 + 'px'
        })
        .on('mouseout', function() {
          if (tooltipRef.current) tooltipRef.current.style.opacity = '0'
          select(this).select('text.label').style('display', 'none')
        });
        
      node.append('circle')
        .attr("r", getNodeSize)
        .attr("fill", getNodeColor);

      node.append("text")
        .attr("class", "label")
        .text(d => d.ip || d.id)
        .attr("x", 15)
        .attr("y", "0.31em")
        .style("font-size", "10px")
        .style("fill", "#e2e8f0")
        .style("display", "none")
        .style("pointer-events", "none");

      node.append("text")
        .attr("class", "emoji")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .style("font-size", d => `${getNodeSize(d)}px`)
        .style("pointer-events", "none")
        .text(getNodeEmoji)

      function d3drag(simulation: Simulation<NetworkNode, any>) {
        function dragstarted(this: SVGGElement, event: any, d: NetworkNode) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          select(this).raise();
          d.fx = d.x;
          d.fy = d.y;
        }
        function dragged(event: any, d: NetworkNode) {
          d.fx = event.x;
          d.fy = event.y;
        }
        function dragended(event: any, d: NetworkNode) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }
        return drag<SVGGElement, NetworkNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
      }

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => (d.source as any).x)
          .attr("y1", (d: any) => (d.source as any).y)
          .attr("x2", (d: any) => (d.target as any).x)
          .attr("y2", (d: any) => (d.target as any).y);
        
        node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
      });

      const zoomBehavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
          const { transform } = event
          nodeGroup.attr("transform", transform)
          linkGroup.attr("transform", transform)
        })

      zoomRef.current = zoomBehavior
      svg.call(zoomRef.current as any)
      
      return () => {
        simulation.stop()
      }
    }
  }, [graphData, dimensions, searchIp])

  const centerGraph = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = select(svgRef.current)
    zoomRef.current.transform(svg.transition().duration(750), zoomIdentity)
  }, [])

  // Handle container resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Set initial dimensions immediately
    const rect = el.getBoundingClientRect()
    setDimensions({ width: rect.width, height: rect.height })

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })

    resizeObserver.observe(el)
    return () => resizeObserver.disconnect()
  }, [])

  // Initial data fetch and tooltip management are now handled by the parent
  // Expose centerGraph function
  useImperativeHandle(ref, () => ({
    centerGraph
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
          <p className="text-zinc-400">Loading network graph...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-lg">
        <div className="text-center">
          <p className="text-red-400 mb-2">⚠️ {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }} className="bg-zinc-900 rounded-lg">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ background: "#18181b", borderRadius: "0.5rem" }} />
      
      {/* Show info messages (includes invalid IP messages from backend) */}
      {info && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 text-yellow-400 text-sm px-4 py-3 rounded-lg backdrop-blur-md border border-gray-600 text-center max-w-md">
            <div className='mb-2'>
              <span className="mr-2">⚠️</span>
              {info}
            </div>
            <button
              onClick={onClearSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded border border-blue-500 text-xs"
            >
              Go Back to Full Graph
            </button>
          </div>
        </div>
      )}
      
      {/* Show no results message only when searching and no info message */}
      {searchIp && !info && (!graphData.nodes.length || !graphData.links.length) && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 text-yellow-400 text-sm px-4 py-3 rounded-lg backdrop-blur-md border border-gray-600 text-center">
            <div className='mb-2'>
              <span className="mr-2">⚠️</span>
              No network connections found for IP: {searchIp}
            </div>
            <button
              onClick={onClearSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded border border-blue-500 text-xs"
            >
              Go Back to Full Graph
            </button>
          </div>
        </div>
      )}
      
      {graphData.nodes.length > 0 && (
        <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-md border border-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">●</span>
            <span className="font-medium">Nodes: {graphData.nodes.length}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-200">●</span>
            <span className="font-medium">Links: {graphData.links.length}</span>
          </div>
          <div className="text-xs text-gray-400">Click a node to copy its IP</div>
        </div>
      )}
      
      {/* Copy confirmation toast */}
      {copiedIp && (
        <div className="absolute bottom-3 right-3 bg-black/80 text-green-400 text-sm px-3 py-2 rounded-lg border border-green-600 backdrop-blur-md">
          ✔ Copied {copiedIp}
        </div>
      )}
      
      {/* Create tooltip element */}
      <div
        ref={(el) => { tooltipRef.current = el }}
        className="absolute pointer-events-none bg-black/90 text-white text-xs px-2 py-1 rounded border border-gray-600 opacity-0 transition-opacity z-50"
        style={{ zIndex: 1000 }}
      />
    </div>
  )
})

CustomNetworkGraph.displayName = 'CustomNetworkGraph' 