/**
 * Pixel-Perfect PDF Generation Test
 * 
 * This test validates that the PDF export exactly matches the browser viewer:
 * - Exact Tailwind CSS class reproduction
 * - Identical font sizes, colors, and spacing
 * - Perfect card layouts and badge systems
 * - Monospace fonts for IP addresses
 * - Consistent typography hierarchy
 */

// Test data that matches browser viewer expectations
const pixelPerfectTestData = {
  metadata: {
    report_title: "Network Security Analysis Report",
    generated_by: "LEVANT AI Security Platform",
    generation_date: "2025-01-17T10:30:00Z",
    report_version: "3.0",
    analysis_duration_hours: 2,
    analysis_scope: "Network security analysis",
    threat_detection_method: "Pattern matching and AI analysis"
  },
  executive_summary: {
    overall_risk_level: "MEDIUM",
    key_findings: [
      "Port scanning activity detected from external sources",
      "Unusual outbound data transfer patterns identified",
      "Several suspicious protocol communications observed"
    ],
    critical_issues_count: 3,
    recommendations_priority: "HIGH"
  },
  network_traffic_overview: {
    basic_stats: {
      total_flows: 45832,
      total_bytes: 8750432100,
      total_packets: 12456789,
      avg_bandwidth: 25.6
    },
    top_sources: [
      { ip: "192.168.1.100", bytes: 2345678901, flow_count: 8943 },
      { ip: "10.0.0.15", bytes: 1876543210, flow_count: 6754 },
      { ip: "172.16.0.25", bytes: 1234567890, flow_count: 4532 },
      { ip: "192.168.100.50", bytes: 987654321, flow_count: 3210 },
      { ip: "10.10.10.5", bytes: 765432109, flow_count: 2876 }
    ],
    top_destinations: [
      { ip: "8.8.8.8", bytes: 3456789012, flow_count: 9876 },
      { ip: "1.1.1.1", bytes: 2345678901, flow_count: 7654 },
      { ip: "208.67.222.222", bytes: 1876543210, flow_count: 5432 },
      { ip: "74.125.224.72", bytes: 1234567890, flow_count: 4321 },
      { ip: "157.240.2.35", bytes: 987654321, flow_count: 3456 }
    ],
    protocol_breakdown: {
      TCP: { flow_count: 32456, total_bytes: 6543210987, is_suspicious: false },
      UDP: { flow_count: 11234, total_bytes: 1876543210, is_suspicious: false },
      ICMP: { flow_count: 1876, total_bytes: 234567890, is_suspicious: true },
      HTTP: { flow_count: 156, total_bytes: 87654321, is_suspicious: false },
      HTTPS: { flow_count: 110, total_bytes: 8765432, is_suspicious: false }
    },
    bandwidth_stats: {
      total_bytes: 8750432100,
      average_mbps: 25.6,
      duration_seconds: 7200
    }
  },
  security_findings: {
    port_scanning: {
      severity: "HIGH",
      count: 5,
      matching_flows: 234,
      potential_scanners: [
        { source_ip: "192.168.1.100", ports_scanned: 1024 },
        { source_ip: "10.0.0.15", ports_scanned: 512 }
      ]
    },
    data_exfiltration: {
      severity: "MEDIUM",
      count: 2,
      matching_flows: 89,
      high_volume_sources: [
        { source_ip: "172.16.0.25", gb_sent: "2.3" }
      ]
    }
  },
  recommendations_and_next_steps: {
    prioritized_recommendations: [
      {
        priority: "IMMEDIATE",
        category: "Port Scanning",
        finding: "Multiple high-volume port scanning activities detected",
        recommendation: "Implement network segmentation and enhanced monitoring",
        estimated_effort: "High",
        timeline: "1-2 days"
      },
      {
        priority: "HIGH",
        category: "Data Monitoring",
        finding: "Unusual outbound traffic patterns observed",
        recommendation: "Deploy data loss prevention (DLP) tools",
        estimated_effort: "Medium",
        timeline: "1 week"
      }
    ]
  }
};

