"use client"

import ForceGraph2D from "react-force-graph-2d"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"

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
}

interface NetworkLink {
  source: string
  target: string
  type: string
  weight?: number
  metadata?: any
}

interface NetworkGraphData {
  nodes: NetworkNode[]
  links: NetworkLink[]
  statistics: any
}

export interface NetworkGraphRef {
  handleLimitChange: (limit: number) => void
  centerGraph: () => void
  refreshGraph: () => void
  nodeLimit: number
  loading: boolean
}

export const NetworkGraph = forwardRef<NetworkGraphRef>((props, ref) => {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData] = useState<NetworkGraphData>({ nodes: [], links: [], statistics: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodeLimit, setNodeLimit] = useState(200)

  // Track container size
  const [dims, setDims] = useState({ width: 800, height: 500 })

  useEffect(() => {
    if (!containerRef.current) return
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const width = Math.max(rect.width || 800, 400)
        const height = Math.max(rect.height || 500, 300)
        console.log('Container dimensions:', { width, height, rect })
        setDims({ width, height })
        
        // Force graph to use full space and reconfigure forces
        setTimeout(() => {
          if (graphRef.current) {
            // Update graph dimensions
            graphRef.current.width(width)
            graphRef.current.height(height)
            
            // Restart simulation to adapt to new dimensions
            if (graphRef.current.d3ReheatSimulation) {
              graphRef.current.d3ReheatSimulation()
            }
          }
        }, 100)
      }
    }
    
    // Initial measurement with a slight delay to ensure CSS is applied
    setTimeout(updateDimensions, 100)
    
    const observer = new ResizeObserver((entries) => {
      updateDimensions()
    })
    
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Fetch network graph data from API
  const fetchGraphData = async (limit: number = nodeLimit) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/network/graph?limit=${limit}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success && data.error) {
        throw new Error(data.error)
      }
      
      setGraphData({
        nodes: data.nodes || [],
        links: data.links || [],
        statistics: data.statistics || {}
      })
      
      // Configure forces for better space utilization
      setTimeout(() => {
        if (graphRef.current) {
          // Restart simulation to spread nodes across the space
          if (graphRef.current.d3ReheatSimulation) {
            graphRef.current.d3ReheatSimulation()
          }
          
          // Set initial zoom without centering
          graphRef.current.zoom(1, 0)
        }
      }, 500)
      
    } catch (err) {
      console.error('Error fetching network graph data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load network data')
      
      // Fallback to mock data if API fails
      setGraphData({
        nodes: [
          { id: "192.168.1.1", type: "host", label: "192.168.1.1", group: "source_host" },
          { id: "10.0.0.1", type: "host", label: "10.0.0.1", group: "dest_host" },
          { id: "172.16.0.1", type: "host", label: "172.16.0.1", group: "dest_host" },
        ],
        links: [
          { source: "192.168.1.1", target: "10.0.0.1", type: "FLOW" },
          { source: "192.168.1.1", target: "172.16.0.1", type: "FLOW" },
        ],
        statistics: { total_nodes: 3, total_links: 2 }
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGraphData()
  }, [])

  const handleLimitChange = (newLimit: number) => {
    setNodeLimit(newLimit)
    fetchGraphData(newLimit)
  }

  const centerGraph = () => {
    if (graphRef.current) {
      // Restart simulation to spread nodes across full space
      if (graphRef.current.d3ReheatSimulation) {
        graphRef.current.d3ReheatSimulation()
      }
      
      // Try to fit the graph to show all nodes
      try {
        // Use zoomToFit to show all nodes in the available space
        graphRef.current.zoomToFit(400, 50)
      } catch {
        // Fallback: center at container center with reasonable zoom
        graphRef.current.centerAt(dims.width / 2, dims.height / 2, 1000)
        graphRef.current.zoom(0.8, 1000)
      }
    }
  }

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    handleLimitChange,
    centerGraph,
    refreshGraph: () => fetchGraphData(nodeLimit),
    nodeLimit,
    loading
  }))

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

  // Node styling based on type and properties
  const getNodeColor = (node: NetworkNode) => {
    if (node.malicious) return '#ef4444' // Red for malicious
    if (node.group === 'source_host') return '#3b82f6' // Blue for source hosts
    if (node.group === 'dest_host') return '#10b981' // Green for destination hosts
    return '#6b7280' // Gray default
  }

  const getNodeSize = (node: NetworkNode) => {
    return node.malicious ? 8 : 6
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-lg border border-zinc-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
          <p className="text-zinc-400">Loading network graph...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-lg border border-zinc-700">
        <div className="text-center">
          <p className="text-red-400 mb-2">⚠️ {error}</p>
          <p className="text-zinc-500 text-sm">Showing fallback data</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      style={{ width: "100%", height: "100%" }}
      onWheel={handleWheel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative bg-zinc-900"
    >
      <ForceGraph2D
        ref={graphRef}
        width={dims.width || 800}
        height={dims.height || 500}
        graphData={graphData}
        nodeLabel={(node) => {
          const n = node as NetworkNode
          return `🖥️ ${n.label}\nType: ${n.type}\n${n.malicious ? '⚠️ MALICIOUS' : '✅ Clean'}\nGroup: ${n.group}`
        }}
        nodeColor={getNodeColor}
        nodeVal={(node) => {
          const n = node as NetworkNode
          // Larger nodes for malicious, medium for sources, small for destinations
          if (n.malicious) return 12
          if (n.group === 'source_host') return 8
          return 6
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as NetworkNode
          const size = n.malicious ? 12 : (n.group === 'source_host' ? 8 : 6)
          const x = node.x || 0
          const y = node.y || 0
          
          // Draw the main node circle
          ctx.beginPath()
          ctx.arc(x, y, size, 0, 2 * Math.PI, false)
          ctx.fillStyle = getNodeColor(n)
          ctx.fill()
          
          // Add a border for malicious nodes
          if (n.malicious) {
            ctx.strokeStyle = '#dc2626'
            ctx.lineWidth = 2
            ctx.stroke()
          }
          
          // Add an icon indicator
          ctx.fillStyle = '#ffffff'
          ctx.font = `${size * 0.8}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          
          // Choose icon based on node type and status
          let icon = '💻'
          if (n.malicious) icon = '⚠️'
          else if (n.group === 'source_host') icon = '📤'
          else if (n.group === 'dest_host') icon = '📥'
          
          ctx.fillText(icon, x, y)
          
          // Add IP label if zoom level is high enough
          if (globalScale > 1.5) {
            ctx.fillStyle = '#e4e4e7'
            ctx.font = `${Math.max(8, size * 0.4)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            
            // Truncate long IPs for display
            const label = n.label.length > 12 ? n.label.substring(0, 12) + '...' : n.label
            ctx.fillText(label, x, y + size + 2)
          }
        }}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkColor={(link) => {
          const l = link as NetworkLink
          if (l.metadata?.malicious) return '#ef4444'
          return '#6366f1'
        }}
        linkWidth={(link) => {
          const l = link as NetworkLink
          return l.metadata?.malicious ? 3 : 1.5
        }}
        linkDirectionalParticles={(link) => {
          const l = link as NetworkLink
          return l.metadata?.malicious ? 4 : 2
        }}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#a855f7'}
        backgroundColor="transparent"
        linkLabel={(link) => {
          const l = link as NetworkLink
          const meta = l.metadata
          if (meta) {
            return `🔗 ${l.source} → ${l.target}\n` +
                   `Protocol: ${meta.protocol || 'unknown'}\n` +
                   `Port: ${meta.dst_port || 'unknown'}\n` +
                   `Service: ${meta.service || 'unknown'}\n` +
                   `${meta.malicious ? '⚠️ MALICIOUS FLOW' : '✅ Clean traffic'}`
          }
          return `${l.source} → ${l.target}`
        }}
        onNodeClick={(node) => {
          const n = node as NetworkNode
          console.log('Node clicked:', n)
          // You could add a modal or sidebar here showing detailed node info
        }}
        onLinkClick={(link) => {
          const l = link as NetworkLink
          console.log('Link clicked:', l)
          // You could add detailed flow information here
        }}
        onNodeHover={(node) => {
          // Change cursor on hover
          if (node) {
            document.body.style.cursor = 'pointer'
          } else {
            document.body.style.cursor = 'default'
          }
        }}
        onEngineStop={() => {
          // Don't auto-zoom when simulation stops, let it spread naturally
          console.log('Force simulation stopped')
        }}
        cooldownTicks={500}
        cooldownTime={10000}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.1}
        maxZoom={8}
        nodeRelSize={1}
        linkHoverPrecision={10}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.3}
        warmupTicks={200}
        onNodeDragEnd={(node) => {
          // Restart simulation when node is dragged to maintain layout
          if (graphRef.current) {
            graphRef.current.d3ReheatSimulation()
          }
        }}
      />
      
      {/* Minimal info overlay - just the node/link count */}
      <div className="absolute top-3 left-3 bg-black/70 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-md border border-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">●</span>
          <span className="font-medium">Nodes: {graphData.nodes.length}</span>
          <span className="text-gray-400">|</span>
          <span className="text-blue-400">●</span>
          <span className="font-medium">Links: {graphData.links.length}</span>
        </div>
      </div>
    </div>
  )
})

NetworkGraph.displayName = 'NetworkGraph'
