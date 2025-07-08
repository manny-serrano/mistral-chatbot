"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send, Maximize2, Minimize2 } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatProps {
  onToggleExpansion?: () => void
  isExpanded?: boolean
}

// Helper function to render formatted content
function formatMessageContent(content: string): React.ReactElement {
  // Split content into main response and analysis summary
  const parts = content.split('**📊 Analysis Summary:**')
  const mainContent = parts[0]
  const analysisSummary = parts[1]

  // Convert markdown-like formatting to JSX
  const formatText = (text: string): React.ReactElement => {
    const lines = text.split('\n')
    
    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
          // Skip empty lines
          if (!line.trim()) return <div key={index} className="h-2" />
          
          // Handle headings
          if (line.startsWith('**') && line.endsWith('**') && !line.includes(':')) {
            const heading = line.replace(/\*\*/g, '')
            return (
              <h3 key={index} className="text-lg font-semibold text-blue-300 mt-4 mb-2">
                {heading}
              </h3>
            )
          }
          
          // Handle subheadings
          if (line.startsWith('### ')) {
            return (
              <h4 key={index} className="text-base font-medium text-green-300 mt-3 mb-1">
                {line.replace('### ', '')}
              </h4>
            )
          }
          
          // Handle numbered lists
          if (/^\d+\./.test(line.trim())) {
            return (
              <div key={index} className="ml-2 text-zinc-100">
                <span className="font-medium text-yellow-300">{line.match(/^\d+\./)?.[0]}</span>
                {line.replace(/^\d+\.\s*/, ' ')}
              </div>
            )
          }
          
          // Handle bullet points
          if (line.trim().startsWith('•')) {
            return (
              <div key={index} className="ml-4 text-zinc-100 flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>{line.replace(/^\s*•\s*/, '')}</span>
              </div>
            )
          }
          
          // Handle bold inline text
          if (line.includes('**')) {
            const parts = line.split(/(\*\*[^*]+\*\*)/)
            return (
              <div key={index} className="text-zinc-100">
                {parts.map((part, partIndex) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <span key={partIndex} className="font-semibold text-white">
                        {part.replace(/\*\*/g, '')}
                      </span>
                    )
                  }
                  return part
                })}
              </div>
            )
          }
          
          // Regular text
          return (
            <div key={index} className="text-zinc-100">
              {line}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main content */}
      <div>{formatText(mainContent)}</div>
      
      {/* Analysis summary section */}
      {analysisSummary && (
        <div className="mt-6 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
            📊 Analysis Summary
          </h4>
          <div className="space-y-1 text-sm">
            {analysisSummary.split('\n').filter(line => line.trim()).map((line, index) => (
              <div key={index} className="text-zinc-300">
                {line.includes('**') ? (
                  line.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return (
                        <span key={partIndex} className="font-medium text-white">
                          {part.replace(/\*\*/g, '')}
                        </span>
                      )
                    }
                    return part
                  })
                ) : (
                  line
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Chat({ onToggleExpansion, isExpanded = false }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted, input:', input, 'isLoading:', isLoading)
    
    if (!input.trim() || isLoading) {
      console.log('Submission blocked - empty input or loading')
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    }

    console.log('Sending user message:', userMessage)
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      // Format conversation history for backend
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const requestBody = {
        messages: [
          ...conversationHistory.map(msg => ({
            id: `history-${Date.now()}-${Math.random()}`,
            role: msg.role,
            parts: [{ type: "text", text: msg.content }]
          })),
          {
            id: userMessage.id,
            role: "user",
            parts: [{ type: "text", text: userMessage.content }]
          }
        ]
      }

      console.log('Sending request to /api/chat:', requestBody)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status, 'OK:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error text:', errorText)
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      
      const assistantMessage: Message = {
        id: data.id || `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content || "Sorry, I couldn't generate a response.",
        timestamp: new Date()
      }

      console.log('Adding assistant message:', assistantMessage)
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Chat error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  return (
    <Card className="flex h-[600px] flex-col bg-zinc-950 border-zinc-800">
      <CardHeader className="border-b border-zinc-800 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-white">Network Traffic Analysis</CardTitle>
          {onToggleExpansion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpansion}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
              title={isExpanded ? "Collapse chat" : "Expand chat"}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-3 text-red-400 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 py-12">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Bot className="h-8 w-8 text-purple-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-white">LEVANT AI Assistant</h3>
                <p className="text-sm text-zinc-400 max-w-md">
                  Ask me about network traffic, suspicious IPs, or potential threats. I can analyze patterns and suggest
                  mitigation steps. {isExpanded ? "Expanded view for detailed analysis." : "Click the expand button for more space."}
                </p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => handleSuggestionClick("Identify suspicious IPs in today's traffic")}
                >
                  Identify suspicious IPs in today's traffic
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => handleSuggestionClick("Show me the communication path for IP 192.168.1.100")}
                >
                  Show me the communication path for IP 192.168.1.100
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => handleSuggestionClick("What are the most common attack patterns today?")}
                >
                  What are the most common attack patterns today?
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role !== "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-500 text-white">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {message.role === "user" ? (
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    ) : (
                      <div className="text-sm">
                        {formatMessageContent(message.content)}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-zinc-700 text-white">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-purple-500 text-white">AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-zinc-800 text-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
                      </div>
                      <span className="text-sm text-zinc-400">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="border-t border-zinc-800 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder={isExpanded 
              ? "Ask detailed questions about network traffic, threats, or security analysis..." 
              : "Ask about network traffic or potential threats..."
            }
            value={input}
            onChange={handleInputChange}
            className="flex-1 bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500 text-white placeholder:text-zinc-400"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
