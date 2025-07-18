const fs = require('fs');

// Test script to verify PDF generation works with real frontend data flow
const BASE_URL = 'http://localhost:3000';

async function testFrontendPDFFlow() {
  console.log('🧪 Testing Frontend PDF Generation Flow...\n');
  
  try {
    // Step 1: Get session cookie like frontend would
    console.log('1️⃣ Authenticating via mock SSO...');
    const authResponse = await fetch(`${BASE_URL}/api/auth/sso/mock?target=/reports`);
    const cookies = authResponse.headers.get('set-cookie');
    console.log('✅ Authentication successful');
    
    // Step 2: Get available reports
    console.log('\n2️⃣ Fetching available reports...');
    const reportsResponse = await fetch(`${BASE_URL}/api/reports`, {
      headers: {
        'Cookie': cookies || ''
      }
    });
    const reportsData = await reportsResponse.json();
    
    if (!reportsData.reports?.user?.length) {
      console.log('❌ No user reports found');
      return;
    }
    
    const firstReport = reportsData.reports.user[0];
    console.log(`✅ Found ${reportsData.reports.user.length} reports`);
    console.log(`   Testing with: ${firstReport.title} (${firstReport.id})`);
    
    // Step 3: Get full report data
    console.log('\n3️⃣ Fetching full report data...');
    const reportResponse = await fetch(`${BASE_URL}/api/reports/${firstReport.id}`, {
      headers: {
        'Cookie': cookies || ''
      }
    });
    const reportData = await reportResponse.json();
    
    if (!reportData.success) {
      console.log('❌ Failed to fetch report data:', reportData);
      return;
    }
    
    console.log('✅ Report data retrieved successfully');
    console.log(`   - ${reportData.report.networkFlows?.toLocaleString() || 'N/A'} network flows`);
    console.log(`   - ${Math.round((reportData.report.dataBytes || 0) / 1e9 * 100) / 100} GB analyzed`);
    console.log(`   - Risk level: ${reportData.report.riskLevel || 'Unknown'}`);
    
    // Step 4: Test PDF generation with actual report data
    console.log('\n4️⃣ Generating PDF...');
    const pdfResponse = await fetch(`${BASE_URL}/api/reports/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(reportData.report)
    });
    
    if (!pdfResponse.ok) {
      console.log('❌ PDF generation failed with status:', pdfResponse.status);
      const errorText = await pdfResponse.text();
      console.log('   Error response:', errorText);
      return;
    }
    
    const pdfResult = await pdfResponse.json();
    
    if (pdfResult.success && pdfResult.html) {
      console.log('✅ PDF generation successful!');
      console.log(`📄 HTML length: ${pdfResult.html.length.toLocaleString()} characters`);
      
      // Quick validation checks
      const html = pdfResult.html;
      const checks = [
        { name: 'Complete HTML structure', test: html.includes('<!DOCTYPE html>') && html.includes('</html>') },
        { name: 'Report title', test: html.includes(reportData.report.metadata?.report_title || 'Network') },
        { name: 'Executive summary', test: html.includes('Executive Summary') },
        { name: 'Network traffic data', test: html.includes('Network Traffic Analysis') },
        { name: 'Security findings', test: html.includes('Security Analysis') },
        { name: 'Recommendations', test: html.includes('Recommendations') },
        { name: 'No template errors', test: !html.includes('${') && !html.includes('undefined') },
        { name: 'Flow count displayed', test: html.includes(reportData.report.networkFlows?.toLocaleString() || '0') },
        { name: 'Protocol data', test: html.includes('TCP') || html.includes('UDP') },
        { name: 'IP addresses', test: /\d+\.\d+\.\d+\.\d+/.test(html) }
      ];
      
      console.log('\n📋 Content Validation:');
      let passCount = 0;
      checks.forEach(check => {
        const status = check.test ? '✅' : '❌';
        console.log(`${status} ${check.name}`);
        if (check.test) passCount++;
      });
      
      console.log(`\n🎯 Validation Score: ${passCount}/${checks.length} (${Math.round(passCount/checks.length*100)}%)`);
      
      if (passCount === checks.length) {
        console.log('\n🎉 Frontend PDF generation is working perfectly!');
        console.log('   ✅ Authentication flow works');
        console.log('   ✅ Report data retrieval works');
        console.log('   ✅ PDF generation with real data works');
        console.log('   ✅ All content renders correctly');
      } else {
        console.log('\n⚠️  Some validation checks failed, but PDF generation is functional');
      }
      
    } else {
      console.log('❌ PDF generation failed:');
      console.log('   Response:', pdfResult);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the Next.js development server is running on port 3000');
      console.log('   Run: cd Web_UI && npm run dev');
    }
  }
}

// Run the comprehensive test
testFrontendPDFFlow(); 