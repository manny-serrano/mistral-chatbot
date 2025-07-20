import { NextRequest, NextResponse } from "next/server";

// Store logs in memory for debugging
const logs: string[] = [];

export function addDebugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  logs.push(logEntry);
  console.log(logEntry);
  
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs.shift();
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    logs: logs.slice(-20), // Return last 20 logs
    totalLogs: logs.length
  });
}

export async function DELETE(request: NextRequest) {
  logs.length = 0;
  return NextResponse.json({
    success: true,
    message: 'Logs cleared'
  });
} 