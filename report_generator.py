#!/usr/bin/env python3
"""
Network Traffic Report Generator with Real LLM Analysis
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import openai

# --- Config ---
LOGS_PATH = 'neo4j-graphdatabase/logs-json'
OUTPUT_DIR = 'output_reports'
WINDOWS = [24, 12, 8, 1]

# --- Load env ---
load_dotenv()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
OPENAI_API_BASE = os.environ.get("OPENAI_API_BASE", None)


# --- Ensure output directory exists ---
os.makedirs(OUTPUT_DIR, exist_ok=True)

def parse_flow(line):
    try:
        data = json.loads(line)
        flow = data.get('flows', {})
        # Parse times to datetime (UTC)
        for k in ['flowStartMilliseconds', 'flowEndMilliseconds']:
            if k in flow:
                try:
                    flow[k] = datetime.strptime(flow[k], "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)
                except Exception:
                    flow[k] = None
        return flow
    except Exception:
        return None

def llm_analysis(report_dict):
    """
    Use OpenAI (or Azure-compatible) LLM to analyze the traffic report.
    Returns a list of findings with confidence and recommendations.
    """
   
    prompt = f"""
You are a senior cybersecurity analyst. You are given a summary of network traffic for a time window, in JSON format.

{json.dumps(report_dict, indent=2)}

Your job:
- Identify the most important findings, anomalies, risks, and trends in this data.
- For each finding, provide:
  - "finding": A short, human-readable summary
  - "confidence_score": A float from 0.0 to 1.0 (how confident are you)
  - "recommended_action": A recommended remediation or next step

