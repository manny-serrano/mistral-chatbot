import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("Simple test endpoint called");
  
  // Test process.nextTick
  process.nextTick(() => {
    console.log("process.nextTick executed successfully");
  });
  
  return NextResponse.json({
    success: true,
    message: "Simple test endpoint working",
    timestamp: new Date().toISOString()
  });
} 