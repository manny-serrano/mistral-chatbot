const fs = require('fs');

async function testPDFDownload() {
  const reportId = 'cybersecurity_report_3.5h_20250703_132052';
  
  try {
    console.log('🔍 Step 1: Fetching report data...');
    
    // Step 1: Fetch report data (like frontend does)
    const reportResponse = await fetch(`http://localhost:3000/api/reports/${reportId}`);
    
    if (!reportResponse.ok) {
      throw new Error(`Failed to fetch report: ${reportResponse.status}`);
    }
    
    const reportData = await reportResponse.json();
    console.log('✅ Report data fetched successfully');
    console.log(`📊 Report title: ${reportData.report?.metadata?.report_title}`);
    
    // Step 2: Generate PDF HTML (like frontend does)
    console.log('\n🔧 Step 2: Generating PDF HTML...');
    
    const pdfResponse = await fetch('http://localhost:3000/api/reports/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reportData: reportData.report }),
    });
    
    if (!pdfResponse.ok) {
      const errorData = await pdfResponse.json();
      throw new Error(`Failed to generate PDF HTML: ${JSON.stringify(errorData)}`);
    }
    
    const { html } = await pdfResponse.json();
    console.log('✅ PDF HTML generated successfully');
    console.log(`📄 HTML length: ${html.length} characters`);
    
    // Step 3: Save HTML to file for inspection
    fs.writeFileSync('test_output.html', html);
    console.log('💾 HTML saved to test_output.html for inspection');
    
    // Step 4: Check if HTML contains expected content
    console.log('\n🔍 Step 3: Validating content...');
    
    const checks = [
      { name: 'Report Title', pattern: /Network Traffic Analysis Report/ },
      { name: 'Executive Summary', pattern: /Executive Summary/ },
      { name: 'Network Traffic Analysis', pattern: /Network Traffic Analysis/ },
      { name: 'Security Analysis', pattern: /Security Analysis/ },
      { name: 'Recommendations', pattern: /Recommendations/ },
      { name: 'CSS Styling', pattern: /\.card-grid/ },
      { name: 'Badge Classes', pattern: /badge-medium/ },
      { name: 'Traffic Data', pattern: /127,473/ }, // Total flows
      { name: 'Data Volume', pattern: /22\.34 GB/ }, // Total data
    ];
    
    let passedChecks = 0;
    checks.forEach(check => {
      if (check.pattern.test(html)) {
        console.log(`✅ ${check.name}: Found`);
        passedChecks++;
      } else {
        console.log(`❌ ${check.name}: Missing`);
      }
    });
    
    console.log(`\n📈 Summary: ${passedChecks}/${checks.length} checks passed`);
    
    if (passedChecks === checks.length) {
      console.log('🎉 All tests passed! PDF generation is working correctly.');
      console.log('📁 Open test_output.html in your browser to see the formatted report.');
    } else {
      console.log('⚠️  Some checks failed. Please review the output.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
testPDFDownload().catch(console.error); 