const fs = require('fs');
const path = require('path');

// Update base URL to port 3000
const BASE_URL = 'http://localhost:3000';

// Simple test script to verify PDF generation functionality
const sampleReportData = {
  metadata: {
    report_title: 'Test Security Report',
    generated_by: 'LEVANT AI Security Platform',
    generation_date: '2025-07-17T15:05:35.180201+00:00',
    report_version: '3.0',
    analysis_duration_hours: 3.5,
    analysis_scope: 'Normal network flows',
    threat_detection_method: 'Pattern matching'
  },
  executive_summary: {
    overall_risk_level: 'MEDIUM',
    key_findings: [
      'Network monitoring active',
      'No critical threats detected',
      'Standard security protocols in place'
    ],
    critical_issues_count: 0,
    recommendations_priority: 'MEDIUM'
  },
  network_traffic_overview: {
    basic_stats: {
      total_flows: 127473,
      total_bytes: 23990676301,
      total_packets: 500000,
      avg_duration: 30
    },
    top_sources: [
      { ip: '192.168.1.100', bytes: 1000000, flow_count: 100 },
      { ip: '10.0.0.50', bytes: 800000, flow_count: 80 }
    ],
    top_destinations: [
      { ip: '8.8.8.8', bytes: 1200000, flow_count: 120 },
      { ip: '1.1.1.1', bytes: 900000, flow_count: 90 }
    ],
    protocol_breakdown: {
      'tcp': {
        protocol_id: 6,
        flow_count: 50000,
        total_bytes: 15000000000,
        is_suspicious: false
      },
      'udp': {
        protocol_id: 17,
        flow_count: 30000,
        total_bytes: 8000000000,
        is_suspicious: false
      }
    },
    bandwidth_stats: {
      total_bytes: 23990676301,
      average_mbps: 150.5,
      duration_seconds: 12600
    }
  },
  security_findings: {
    port_scanning: {
      severity: 'MEDIUM',
      count: 5,
      matching_flows: 150,
      potential_scanners: [
        { source_ip: '192.168.1.50', ports_scanned: 100 }
      ]
    },
    data_exfiltration: {
      severity: 'HIGH',
      count: 2,
      matching_flows: 50,
      high_volume_sources: [
        { source_ip: '10.0.0.200', gb_sent: 5.2 }
      ]
    }
  },
  recommendations_and_next_steps: {
    prioritized_recommendations: [
      {
        priority: 'IMMEDIATE',
        category: 'Port Scanning',
        finding: 'Multiple port scan attempts detected',
        recommendation: 'Implement rate limiting and monitoring',
        estimated_effort: 'Medium',
        timeline: '24 hours'
      }
    ]
  },
  ai_analysis: [
    {
      attack_technique: 'T1046',
      confidence_score: 0.85,
      finding: 'Network scanning activity detected',
      business_impact: 'Potential reconnaissance for future attacks',
      recommended_action: 'Block scanning sources immediately',
      timeline: 'Immediate'
    }
  ],
  id: 'test-report-123',
  name: 'Test Security Report',
  riskLevel: 'MEDIUM',
  threatCount: 7,
  criticalIssues: 0,
  networkFlows: 127473,
  dataBytes: 23990676301,
  riskScore: 45
};

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation Functionality...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/reports/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportData: sampleReportData,
        reportId: 'test-report-123'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.html) {
      console.log('✅ PDF generation succeeded!');
      console.log('📄 HTML length:', result.html.length, 'characters');
      
      // Validate HTML structure
      const html = result.html;
      const validations = [
        { name: 'DOCTYPE declaration', test: html.includes('<!DOCTYPE html>') },
        { name: 'HTML tags', test: html.includes('<html>') && html.includes('</html>') },
        { name: 'Head section', test: html.includes('<head>') && html.includes('</head>') },
        { name: 'Body section', test: html.includes('<body>') && html.includes('</body>') },
        { name: 'Title content', test: html.includes('Test Security Report') },
        { name: 'Executive Summary section', test: html.includes('Executive Summary') },
        { name: 'Network Traffic section', test: html.includes('Network Traffic Analysis') },
        { name: 'Security Analysis section', test: html.includes('Security Analysis') },
        { name: 'Recommendations section', test: html.includes('Recommendations') },
        { name: 'AI Analysis section', test: html.includes('AI Security Analysis') },
        { name: 'No template literals', test: !html.includes('${') },
        { name: 'No incomplete templates', test: !html.includes('`') },
        { name: 'Formatted numbers', test: html.includes('127,473') },
        { name: 'Formatted bytes', test: html.includes(' GB') || html.includes(' MB') || html.includes(' KB') },
        { name: 'Protocol data', test: html.includes('TCP') && html.includes('UDP') },
        { name: 'IP addresses', test: html.includes('192.168.1.100') },
        { name: 'Risk level badges', test: html.includes('MEDIUM') },
        { name: 'Recommendation priorities', test: html.includes('IMMEDIATE') }
      ];
      
      console.log('\n🔍 HTML Validation Results:');
      let passCount = 0;
      validations.forEach(validation => {
        const status = validation.test ? '✅' : '❌';
        console.log(`${status} ${validation.name}`);
        if (validation.test) passCount++;
      });
      
      console.log(`\n📊 Validation Score: ${passCount}/${validations.length} (${Math.round(passCount/validations.length*100)}%)`);
      
      if (passCount === validations.length) {
        console.log('\n🎉 All validations passed! PDF generation is working correctly.');
      } else {
        console.log('\n⚠️  Some validations failed. PDF may have issues.');
      }
      
      // Check for any remaining syntax errors
      const syntaxIssues = [
        { name: 'Unmatched quotes', pattern: /[^\\]"[^"]*$|[^\\]'[^']*$/g },
        { name: 'Incomplete tags', pattern: /<[^>]*$/g },
        { name: 'Malformed attributes', pattern: /\s[a-zA-Z-]+=[^"'\s>]/g }
      ];
      
      console.log('\n🔧 Syntax Check:');
      syntaxIssues.forEach(issue => {
        const matches = html.match(issue.pattern);
        if (matches && matches.length > 0) {
          console.log(`❌ ${issue.name}: ${matches.length} issues found`);
          console.log('   First issue:', matches[0]);
        } else {
          console.log(`✅ ${issue.name}: No issues`);
        }
      });
      
    } else {
      console.log('❌ PDF generation failed:');
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the Next.js development server is running on port 3001');
      console.log('   Run: cd Web_UI && npm run dev');
    }
  }
}

// Run the test
testPDFGeneration(); 