import { NextRequest, NextResponse } from 'next/server'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

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

    // Add source information if available
    if (data.source_documents && data.source_documents.length > 0) {
      responseText += '\n\n📊 **Analysis Details:**'
      responseText += `\n• Database: ${data.database_used}`
      responseText += `\n• Query Type: ${data.query_type}`
      responseText += `\n• Processing Time: ${data.processing_time?.toFixed(2)}s`
      
      if (data.collections_used && data.collections_used.length > 0) {
        responseText += `\n• Collections: ${data.collections_used.join(', ')}`
      }
      
      if (data.source_documents.length > 0) {
        responseText += `\n• Sources: ${data.source_documents.length} documents analyzed`
      }
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
