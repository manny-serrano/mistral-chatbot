import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const PROJECT_ROOT = path.join(process.cwd(), "..");
const REPORT_GENERATOR_SCRIPT = path.join(PROJECT_ROOT, "report_generator.py");

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    conditions: {
      PROJECT_ROOT,
      REPORT_GENERATOR_SCRIPT,
      scriptExists: fs.existsSync(REPORT_GENERATOR_SCRIPT),
      NODE_ENV: process.env.NODE_ENV,
      shouldUseSimulation: !(fs.existsSync(REPORT_GENERATOR_SCRIPT) && process.env.NODE_ENV === 'production'),
      simulationCondition: `!(${fs.existsSync(REPORT_GENERATOR_SCRIPT)} && ${process.env.NODE_ENV === 'production'})`
    }
  });
} 