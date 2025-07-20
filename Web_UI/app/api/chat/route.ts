import { NextRequest, NextResponse } from 'next/server'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// Helper function to format database names for better user understanding
function formatDatabaseName(dbName: string): string {
  const dbMap: { [key: string]: string } = {
    'neo4j': 'Neo4j Graph Database',
    'milvus': 'Milvus Vector Database',
    'milvus_multi_collection': 'Milvus Vector Database (Multi-Collection)',
    'hybrid': 'Hybrid (Graph + Vector)',
    'none': 'No Database (Conversational)',
    'mock': 'Mock/Testing Mode',
    'unknown': 'Unknown Database'
  }
  return dbMap[dbName] || dbName
}

// Helper function to format query type names
function formatQueryType(queryType: string): string {
  const typeMap: { [key: string]: string } = {
    'GRAPH_QUERY': 'Graph Analysis (Relationships & Connections)',
    'SEMANTIC_QUERY': 'Semantic Search (Pattern Matching)',
    'HYBRID_QUERY': 'Hybrid Analysis (Graph + Semantic)',
    'CONVERSATIONAL': 'Conversational (No Database)',
    'LIGHTWEIGHT_TEST': 'Testing Mode',
    'ERROR': 'Error in Processing',
    'UNKNOWN': 'Unknown Query Type'
  }
  return typeMap[queryType] || queryType
}

// Helper function to clean up excessive markdown formatting
function cleanResponseText(text: string): string {
  return text
    // Remove excessive asterisks but keep important ones
    .replace(/\*\*\*+/g, '**')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\*+$/gm, '')
    .replace(/\*+\s*\(/g, ' (')
    .replace(/\s+\*+\s+/g, ' ')
    .replace(/#+ \*+([^*\n]+)/g, (match: string) => match.replace(/\*/g, ''))
    .replace(/(\w+)\*+(\s|$)/g, '$1$2')
    .replace(/(\d+)\.\s*\*+([^*\n]+)/g, '$1. $2')
    .replace(/:\*+\s/g, ': ')
    // Improve list formatting
    .replace(/^(\s*)-\s*\*\*([^*]+)\*\*:\s*/gm, '$1• **$2:** ')
    .replace(/^(\s*)-\s*/gm, '$1• ')
    .replace(/^(\s*)•\s*\*+\s*/gm, '$1• ')
    // Clean up edge cases
    .replace(/^(\s*)•\s*--\s*$/gm, '')
    .replace(/^\s*\*+\s*$/gm, '')
    .replace(/\*+\s*$/gm, '')
    .replace(/\*+\s*\n/g, '\n')
    // Clean up spacing
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()
}

// Helper function to format the complete response with metadata
function formatCompleteResponse(data: any, minimal: boolean = false): string {
  let responseText = cleanResponseText(data.result)
  
  // Skip all metadata in minimal mode
  if (minimal) {
    return responseText
  }
  
  // Add clean spacing instead of separator line
  responseText += '\n\n'
  
  // Build metadata
  const metadata = [
    `🔍 **Analysis Type:** ${formatQueryType(data.query_type)}`,
    `🗄️ **Database:** ${formatDatabaseName(data.database_used)}`,
    `⏱️ **Response Time:** ${data.processing_time?.toFixed(2)}s`
  ]
  
  if (data.collections_used?.length > 0) {
    metadata.push(`📊 **Collections:** ${data.collections_used.join(', ')}`)
  }

  // Add source information
  if (data.source_documents?.length > 0) {
    metadata.push(`📋 **Sources:** ${data.source_documents.length} documents analyzed`)
    
    // Add source preview section
    responseText += '**📋 Data Sources:**\n'
    data.source_documents.slice(0, 3).forEach((doc: any, index: number) => {
      const source = doc.metadata?.source || doc.metadata?.collection || 'Unknown'
      const preview = doc.content?.substring(0, 80)?.replace(/\n+/g, ' ') || 'No preview'
      responseText += `${index + 1}. **${source}:** ${preview}...\n`
    })
    
    if (data.source_documents.length > 3) {
      responseText += `*...and ${data.source_documents.length - 3} more sources*\n`
    }
    responseText += '\n'
  } else {
    metadata.push(`📋 **Sources:** Direct analysis (no document retrieval)`)
  }

  // Add metadata section with clean formatting
  responseText += '**📊 Analysis Summary:**\n'
  metadata.forEach(item => {
    responseText += `${item}\n`
  })

  return responseText
}

// Helper function to extract message content
function extractMessageContent(message: any): string {
  return message.parts?.map((part: any) => part.text).join('') || message.content || ''
}

// Helper function to prepare conversation history
function prepareConversationHistory(messages: any[]): any[] {
  return messages
    .slice(0, -1)
    .map((msg: any) => ({
      role: msg.role,
      content: extractMessageContent(msg)
    }))
    .filter((msg: any) => msg.content.trim())
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication first
    const { getUserFromSession } = await import('../../../lib/auth-utils');
    const user = getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { messages } = await req.json()
    
    // Validate latest message
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    // Prepare request data
    const requestData = {
      query: extractMessageContent(latestMessage),
      analysis_type: 'auto',
      include_sources: true,
      max_results: 5,
      user: user.netId, // Pass actual Duke NetID
      conversation_history: prepareConversationHistory(messages)
    }

    // Call backend API
    const backendResponse = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend API error:', errorText)
      return NextResponse.json(
        { error: `Backend API error: ${backendResponse.status}` }, 
        { status: 500 }
      )
    }

    const data = await backendResponse.json()
    
    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Analysis failed' }, 
        { status: 500 }
      )
    }

    // Format the complete response
    const responseText = formatCompleteResponse(data)

    // Return formatted response
    return NextResponse.json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseText,
      parts: [{ type: 'text', text: responseText }]
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
