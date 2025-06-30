#!/usr/bin/env node

/**
 * Script to test real Shibboleth authentication locally
 * This simulates the headers that would be passed by a real Shibboleth SP
 */

const http = require('http')

// Test with different user types
const testUsers = {
  faculty: {
    eppn: 'jsmith@duke.edu',
    affiliation: 'faculty@duke.edu;member@duke.edu',
    displayname: 'John Smith',
    givenname: 'John',
    surname: 'Smith',
    mail: 'john.smith@duke.edu',
    dukeid: '12345678'
  },
  
  student: {
    eppn: 'jdoe@duke.edu', 
    affiliation: 'student@duke.edu;member@duke.edu',
    displayname: 'Jane Doe',
    givenname: 'Jane',
    surname: 'Doe',
    mail: 'jane.doe@duke.edu',
    dukeid: '87654321'
  },
  
  staff: {
    eppn: 'rjohnson@duke.edu',
    affiliation: 'staff@duke.edu;employee@duke.edu;member@duke.edu',
    displayname: 'Robert Johnson',
    givenname: 'Robert',
    surname: 'Johnson',
    mail: 'robert.johnson@duke.edu',
    dukeid: '11223344'
  }
}

function testShibbolethEndpoint(userType = 'faculty') {
  const user = testUsers[userType]
  
  if (!user) {
    console.error(`Invalid user type: ${userType}`)
    console.log('Available types:', Object.keys(testUsers).join(', '))
    return
  }
  
  console.log(`\n🧪 Testing Shibboleth endpoint with ${userType} user:`)
  console.log(`   NetID: ${user.eppn}`)
  console.log(`   Name: ${user.displayname}`)
  console.log(`   Role: ${user.affiliation}`)
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/shibboleth?target=/dashboard',
    method: 'GET',
    headers: {
      // Simulate Shibboleth headers
      'eppn': user.eppn,
      'affiliation': user.affiliation,
      'displayname': user.displayname,
      'givenname': user.givenname,
      'surname': user.surname,
      'mail': user.mail,
      'dukeid': user.dukeid,
      'x-forwarded-for': '127.0.0.1'
    }
  }
  
  const req = http.request(options, (res) => {
    console.log(`\n📡 Response Status: ${res.statusCode}`)
    console.log(`📍 Redirected to: ${res.headers.location || 'No redirect'}`)
    
    if (res.headers['set-cookie']) {
      console.log(`🍪 Session Cookie Set: ${res.headers['set-cookie'][0].split(';')[0]}`)
    }
    
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    
    res.on('end', () => {
      if (data) {
        console.log('\n📄 Response Body:', data)
      }
      console.log('\n✅ Test completed!')
    })
  })
  
  req.on('error', (e) => {
    console.error(`\n❌ Request failed: ${e.message}`)
    console.log('\n💡 Make sure your Next.js dev server is running on port 3000')
  })
  
  req.end()
}

// Get user type from command line argument
const userType = process.argv[2] || 'faculty'

console.log('🔐 Duke Shibboleth Authentication Tester')
console.log('=====================================')

testShibbolethEndpoint(userType) 