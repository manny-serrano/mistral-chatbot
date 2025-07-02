"use client"

import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { scaleLinear } from "d3-scale"

interface LocationData {
  ip: string
  country: string
  city: string
  lat: number
  lon: number
  threats: number
  flows: number
  severity?: "critical" | "high" | "medium" | "low"
  alertCount?: number
  lastSeen?: string
  region?: string
  timezone?: string
  isp?: string
  org?: string
  security?: {
    anonymous: boolean
    proxy: boolean
    vpn: boolean
    tor: boolean
    hosting: boolean
  }
}

interface GeolocationMapProps {
  locations: LocationData[]
  onLocationSelect?: (location: LocationData) => void
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"

export default function GeolocationMap({ locations, onLocationSelect }: GeolocationMapProps) {
  const getMarkerSize = (threats: number, flows: number) => {
    const baseSize = 4
    const threatMultiplier = Math.min(threats / 5, 3) // Cap at 3x for very high threats
    const flowMultiplier = Math.min(flows / 100, 2) // Cap at 2x for very high flows
    return baseSize + (threatMultiplier * 2) + (flowMultiplier * 1)
  }

  const getMarkerColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444' // Red
      case 'high':
        return '#f97316' // Orange
      case 'medium':
        return '#f59e0b' // Yellow
      case 'low':
        return '#3b82f6' // Blue
      default:
        return '#6b7280' // Gray
    }
  }

  const handleMarkerClick = (location: LocationData) => {
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <ComposableMap
        projectionConfig={{
          scale: 140,
          center: [0, 20]
        }}
        style={{
          width: "100%",
          height: "100%"
        }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#374151"
                  stroke="#4b5563"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { 
                      outline: "none",
                      fill: "#4b5563"
                    },
                    pressed: { outline: "none" }
                  }}
                />
              ))
            }
          </Geographies>
          
          {locations.map((location, index) => (
            <Marker
              key={`${location.ip}-${index}`}
              coordinates={[location.lon, location.lat]}
            >
              <circle
                r={getMarkerSize(location.threats, location.flows)}
                fill={getMarkerColor(location.severity)}
                stroke="#ffffff"
                strokeWidth={1}
                opacity={0.8}
                style={{ 
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out"
                }}
                onClick={() => handleMarkerClick(location)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1"
                  e.currentTarget.style.strokeWidth = "2"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.8"
                  e.currentTarget.style.strokeWidth = "1"
                }}
              >
                <title>
                  {`🌐 ${location.ip}\n📍 ${location.city}, ${location.country}\n⚠️ Severity: ${location.severity?.toUpperCase() || 'Unknown'}\n🔥 Alerts: ${location.alertCount || location.threats}\n🌐 Flows: ${location.flows}\n\n👆 Click for detailed analysis`}
                </title>
              </circle>
              
              {/* Add a pulsing animation for high-threat locations */}
              {location.threats >= 10 && (
                <circle
                  r={getMarkerSize(location.threats, location.flows) + 3}
                  fill="none"
                  stroke={getMarkerColor(location.severity)}
                  strokeWidth={2}
                  opacity={0.5}
                  style={{ 
                    cursor: "pointer",
                    animation: "pulse 2s infinite",
                    transition: "all 0.2s ease-in-out"
                  }}
                  onClick={() => handleMarkerClick(location)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.8"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.5"
                  }}
                />
              )}
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
      
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.3;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
} 