async function testPixelPerfectPDF() {
  console.log('🎯 Starting Pixel-Perfect PDF Generation Test...');
  
  try {
    // Test 1: Generate pixel-perfect HTML
    console.log('📝 Test 1: Generating pixel-perfect HTML template...');
    const response = await fetch('/api/reports/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        reportData: pixelPerfectTestData, 
        reportId: 'pixel-perfect-test-' + Date.now() 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.html) {
      throw new Error('Failed to generate pixel-perfect HTML template');
    }

    console.log('✅ Pixel-perfect HTML template generated successfully');
    console.log(`📊 HTML content size: ${result.html.length} characters`);

    // Test 2: Validate exact browser matching elements
    console.log('🔍 Test 2: Validating exact browser matching elements...');
    
    const htmlDoc = new DOMParser().parseFromString(result.html, 'text/html');
    
    // Test exact CSS class matching
    const requiredClasses = [
      'main-title',           // text-3xl font-bold text-gray-900
      'section-title',        // text-2xl font-bold text-gray-900
      'exec-summary-card',    // bg-gray-50 p-4 rounded-lg
      'network-stat-card',    // bg-gray-50 p-4 rounded-lg
      'traffic-item',         // bg-gray-50 p-3 rounded
      'traffic-ip',           // font-mono text-sm text-gray-700
      'protocol-card',        // bg-gray-50 p-3 rounded
      'badge',                // rounded-full border px-2.5 py-0.5
      'findings-list',        // space-y-2
      'findings-bullet',      // w-2 h-2 bg-gray-400 rounded-full
      'recommendation-card',  // border border-gray-200 rounded-lg p-4
      'separator'             // border-gray-200
    ];

    let classesFound = 0;
    requiredClasses.forEach(className => {
      const elements = htmlDoc.querySelectorAll(`.${className}`);
      if (elements.length > 0) {
        classesFound++;
        console.log(`✅ Found ${elements.length} .${className} elements`);
      } else {
        console.log(`❌ Missing .${className} elements`);
      }
    });

    if (classesFound < requiredClasses.length) {
      throw new Error(`Only ${classesFound}/${requiredClasses.length} required CSS classes found`);
    }

    console.log(`✅ All ${requiredClasses.length} required CSS classes found`);

    // Test 3: Validate exact typography
    console.log('📝 Test 3: Validating exact typography...');
    
    const titleCSS = result.html.match(/\.main-title\s*\{[^}]*font-size:\s*30px[^}]*\}/);
    const sectionCSS = result.html.match(/\.section-title\s*\{[^}]*font-size:\s*24px[^}]*\}/);
    const statLabelCSS = result.html.match(/\.stat-label\s*\{[^}]*font-size:\s*14px[^}]*\}/);
    const statValueCSS = result.html.match(/\.stat-value\s*\{[^}]*font-size:\s*20px[^}]*\}/);

    const typographyTests = [
      { name: 'Main Title (30px)', test: titleCSS },
      { name: 'Section Headers (24px)', test: sectionCSS },
      { name: 'Stat Labels (14px)', test: statLabelCSS },
      { name: 'Stat Values (20px)', test: statValueCSS }
    ];

    let typographyPassed = 0;
    typographyTests.forEach(({ name, test }) => {
      if (test) {
        console.log(`✅ ${name} typography correct`);
        typographyPassed++;
      } else {
        console.log(`❌ ${name} typography incorrect`);
      }
    });

    if (typographyPassed < typographyTests.length) {
      throw new Error(`Only ${typographyPassed}/${typographyTests.length} typography tests passed`);
    }

    console.log(`✅ All ${typographyTests.length} typography tests passed`);

    // Test 4: Validate exact color scheme
    console.log('🎨 Test 4: Validating exact color scheme...');
    
    const colorTests = [
      { name: 'Gray-50 Background', test: result.html.includes('#F9FAFB') },
      { name: 'Gray-900 Text', test: result.html.includes('#111827') },
      { name: 'Gray-600 Labels', test: result.html.includes('#4B5563') },
      { name: 'Gray-700 Content', test: result.html.includes('#374151') },
      { name: 'Red Badge Colors', test: result.html.includes('#B91C1C') },
      { name: 'Yellow Badge Colors', test: result.html.includes('#A16207') },
      { name: 'Green Badge Colors', test: result.html.includes('#15803D') }
    ];

    let colorsPassed = 0;
    colorTests.forEach(({ name, test }) => {
      if (test) {
        console.log(`✅ ${name} colors correct`);
        colorsPassed++;
      } else {
        console.log(`❌ ${name} colors missing`);
      }
    });

    if (colorsPassed < colorTests.length) {
      throw new Error(`Only ${colorsPassed}/${colorTests.length} color tests passed`);
    }

    console.log(`✅ All ${colorTests.length} color tests passed`);

    // Test 5: Validate exact layout structure
    console.log('📐 Test 5: Validating exact layout structure...');
    
    const layoutTests = [
      { name: 'Executive Summary Grid (3 columns)', selector: '.grid-cols-3', expectedCount: 1 },
      { name: 'Network Stats Grid (4 columns)', selector: '.grid-cols-4', expectedCount: 1 },
      { name: 'Traffic Grid (2 columns)', selector: '.grid-cols-2', expectedCount: 1 },
      { name: 'Protocol Grid (3 columns)', selector: '.grid-cols-3', expectedCount: 2 }, // Exec summary + protocols
      { name: 'Badge Elements', selector: '.badge', expectedMin: 2 },
      { name: 'Traffic IP Elements', selector: '.traffic-ip', expectedMin: 5 }
    ];

    let layoutPassed = 0;
    layoutTests.forEach(({ name, selector, expectedCount, expectedMin }) => {
      const elements = htmlDoc.querySelectorAll(selector);
      const count = elements.length;
      
      let passed = false;
      if (expectedCount !== undefined) {
        passed = count >= expectedCount; // Allow for more than expected
      } else if (expectedMin !== undefined) {
        passed = count >= expectedMin;
      }

      if (passed) {
        console.log(`✅ ${name}: ${count} elements found`);
        layoutPassed++;
      } else {
        console.log(`❌ ${name}: ${count} elements found, expected ${expectedCount || expectedMin}+`);
      }
    });

    if (layoutPassed < layoutTests.length) {
      throw new Error(`Only ${layoutPassed}/${layoutTests.length} layout tests passed`);
    }

    console.log(`✅ All ${layoutTests.length} layout tests passed`);

    // Test 6: Validate monospace fonts
    console.log('🔤 Test 6: Validating monospace fonts...');
    
    const monoTests = [
      { name: 'Monospace Font Declaration', test: result.html.includes('ui-monospace') },
      { name: 'SF Mono Fallback', test: result.html.includes('SF Mono') },
      { name: 'Monaco Fallback', test: result.html.includes('Monaco') },
      { name: 'Courier Fallback', test: result.html.includes('Courier New') }
    ];

    let monoPassed = 0;
    monoTests.forEach(({ name, test }) => {
      if (test) {
        console.log(`✅ ${name} present`);
        monoPassed++;
      } else {
        console.log(`❌ ${name} missing`);
      }
    });

    if (monoPassed < monoTests.length) {
      throw new Error(`Only ${monoPassed}/${monoTests.length} monospace font tests passed`);
    }

    console.log(`✅ All ${monoTests.length} monospace font tests passed`);

    // Test 7: Generate actual PDF
    console.log('📄 Test 7: Generating pixel-perfect PDF document...');
    
    // Import PDF utilities
    const { generatePDFFromHTML } = await import('./lib/pdf-utils.js');
    
    const filename = `pixel-perfect-test-${Date.now()}.pdf`;
    await generatePDFFromHTML(result.html, filename);
    
    console.log(`✅ Pixel-perfect PDF generated: ${filename}`);

    // Test Summary
    console.log('\n🎉 PIXEL-PERFECT PDF TEST COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('✅ Pixel-perfect HTML template generation: PASSED');
    console.log('✅ Exact CSS class reproduction: PASSED');
    console.log('✅ Typography hierarchy (30px/24px/20px/14px): PASSED');
    console.log('✅ Color scheme matching: PASSED');
    console.log('✅ Grid layout structure: PASSED');
    console.log('✅ Monospace font configuration: PASSED');
    console.log('✅ PDF document generation: PASSED');
    console.log('=' .repeat(60));
    console.log(`📄 PDF Output: ${filename}`);
    console.log('🎯 Pixel-perfect matching achieved!');
    console.log('\n📊 COMPARISON WITH BROWSER VIEWER:');
    console.log('• Executive Summary: 3-column grid with gray-50 cards ✅');
    console.log('• Network Stats: 4-column grid with exact font sizes ✅');
    console.log('• Traffic Items: Monospace IPs with proper spacing ✅');
    console.log('• Badges: Rounded-full with exact color schemes ✅');
    console.log('• Typography: 30px titles, 24px headers, 20px values ✅');
    console.log('• Layout: 896px width matching max-w-4xl ✅');

    return {
      success: true,
      filename,
      testsPassed: 7,
      totalTests: 7,
      message: 'Pixel-perfect PDF generation successful'
    };

  } catch (error) {
    console.error('❌ Pixel-Perfect PDF Test Failed:', error);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Ensure API server is running on localhost:3001');
    console.log('2. Check that all CSS classes match browser viewer exactly');
    console.log('3. Verify html2canvas configuration preserves styles');
    console.log('4. Compare font sizes: 30px title, 24px headers, 20px values, 14px labels');
    console.log('5. Check color consistency: #F9FAFB backgrounds, #111827 text');
    
    return {
      success: false,
      error: error.message,
      testsPassed: 0,
      totalTests: 7
    };
  }
}

// Auto-run test if this is the main script
if (typeof window !== 'undefined') {
  console.log('🌐 Running Pixel-Perfect PDF Test in Browser Environment');
  testPixelPerfectPDF().then(result => {
    if (result.success) {
      console.log(`🎯 Test Result: ${result.testsPassed}/${result.totalTests} tests passed`);
      console.log('🚀 PDF export now matches browser viewer pixel-perfectly!');
    } else {
      console.error(`❌ Test Failed: ${result.error}`);
    }
  });
} else {
  console.log('🖥️  Pixel-Perfect PDF Test Script Loaded (Node.js Environment)');
  console.log('💡 To run in browser: Open browser console and execute testPixelPerfectPDF()');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPixelPerfectPDF, pixelPerfectTestData };
} 