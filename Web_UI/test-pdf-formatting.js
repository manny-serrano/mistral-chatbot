const fs = require('fs');

async function testPDFFormatting() {
  console.log('🎨 Testing PDF Formatting and Layout...\n');
  
  try {
    // Test 1: Generate PDF with proper formatting
    console.log('1️⃣ Testing PDF generation with proper formatting...');
    
    const testData = {
      metadata: {
        report_title: 'PDF Formatting Test Report',
        generated_by: 'LEVANT AI Security Platform',
        generation_date: new Date().toISOString(),
        report_version: '3.0',
        analysis_duration_hours: 2.5
      },
      executive_summary: {
        overall_risk_level: 'MEDIUM',
        key_findings: [
          'High-severity port scanning detected',
          'High-severity data exfiltration detected'
        ],
        critical_issues_count: 2,
        recommendations_priority: 'SCHEDULED'
      },
      network_traffic_overview: {
        basic_stats: {
          total_flows: 127473,
          total_bytes: 23990676301,
          total_packets: 38931511,
          avg_bandwidth: 30.61
        },
        top_sources: [
          { ip: '10.183.3.60', bytes: 8500000000, flows: 75000 },
          { ip: '192.168.1.101', bytes: 7200000000, flows: 65000 }
        ],
        top_destinations: [
          { ip: '8.8.8.8', bytes: 12000000000, flows: 95000 },
          { ip: '1.1.1.1', bytes: 8500000000, flows: 70000 }
        ],
        protocol_breakdown: [
          { protocol: 'TCP', flows: 95000, bytes: 18000000000 },
          { protocol: 'UDP', flows: 32473, bytes: 5990676301 }
        ],
        top_ports: [
          { port: 443, flows: 45000, bytes: 8500000000 },
          { port: 80, flows: 35000, bytes: 6500000000 }
        ],
        bandwidth_stats: {
          peak_bandwidth: 45.2,
          avg_bandwidth: 30.61,
          bandwidth_variance: 12.8
        }
      },
      security_findings: {
        threat_detection_summary: {
          total_threats: 0,
          critical_issues: 2,
          risk_score: 5
        },
        key_findings: [
          'Network traffic analysis completed',
          'Security monitoring active',
          'Baseline patterns established'
        ]
      },
      recommendations_and_next_steps: [
        {
          priority: 'IMMEDIATE',
          category: 'Port Scanning',
          finding: 'Detected 10 potential port scanners',
          recommendation: 'Block scanning sources and review firewall rules',
          estimated_effort: 'Medium',
          timeline: '24 hours'
        },
        {
          priority: 'IMMEDIATE',
          category: 'Data Exfiltration',
          finding: 'Detected 6 high-volume data transfers',
          recommendation: 'Investigate data transfers and implement DLP controls',
          estimated_effort: 'High',
          timeline: '48 hours'
        }
      ]
    };

    const response = await fetch('http://localhost:3000/api/reports/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportData: testData })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ PDF generation successful');
      console.log(`📄 HTML length: ${result.html.length} characters`);
      
      // Save HTML for analysis
      fs.writeFileSync('test-pdf-formatting.html', result.html);
      console.log('💾 HTML saved to test-pdf-formatting.html');
      
      // Test 2: Check formatting elements
      console.log('\n2️⃣ Analyzing PDF formatting elements...');
      
      const html = result.html;
      const formattingTests = [
        { name: 'DOCTYPE declaration', test: html.includes('<!DOCTYPE html>') },
        { name: 'HTML structure', test: html.includes('<html') && html.includes('</html>') },
        { name: 'Head section', test: html.includes('<head>') && html.includes('</head>') },
        { name: 'Body section', test: html.includes('<body>') && html.includes('</body>') },
        { name: 'CSS styling', test: html.includes('<style>') || html.includes('style=') },
        { name: 'Report title', test: html.includes('PDF Formatting Test Report') },
        { name: 'Executive Summary section', test: html.includes('Executive Summary') },
        { name: 'Network Traffic Analysis section', test: html.includes('Network Traffic Analysis') },
        { name: 'Risk level display', test: html.includes('MEDIUM') },
        { name: 'Key findings list', test: html.includes('High-severity port scanning detected') },
        { name: 'Statistics display', test: html.includes('127,473') && html.includes('22.34 GB') },
        { name: 'Protocol breakdown', test: html.includes('TCP') && html.includes('UDP') },
        { name: 'Recommendations section', test: html.includes('IMMEDIATE') },
        { name: 'Proper spacing', test: !html.includes('><') || html.includes('> <') },
        { name: 'Font styling', test: html.includes('font-family') || html.includes('font-size') },
        { name: 'Color styling', test: html.includes('color:') || html.includes('background-color:') },
        { name: 'Layout structure', test: html.includes('margin:') || html.includes('padding:') },
        { name: 'Table formatting', test: html.includes('<table') || html.includes('display: table') },
        { name: 'List formatting', test: html.includes('<ul>') || html.includes('<ol>') },
        { name: 'Header hierarchy', test: html.includes('<h1>') || html.includes('<h2>') || html.includes('<h3>') }
      ];
      
      let passedTests = 0;
      formattingTests.forEach(test => {
        if (test.test) {
          console.log(`✅ ${test.name}`);
          passedTests++;
        } else {
          console.log(`❌ ${test.name}`);
        }
      });
      
      console.log(`\n📊 Formatting Test Results: ${passedTests}/${formattingTests.length} passed`);
      
      // Test 3: Check specific viewer-like formatting
      console.log('\n3️⃣ Checking viewer-like formatting elements...');
      
      const viewerFormattingTests = [
        { name: 'Clean single-column layout', test: !html.includes('column-count') || html.includes('column-count: 1') },
        { name: 'Proper text hierarchy', test: html.includes('font-weight: bold') || html.includes('font-weight: 700') },
        { name: 'Consistent spacing', test: html.includes('margin-bottom') || html.includes('padding') },
        { name: 'Professional styling', test: html.includes('font-family:') && (html.includes('Arial') || html.includes('sans-serif')) },
        { name: 'Data presentation', test: html.includes('127,473') && html.includes('22.34 GB') },
        { name: 'Icon placeholders', test: html.includes('📊') || html.includes('🔍') || html.includes('⚠️') },
        { name: 'Risk level styling', test: html.includes('MEDIUM') && (html.includes('text-decoration: underline') || html.includes('border-bottom')) },
        { name: 'Section headers', test: html.includes('Executive Summary') && html.includes('Network Traffic Analysis') },
        { name: 'Bullet points', test: html.includes('<li>') || html.includes('•') },
        { name: 'Data tables', test: html.includes('<td>') || html.includes('display: table-cell') }
      ];
      
      let viewerTestsPassed = 0;
      viewerFormattingTests.forEach(test => {
        if (test.test) {
          console.log(`✅ ${test.name}`);
          viewerTestsPassed++;
        } else {
          console.log(`❌ ${test.name}`);
        }
      });
      
      console.log(`\n📊 Viewer Formatting Tests: ${viewerTestsPassed}/${viewerFormattingTests.length} passed`);
      
      // Test 4: Overall assessment
      const overallScore = (passedTests + viewerTestsPassed) / (formattingTests.length + viewerFormattingTests.length);
      console.log(`\n🎯 Overall Formatting Score: ${Math.round(overallScore * 100)}%`);
      
      if (overallScore >= 0.8) {
        console.log('✅ PDF formatting is well-structured and viewer-like');
      } else if (overallScore >= 0.6) {
        console.log('⚠️ PDF formatting needs some improvements');
      } else {
        console.log('❌ PDF formatting needs significant improvements');
      }
      
    } else {
      console.log('❌ PDF generation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPDFFormatting(); 