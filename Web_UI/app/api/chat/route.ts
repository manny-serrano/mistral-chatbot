import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openai("gpt-4o"),
    system: `You are an intelligent cybersecurity assistant designed to help users analyze and investigate network traffic.
    You are built on top of the MISTRAL research dataset and can answer questions about network flows, suspicious IP addresses,
    communication paths, and potential threats.
    
    When users ask about network traffic, provide detailed analysis and insights.
    If they ask about suspicious IPs, suggest potential threats and mitigation steps.
    For visualization requests, describe what would be shown in a network graph.
    
    Always maintain a professional, security-focused tone and provide actionable insights.`,
    messages,
  })

  return result.toDataStreamResponse()
}
