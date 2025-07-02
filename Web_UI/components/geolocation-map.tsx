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
}

interface GeolocationMapProps {
  locations: LocationData[]
  onLocationSelect?: (location: LocationData) => void
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"

export default function GeolocationMap({ locations, onLocationSelect }: GeolocationMapProps) {
  // Create a color scale based on threat levels
  const maxThreats = Math.max(...locations.map(l => l.threats), 1)
  const threatColorScale = scaleLinear<string>()
    .domain([0, maxThreats / 4, maxThreats / 2, maxThreats])
    .range(["#10b981", "#f59e0b", "#f97316", "#ef4444"])

  const getMarkerSize = (threats: number, flows: number) => {
    const baseSize = 4
    const threatMultiplier = Math.min(threats / 5, 3) // Cap at 3x for very high threats
    const flowMultiplier = Math.min(flows / 100, 2) // Cap at 2x for very high flows
    return baseSize + (threatMultiplier * 2) + (flowMultiplier * 1)
  }

  const getMarkerColor = (threats: number) => {
    return threatColorScale(threats)
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
                fill={getMarkerColor(location.threats)}
                stroke="#ffffff"
                strokeWidth={1}
                opacity={0.8}
                style={{ cursor: "pointer" }}
                onClick={() => handleMarkerClick(location)}
              >
                <title>
                  {`${location.ip} (${location.city}, ${location.country})\nThreats: ${location.threats}\nFlows: ${location.flows}`}
                </title>
              </circle>
              
              {/* Add a pulsing animation for high-threat locations */}
              {location.threats >= 10 && (
                <circle
                  r={getMarkerSize(location.threats, location.flows) + 3}
                  fill="none"
                  stroke={getMarkerColor(location.threats)}
                  strokeWidth={2}
                  opacity={0.5}
                  style={{ 
                    cursor: "pointer",
                    animation: "pulse 2s infinite"
                  }}
                  onClick={() => handleMarkerClick(location)}
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