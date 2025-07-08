"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CustomNetworkGraph, NetworkGraphData } from "@/components/custom-network-graph"
import { ArrowLeft } from "lucide-react"

export default function FlowsPage() {
  const searchParams = useSearchParams()
  const ip = searchParams.get("ip") || ""
  const [viewMode, setViewMode] = useState<'text'|'graph'>('text')
  const [graphData, setGraphData] = useState<NetworkGraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    if (!ip) return
    setLoading(true)
    setError(null)
    fetch(`http://localhost:8000/network/graph?limit=100&ip_address=${encodeURIComponent(ip)}`)
      .then(async res => {
        if (!res.ok) {
          let err = `Server error ${res.status}`
          try { const data = await res.json(); if (data.error) err = data.error } catch {}
          throw new Error(err)
        }
        return res.json()
      })
      .then(data => setGraphData({ nodes: data.nodes, links: data.links }))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [ip])

  if (!ip) {
    return (
      <div className="p-4">
        <h1 className="text-lg text-white">No IP provided</h1>
        <Link href="/chat">
          <Button>Back to Chat</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950/80 to-gray-950 text-zinc-100">
      <header className="p-4 flex items-center space-x-4">
        <Link href="/chat">
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <h1 className="text-xl font-semibold">Flows for IP: {ip}</h1>
      </header>
      <div className="p-4">
        <div className="flex space-x-2 mb-4">
          <Button size="sm" variant="outline" className={`text-white ${viewMode === 'text' ? 'bg-purple-600 border-purple-600 hover:bg-purple-700' : ''}`} onClick={() => setViewMode('text')}>
            Text Flows
          </Button>
          <Button size="sm" variant="outline" className={`text-white ${viewMode === 'graph' ? 'bg-purple-600 border-purple-600 hover:bg-purple-700' : ''}`} onClick={() => setViewMode('graph')}>
            Graph View
          </Button>
        </div>
        {loading && <p className="text-white">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && viewMode === 'text' && (
          <div className="overflow-y-auto h-96 p-2 bg-gray-800 rounded-lg">
            {graphData.links.map((link, idx) => (
              <div key={idx} className="text-sm text-zinc-100 mb-1">
                {link.source} ➔ {link.target}{link.type ? ` (${link.type})` : ''}
              </div>
            ))}
          </div>
        )}
        {!loading && !error && viewMode === 'graph' && (
          <div className="h-96">
            <CustomNetworkGraph
              graphData={graphData}
              searchIp={ip}
              loading={loading}
              error={error}
              info={null}
              onClearSearch={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  )
} 