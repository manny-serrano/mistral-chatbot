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

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    
    // Get the latest user message
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    // Prepare conversation history for the backend (excluding the latest message)
    const conversationHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role,
      content: msg.parts?.map((part: any) => part.text).join('') || msg.content || ''
    })).filter((msg: any) => msg.content.trim())

    // Call your backend API
    const backendResponse = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: latestMessage.parts?.map((part: any) => part.text).join('') || latestMessage.content || '',
        analysis_type: 'auto',
        include_sources: true,
        max_results: 5,
        user: 'frontend_user',
        conversation_history: conversationHistory
      }),
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

    // Format the response for the chat UI
    let responseText = data.result

    // Always add query classification and database information for transparency
    responseText += '\n\n🔍 **Query Analysis:**'
    responseText += `\n• **Query Type:** ${formatQueryType(data.query_type)}`
    responseText += `\n• **Database Used:** ${formatDatabaseName(data.database_used)}`
    responseText += `\n• **Processing Time:** ${data.processing_time?.toFixed(2)}s`
    
    if (data.collections_used && data.collections_used.length > 0) {
      responseText += `\n• **Collections:** ${data.collections_used.join(', ')}`
    }

    // Add source information if available
    if (data.source_documents && data.source_documents.length > 0) {
      responseText += `\n• **Source Documents:** ${data.source_documents.length} documents analyzed`
      
      // Optionally show a brief preview of sources
      if (data.source_documents.length > 0) {
        responseText += '\n\n📋 **Data Sources:**'
        data.source_documents.slice(0, 3).forEach((doc: any, index: number) => {
          const source = doc.metadata?.source || doc.metadata?.collection || 'Unknown'
          const preview = doc.content?.substring(0, 100)?.replace(/\n+/g, ' ') || 'No preview'
          responseText += `\n${index + 1}. **${source}:** ${preview}...`
        })
        
        if (data.source_documents.length > 3) {
          responseText += `\n   ... and ${data.source_documents.length - 3} more sources`
        }
      }
    } else {
      responseText += `\n• **Source Documents:** None (direct analysis)`
    }

    // Return the response in the format expected by useChat
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
