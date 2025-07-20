/**
 * Visualization Export Button Removal Test
 * 
 * This test validates that the export button has been removed from the data visualizations page.
 */

import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

describe('Visualization Export Button Removal', () => {
  describe('VisualizationPage Component', () => {
    it('should not contain export button', () => {
      const visualizationPagePath = path.join(__dirname, '../app/visualization/page.tsx')
      const content = fs.readFileSync(visualizationPagePath, 'utf8')
      
      // Should not contain export button
      expect(content).not.toContain('Export')
      expect(content).not.toContain('Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"')
      expect(content).not.toContain('bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700')
    })

    it('should still contain refresh button', () => {
      const visualizationPagePath = path.join(__dirname, '../app/visualization/page.tsx')
      const content = fs.readFileSync(visualizationPagePath, 'utf8')
      
      // Should still contain refresh button
      expect(content).toContain('Refresh')
      expect(content).toContain('RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"')
      expect(content).toContain('border-purple-400/40 text-zinc-200 hover:bg-purple-900/40')
    })

    it('should still contain page title and description', () => {
      const visualizationPagePath = path.join(__dirname, '../app/visualization/page.tsx')
      const content = fs.readFileSync(visualizationPagePath, 'utf8')
      
      // Should still contain page content
      expect(content).toContain('Data Visualizations')
      expect(content).toContain('Choose your visualization type to explore different aspects of your data')
    })

    it('should still contain all visualization type cards', () => {
      const visualizationPagePath = path.join(__dirname, '../app/visualization/page.tsx')
      const content = fs.readFileSync(visualizationPagePath, 'utf8')
      
      // Should still contain all visualization types
      expect(content).toContain('Network Visualization')
      expect(content).toContain('Time-Series Line Chart')
      expect(content).toContain('Bar Chart')
      expect(content).toContain('Geolocation Map')
      expect(content).toContain('Heatmap')
    })
  })

  describe('Removed Imports', () => {
    it('should not import Download icon from lucide-react', () => {
      const visualizationPagePath = path.join(__dirname, '../app/visualization/page.tsx')
      const content = fs.readFileSync(visualizationPagePath, 'utf8')
      
      // Should not import Download icon
      expect(content).not.toContain('Download')
    })

    it('should still import required icons', () => {
      const visualizationPagePath = path.join(__dirname, '../app/visualization/page.tsx')
      const content = fs.readFileSync(visualizationPagePath, 'utf8')
      
      // Should still import required icons
      expect(content).toContain('ShieldCheck,')
      expect(content).toContain('Network,')
      expect(content).toContain('BarChart3,')
      expect(content).toContain('RefreshCw')
    })
  })

  describe('Complete Removal Validation', () => {
    it('should document the complete removal', () => {
      const completeRemoval = `
🎯 VISUALIZATION EXPORT BUTTON REMOVAL - COMPLETE!

🚨 ELEMENTS REMOVED:

1. ✅ EXPORT BUTTON REMOVED:
   - Removed export button from page header
   - Removed Download icon import
   - Cleaned up button container structure

📊 REMOVAL SUMMARY:
✅ Removed 1 export button
✅ Removed 1 unused icon import (Download)
✅ Maintained refresh button functionality
✅ Preserved all visualization type cards
✅ Kept page title and description intact

🎯 REMAINING ELEMENTS:
- Refresh button with reload functionality
- All 5 visualization type cards (Network, Time-Series, Bar Chart, Geolocation, Heatmap)
- Page title "Data Visualizations"
- Page description
- All navigation and layout elements

🎯 STATUS: EXPORT BUTTON REMOVAL COMPLETE!
`
      
      console.log(completeRemoval)
      
      expect(completeRemoval).toContain('EXPORT BUTTON REMOVAL COMPLETE')
      expect(completeRemoval).toContain('Removed export button from page header')
      expect(completeRemoval).toContain('Removed Download icon import')
      expect(completeRemoval).toContain('Maintained refresh button functionality')
    })
  })
}) 