"use client"

import { useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send } from "lucide-react"

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <Card className="flex h-full flex-col bg-zinc-950 border-zinc-800">
      <CardHeader className="border-b border-zinc-800 px-4 py-3">
        <CardTitle className="text-lg font-medium">Network Traffic Analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 py-12">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Bot className="h-8 w-8 text-purple-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">CyberSense AI Assistant</h3>
                <p className="text-sm text-zinc-400 max-w-md">
                  Ask me about network traffic, suspicious IPs, or potential threats. I can analyze patterns and suggest
                  mitigation steps.
                </p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() =>
                    handleInputChange({ target: { value: "Identify suspicious IPs in today's traffic" } } as any)
                  }
                >
                  Identify suspicious IPs in today's traffic
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() =>
                    handleInputChange({
                      target: { value: "Show me the communication path for IP 192.168.1.100" },
                    } as any)
                  }
                >
                  Show me the communication path for IP 192.168.1.100
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() =>
                    handleInputChange({ target: { value: "What are the most common attack patterns today?" } } as any)
                  }
                >
                  What are the most common attack patterns today?
                </Button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
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
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <div key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-zinc-700">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="border-t border-zinc-800 p-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="Ask about network traffic or potential threats..."
            value={input}
            onChange={handleInputChange}
            className="flex-1 bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500"
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