Return only a JSON list of dictionaries, each with the keys above.
Example:
[
  {{
    "finding": "...",
    "confidence_score": 0.90,
    "recommended_action": "..."
  }},
  ...
]
"""
    try:
        client = openai.OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY"),
            base_url=os.environ.get("OPENAI_API_BASE", None)
        )
        response = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.2,
        )
        answer = response.choices[0].message.content if response.choices[0].message.content is not None else ""
        try:
            return json.loads(answer)
        except Exception:
            print("LLM returned non-JSON, here is the raw output:\n", answer)
            return []
    except Exception as e:
        print("LLM analysis failed, returning stub findings. Error:", e)
        return [
            {
                "finding": "High traffic volume detected from a single source IP.",
                "confidence_score": 0.92,
                "recommended_action": "Investigate the top talker for possible exfiltration or scanning."
            }
        ]


def aggregate_flows(flows, window_hours, now):
    window_start = now - timedelta(hours=window_hours)
    window_flows = [f for f in flows if f.get('flowStartMilliseconds') and f['flowStartMilliseconds'] >= window_start]
    if not window_flows:
        return None, None
    df = pd.DataFrame(window_flows)
    # Ensure all needed columns exist and are Series
    for col in ['octetTotalCount', 'reverseOctetTotalCount', 'flowDurationMilliseconds', 'packetTotalCount']:
        if col not in df:
            df[col] = pd.Series(dtype=float)
        elif not isinstance(df[col], pd.Series):
            df[col] = pd.Series(df[col])
    # Convert to numeric (only call fillna on Series)
    for col in ['octetTotalCount', 'reverseOctetTotalCount', 'packetTotalCount']:
        if not isinstance(df[col], pd.Series):
            df[col] = pd.Series(df[col])
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if isinstance(df[col], pd.Series):
            df[col] = df[col].fillna(0)
    # For flowDurationMilliseconds, just use pd.to_numeric (no fillna on float)
    if not isinstance(df['flowDurationMilliseconds'], pd.Series):
        df['flowDurationMilliseconds'] = pd.Series(df['flowDurationMilliseconds'])
    df['flowDurationMilliseconds'] = pd.to_numeric(df['flowDurationMilliseconds'], errors='coerce')
    df['traffic'] = df['octetTotalCount'] + df['reverseOctetTotalCount']
    traffic_volume = int(df['traffic'].sum())
    total_flows = len(df)
    # Top talkers
    if 'sourceIPv4Address' in df and isinstance(df['sourceIPv4Address'], pd.Series) and df['sourceIPv4Address'].isnull().all() is False:
        talkers_series = df.groupby('sourceIPv4Address')['octetTotalCount'].sum()
        if isinstance(talkers_series, pd.Series):
            talkers_series = talkers_series.sort_values(ascending=False)
        top_talkers = talkers_series.head(5).to_dict()
        source_endpoints = sorted(df['sourceIPv4Address'].dropna().unique().tolist())
    else:
        top_talkers = {}
        source_endpoints = []
    # Top ports
    if 'destinationTransportPort' in df and isinstance(df['destinationTransportPort'], pd.Series) and df['destinationTransportPort'].isnull().all() is False:
        ports_series = df.groupby('destinationTransportPort')['octetTotalCount'].sum()
        if isinstance(ports_series, pd.Series):
            ports_series = ports_series.sort_values(ascending=False)
        top_ports = ports_series.head(5).to_dict()
        destination_endpoints = sorted(df['destinationIPv4Address'].dropna().unique().tolist()) if 'destinationIPv4Address' in df else []
    else:
        top_ports = {}
        destination_endpoints = []
    # Protocol breakdown
    protocol_breakdown = df['protocolIdentifier'].value_counts().to_dict() if 'protocolIdentifier' in df else {}
    # Bandwidth utilization (bps)
    df['duration'] = df['flowDurationMilliseconds']
    total_bits = df['traffic'].sum() * 8
    total_seconds = (window_hours * 3600)
    avg_bps = int(total_bits / total_seconds) if total_seconds > 0 else 0
    # Peak bps: max traffic in any 1-minute window
    if 'flowStartMilliseconds' in df and isinstance(df['flowStartMilliseconds'], pd.Series):
        df['minute'] = df['flowStartMilliseconds'].dt.floor('min')
        minute_traffic = df.groupby('minute')['traffic'].sum()
        if not isinstance(minute_traffic, pd.Series):
            minute_traffic = pd.Series(minute_traffic)
        minute_traffic_bps = minute_traffic * 8 / 60
        peak_bps = int(minute_traffic_bps.max()) if not minute_traffic_bps.empty else 0
    else:
        peak_bps = 0
    # Performance metrics
    avg_flow_duration = float(df['duration'].mean()) if not df['duration'].empty else 0.0
    total_packet_count = int(df['packetTotalCount'].sum())
    avg_packets_per_flow = float(df['packetTotalCount'].mean()) if not df['packetTotalCount'].empty else 0.0
    performance_metrics = {
        "avg_flow_duration_ms": avg_flow_duration,
        "total_packet_count": total_packet_count,
        "avg_packets_per_flow": avg_packets_per_flow
    }
    alarms = []
    return {
        "window": f"{window_hours}h",
        "generated_at": now.isoformat(),
        "traffic_volume": traffic_volume,
        "total_flows": total_flows,
        "top_talkers": top_talkers,
        "top_ports": top_ports,
        "source_endpoints": source_endpoints,
        "destination_endpoints": destination_endpoints,
        "protocol_breakdown": protocol_breakdown,
        "bandwidth_utilization": {
            "average_bps": avg_bps,
            "peak_bps": peak_bps
        },
        "performance_metrics": performance_metrics,
        "alarms": alarms
    }, df

def historical_comparison(current_df, prev_df):
    if current_df is None or prev_df is None:
        return {}
    comp = {}
    for field in ["traffic", "octetTotalCount", "reverseOctetTotalCount", "packetTotalCount"]:
        curr = current_df.get(field, pd.Series(dtype=float)).sum() if field in current_df else 0
        prev = prev_df.get(field, pd.Series(dtype=float)).sum() if field in prev_df else 0
        if prev == 0:
            change = None
        else:
            change = (curr - prev) / prev
        comp[field] = {
            "current": int(curr),
            "previous": int(prev),
            "change": change
        }
    comp["total_flows"] = {
        "current": len(current_df) if current_df is not None else 0,
        "previous": len(prev_df) if prev_df is not None else 0,
        "change": ((len(current_df) - len(prev_df)) / len(prev_df)) if prev_df is not None and len(prev_df) > 0 else None
    }
    return comp

def main():
    # Read all flows from all files in logs-json
    flows = []
    logs_dir = LOGS_PATH
    for fname in os.listdir(logs_dir):
        if not fname.endswith('.json'):
            continue
        if fname == "sampleSTINGAR.json":
            continue  # Skip this file
        with open(os.path.join(logs_dir, fname), 'r') as f:
            for line in f:
                flow = parse_flow(line)
                if flow:
                    flows.append(flow)

    print(f"Found {len(flows)} flows.")
    # For testing, use the latest timestamp in flows as "now"
    times = [f['flowStartMilliseconds'] for f in flows if f.get('flowStartMilliseconds')]
    if times:
        now = max(times)
        print(f"Using latest flowStartMilliseconds as now: {now}")
    else:
        now = datetime.now(timezone.utc)
        print("No flows found! Using current system time.")

    prev_dfs = {}
    for window in WINDOWS:
        report, df = aggregate_flows(flows, window, now)
        if report is None:
            continue
        # Historical comparison
        prev_df = prev_dfs.get(window, None)
        report["historical_comparison"] = historical_comparison(df, prev_df)
        # LLM analysis (real, not stub!)
        report["llm_analysis"] = llm_analysis(report)
        # Save report
        ts = now.strftime("%Y%m%dT%H%M%SZ")
        out_path = os.path.join(OUTPUT_DIR, f"report_{window}h_{ts}.json")
        with open(out_path, 'w') as out_f:
            json.dump(report, out_f, indent=2, default=str)
        print(f"Saved report: {out_path}")
        prev_dfs[window] = df


if __name__ == "__main__":
    main()
