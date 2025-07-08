"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ShieldCheck,
  Send,
  Plus,
  MessageSquare,
  Bot,
  User,
  Trash2,
  Edit3,
  MoreHorizontal,
  Search,
  Clock,
  Shield,
  AlertTriangle,
  Database,
  BarChart3,
  Settings,
  PenTool,
  X,
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { CustomNetworkGraph, NetworkGraphData } from "@/components/custom-network-graph"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  lastUpdated: Date
  preview: string
}

export default function ChatPage() {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<NetworkGraphData | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [searchIp, setSearchIp] = useState<string>("")
  const [viewMode, setViewMode] = useState<'text'|'graph'>('text')
  const [chats, setChats] = useState<Chat[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")

  // Load chats from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('cs_chats') : null;
    if (stored) {
      try {
        const parsed: Chat[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setChats(parsed);
        }
      } catch {}
    }
  }, []);

  // Persist chats whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cs_chats', JSON.stringify(chats));
    }
  }, [chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentChat?.messages])

  const createNewChat = () => {
    // Clear selection to show welcome screen
    setCurrentChat(null)
    setInputMessage("")
  }

  const selectChat = (chat: Chat) => {
    setCurrentChat(chat)
    setIsEditingTitle(false)
    setEditedTitle("")
  }

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId))
    if (currentChat?.id === chatId) {
      setCurrentChat(null)
    }
  }

  const sendMessage = async (override?: string) => {
    const messageText = override ?? inputMessage.trim()
    if (!messageText) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date()
    }

    // Update current chat or create new one
    let updatedChat: Chat
    if (currentChat) {
      updatedChat = {
        ...currentChat,
        messages: [...currentChat.messages, userMessage],
        lastUpdated: new Date(),
        title: currentChat.messages.length === 0 ? messageText.slice(0, 50) : currentChat.title,
        preview: messageText.slice(0, 100)
      }
    } else {
      updatedChat = {
        id: Date.now().toString(),
        title: messageText.slice(0, 50),
        messages: [userMessage],
        lastUpdated: new Date(),
        preview: messageText.slice(0, 100)
      }
      setChats([updatedChat, ...chats])
    }

    setCurrentChat(updatedChat)
    setInputMessage("")
    setIsLoading(true)
    setError(null)
    // Reset any previous flows panel; only show for explicit 'show me all network flows' queries
    setSearchIp('')
    setGraphData(null)
    setGraphError(null)

    try {
      // Call backend API via Next.js route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...updatedChat.messages.map(msg => ({ id: msg.id, role: msg.role, parts: [{ type: 'text', text: msg.content }] })),
            { id: userMessage.id, role: userMessage.role, parts: [{ type: 'text', text: userMessage.content }] }
          ]
        })
      })

      if (!response.ok) {
        let errMsg = `Server error ${response.status}`
        try {
          const errData = await response.json()
          if (errData.error) errMsg = errData.error
        } catch {
          // ignore parse errors
        }
        throw new Error(errMsg)
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: data.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      }

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage],
        lastUpdated: new Date()
      }

      setCurrentChat(finalChat)
      setChats(prevChats => prevChats.map(chat => chat.id === finalChat.id ? finalChat : chat))

      // If user asked for network flows by IP, trigger graph fetch
      const ipMatch = messageText.match(/show me all network flows from ip\s*([\d\.]+)/i)
      if (ipMatch) {
        // Strip trailing punctuation from IP (e.g. a trailing dot)
        const rawIp = ipMatch[1]
        const ip = rawIp.replace(/\.$/, '')
        setSearchIp(ip)
        setGraphLoading(true)
        setGraphError(null)
        setGraphData(null)
        fetch(`http://localhost:8000/network/graph?limit=100&ip_address=${encodeURIComponent(ip)}`)
          .then(async res => {
            if (!res.ok) {
              let err = `Server error ${res.status}`
              try { const errData = await res.json(); if (errData.error) err = errData.error } catch {}
              throw new Error(err)
            }
            return res.json()
          })
          .then(data => {
            setGraphData({ nodes: data.nodes, links: data.links })
          })
          .catch(err => setGraphError(err.message))
          .finally(() => setGraphLoading(false))
      }
    } catch (err) {
      console.error('Chat API error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch response.')
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase()
    
    if (lowerInput.includes("alert") || lowerInput.includes("notification")) {
      return "I can help you with alert configuration and management. In CyberSense AI, you can:\n\n• Set custom thresholds for different threat types\n• Configure severity levels based on p-values\n• Set up email and SMS notifications\n• Create custom alert rules for specific IP ranges or ports\n\nWould you like me to guide you through configuring specific alert types?"
    }
    
    if (lowerInput.includes("network") || lowerInput.includes("traffic")) {
      return "For network analysis, I recommend focusing on these key areas:\n\n🔍 **Traffic Patterns**: Look for unusual spikes or patterns in your network data\n📊 **Port Analysis**: Monitor commonly attacked ports (22, 80, 443, 3389)\n🌍 **Geolocation**: Track the geographic origin of suspicious connections\n⚡ **Real-time Monitoring**: Use our dashboard for continuous monitoring\n\nWould you like me to explain any specific network security concepts or help you analyze particular traffic patterns?"
    }
    
    if (lowerInput.includes("dashboard") || lowerInput.includes("visualization")) {
      return "Our visualization tools can help you understand your security data better:\n\n📈 **Time-Series Charts**: Track trends over time\n🗺️ **Geolocation Maps**: See where attacks are coming from\n📊 **Bar Charts**: Compare different metrics\n🔥 **Heatmaps**: Identify patterns and hotspots\n🕸️ **Network Graphs**: Visualize network topology and connections\n\nWhich type of visualization would be most helpful for your current analysis?"
    }
    
    return "I'm here to help you with cybersecurity analysis and using CyberSense AI effectively. I can assist with:\n\n🛡️ **Security Analysis**: Network traffic, threat detection, incident response\n📊 **Data Visualization**: Understanding charts, graphs, and security metrics\n🚨 **Alert Management**: Configuring alerts and managing notifications\n📋 **Reporting**: Generating and interpreting security reports\n\nWhat specific cybersecurity topic or CyberSense AI feature would you like to explore?"
  }

  const formatTime = (d: string | Date) => {
    const date = typeof d === 'string' ? new Date(d) : d
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const saveChatTitle = () => {
    if (!currentChat) return
    const title = editedTitle.trim()
    if (title && title !== currentChat.title) {
      const updated = { ...currentChat, title }
      setCurrentChat(updated)
      setChats(prev => prev.map(c => c.id === updated.id ? updated : c))
    }
    setIsEditingTitle(false)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950/80 to-gray-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </h1>
            </Link>
            
            {/* Centered Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
                <Link
                  href="/dashboard"
                  className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-xs sm:text-sm font-medium text-purple-300 flex items-center gap-1">
                  <Bot className="h-4 w-4" />
                  Chat
                </span>
                <Link
                  href="/alerts"
                  className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Alerts
                </Link>
                <Link
                  href="/reports"
                  className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  Reports
                </Link>
                <Link
                  href="/visualization"
                  className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  <span className="hidden sm:inline">Visualization</span>
                  <span className="sm:hidden">Visual</span>
                </Link>
              </nav>
            </div>

            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-purple-500/20 bg-gray-950/50 backdrop-blur-xl flex flex-col">
          {/* New Chat Button */}
          <div className="p-4 border-b border-purple-500/20">
            <Button
              onClick={createNewChat}
              className="rounded-full w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Chat History */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {chats.map((chat) => (
                <Card
                  key={chat.id}
                  className={`rounded-xl cursor-pointer transition-all hover:bg-purple-900/20 border-purple-400/30 ${
                    currentChat?.id === chat.id ? "bg-purple-900/30 border-purple-400/60" : "bg-gray-900/50"
                  }`}
                  onClick={() => selectChat(chat)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-3 w-3 text-purple-400 flex-shrink-0" />
                          <h3 className="text-sm font-medium text-white break-words whitespace-normal">
                            {chat.title}
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-2">
                          {chat.preview}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {formatTime(chat.lastUpdated)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 ml-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(chat.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-purple-500/20 bg-gray-900/50">
                <div className="flex items-center gap-2">
                  {isEditingTitle ? (
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onBlur={saveChatTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveChatTitle()
                        }
                      }}
                      autoFocus
                      className="w-48 bg-gray-800 border-gray-600 text-white h-8 text-sm"
                    />
                  ) : (
                    <h2 className="text-lg font-semibold text-white">{currentChat.title}</h2>
                  )}
                  {!isEditingTitle && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-purple-300"
                      onClick={() => {
                        setEditedTitle(currentChat.title)
                        setIsEditingTitle(true)
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-zinc-400">CyberSense AI Assistant • {currentChat.messages.length} messages</p>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 pb-36">
                <div className="space-y-6 max-w-4xl mx-auto">
                  {currentChat.messages.length === 0 && !isLoading && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        "Show me all network flows from IP 10.138.18.34.",
                        "Does this IP appear in honeypot logs?",
                        "Compare this traffic to known malicious patterns.",
                        "Which IPs are communicating with 10.183.13.66?",
                        "Is this flow suspicious based on packet size or flag usage?",
                        "List all endpoints connected to this subnet.",
                        "What kind of attack is this behavior similar to?",
                        "Give me best practices if I see reverse SYN+ACK with no forward ACK.",
                        "Has this type of flow been seen before in our lab network?",
                        "Visualize the connection path between these two IPs.",
                        "Which flows used uncommon ports in the last hour?",
                        "Show me all high-volume flows over 5 seconds.",
                        "Is there any evidence of lateral movement from this device?",
                        "What actions should I take to mitigate this flow behavior?",
                        "Summarize anomalies in the last 24 hours."
                      ].slice(0,3).map((sugg) => (
                        <Button
                          key={sugg}
                          variant="outline"
                          className="rounded-lg w-full justify-start bg-gray-900 border-gray-700 text-zinc-300 hover:bg-purple-900/40 text-left whitespace-normal break-words text-xs leading-tight"
                          onClick={() => {
                            sendMessage(sugg)
                          }}
                        >
                          {sugg}
                        </Button>
                      ))}
                    </div>
                  )}
                  {currentChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      
                      <div className={`max-w-2xl ${message.role === "user" ? "order-first" : ""}`}>
                        <Card className={`rounded-xl ${
                          message.role === "user" 
                            ? "bg-purple-700/70 border-purple-500/60" 
                            : "bg-gray-900 border-gray-700"
                        }`}>
                          <CardContent className="p-4">
                            <div className="prose prose-invert whitespace-pre-wrap text-sm text-white">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            <div className="mt-2 text-xs text-zinc-500">
                              {formatTime(message.timestamp)}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Inline Flows Panel below assistant messages */}
                  {searchIp && (
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-semibold text-white">Flows for {searchIp}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-400 hover:text-red-400"
                          onClick={() => { setSearchIp(''); setGraphData(null); setGraphError(null) }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex space-x-2 mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-white ${viewMode === 'text' ? 'bg-purple-600 border-purple-600 hover:bg-purple-700' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                          onClick={() => setViewMode('text')}
                        >
                          Text Flows
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-white ${viewMode === 'graph' ? 'bg-purple-600 border-purple-600 hover:bg-purple-700' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                          onClick={() => setViewMode('graph')}
                        >
                          Graph View
                        </Button>
                      </div>
                      {viewMode === 'text' ? (
                        <div className="overflow-y-auto h-48 p-2 bg-gray-900 rounded-lg">
                          {graphData?.links.map((link, idx) => (
                            <div key={idx} className="text-sm text-zinc-100 mb-1">
                              {link.source} → {link.target}{link.type ? ` (${link.type})` : ''}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-48 rounded-lg overflow-hidden">
                          <CustomNetworkGraph
                            graphData={graphData || { nodes: [], links: [] }}
                            searchIp={searchIp}
                            loading={graphLoading}
                            info={null}
                            error={graphError}
                            onClearSearch={() => { setSearchIp(''); setGraphData(null); setGraphError(null) }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {isLoading && (
                    <div className="flex gap-4 justify-start">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <Card className="rounded-xl bg-gray-900 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-xs text-zinc-400">AI is typing...</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-2xl space-y-6">
                {/* Assistant welcome bubble without icon */}
                <div className="w-full flex flex-col items-center mb-4 space-y-4">
                  <h2 className="text-2xl font-semibold text-white text-center">Hello, how can I help you today?</h2>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask CyberSense AI about security analysis, alerts, or any cybersecurity questions..."
                    className="w-full rounded-full bg-gray-800 border-gray-600 text-white placeholder-zinc-400 focus:border-purple-400 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>
                {/* Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    "Show me all network flows from IP 10.138.18.34.",
                    "Does this IP appear in honeypot logs?",
                    "Compare this traffic to known malicious patterns.",
                    "Which IPs are communicating with 10.183.13.66?",
                    "Is this flow suspicious based on packet size or flag usage?",
                    "List all endpoints connected to this subnet.",
                  ].slice(0,3).map((sugg) => (
                    <Button
                      key={sugg}
                      variant="outline"
                      className="rounded-lg w-full justify-start bg-gray-900 border-gray-700 text-zinc-300 hover:bg-purple-900/40 text-left whitespace-normal break-words text-xs leading-tight"
                      onClick={() => sendMessage(sugg)}
                    >
                      {sugg}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Persistent Input Area: only show when a chat is open */}
      {currentChat && (
        <div className="fixed bottom-0 left-80 right-0 p-4 z-50">
          <div className="max-w-4xl mx-auto">
            {error && <div className="mb-2 text-sm text-red-500">{error}</div>}
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask CyberSense AI about security analysis, alerts, or any cybersecurity questions..."
                className="flex-1 rounded-lg bg-gray-800 border-gray-600 text-white placeholder-zinc-400 focus:border-purple-400"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 