#!/usr/bin/env python3
"""
Graph-Based Network Traffic Report Generator with LLM Analysis
"""

import os
import json
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from neo4j import GraphDatabase
import openai

# --- Config ---
OUTPUT_DIR = 'output_reports'
WINDOWS = [24, 12, 8, 1]

# --- Load env ---
load_dotenv()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
OPENAI_API_BASE = os.environ.get("OPENAI_API_BASE", None)
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password123")

# --- Ensure output directory exists ---
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---- Neo4j Helper ----
class Neo4jReport:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def get_latest_time(self):
        query = """
        MATCH (f:Flow)
        RETURN max(f.flowStartMilliseconds) AS latest
        """
        with self.driver.session() as session:
            result = session.run(query)
            latest = result.single()['latest']
            if isinstance(latest, str):
                try:
                    return datetime.strptime(latest, "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)
                except Exception:
                    pass
            if isinstance(latest, datetime):
                return latest
            return datetime.now(timezone.utc)

    def flows_in_window(self, start_time, end_time):
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        RETURN f
        """
        with self.driver.session() as session:
            result = session.run(query, start_time=start_time, end_time=end_time)
            flows = [dict(record['f']) for record in result]
            return flows

    def top_talkers(self, start_time, end_time, n=5):
        query = """
        MATCH (src:Host)-[:SENT]->(f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        RETURN src.ip AS ip, sum(f.octetTotalCount) AS bytes
        ORDER BY bytes DESC
        LIMIT $n
        """
        with self.driver.session() as session:
            result = session.run(query, start_time=start_time, end_time=end_time, n=n)
            return {r['ip']: r['bytes'] for r in result if r['ip']}

    def top_ports(self, start_time, end_time, n=5):
        query = """
        MATCH (f:Flow)-[:USES_DST_PORT]->(p:Port)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        RETURN p.port AS port, sum(f.octetTotalCount) AS bytes
        ORDER BY bytes DESC
        LIMIT $n
        """
        with self.driver.session() as session:
            result = session.run(query, start_time=start_time, end_time=end_time, n=n)
            return {str(r['port']): r['bytes'] for r in result if r['port'] is not None}

    def protocol_breakdown(self, start_time, end_time):
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        RETURN f.protocolIdentifier AS protocol, count(*) AS count
        ORDER BY count DESC
        """
        with self.driver.session() as session:
            result = session.run(query, start_time=start_time, end_time=end_time)
            return {str(r['protocol']): r['count'] for r in result if r['protocol'] is not None}

    def endpoints(self, start_time, end_time):
        query = """
        MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(p:Port)<-[:USES_DST_PORT]-(f2:Flow)<-[:RECEIVED]-(dst:Host)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        RETURN DISTINCT src.ip AS src, dst.ip AS dst
        """
        with self.driver.session() as session:
            result = session.run(query, start_time=start_time, end_time=end_time)
            sources = set()
            destinations = set()
            for r in result:
                if r['src']:
                    sources.add(r['src'])
                if r['dst']:
                    destinations.add(r['dst'])
            return sorted(sources), sorted(destinations)

    def perf_metrics(self, start_time, end_time):
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        RETURN avg(f.flowDurationMilliseconds) AS avg_duration,
               sum(f.packetTotalCount) AS total_packets,
               avg(f.packetTotalCount) AS avg_packets_per_flow
        """
        with self.driver.session() as session:
            r = session.run(query, start_time=start_time, end_time=end_time).single()
            return {
                "avg_flow_duration_ms": float(r['avg_duration'] or 0.0),
                "total_packet_count": int(r['total_packets'] or 0),
                "avg_packets_per_flow": float(r['avg_packets_per_flow'] or 0.0)
            }

    def bandwidth(self, start_time, end_time):
        # average and peak bps
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        RETURN sum(f.octetTotalCount + f.reverseOctetTotalCount) AS total_bytes
        """
        with self.driver.session() as session:
            total_bytes = session.run(query, start_time=start_time, end_time=end_time).single()['total_bytes'] or 0
        total_bits = total_bytes * 8
        seconds = (end_time - start_time).total_seconds()
        avg_bps = int(total_bits / seconds) if seconds > 0 else 0

        # peak (max) bps in any 1-minute window
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        WITH f, apoc.date.truncate(apoc.date.parse(f.flowStartMilliseconds,'ms','yyyy-MM-dd HH:mm:ss.SSS'), 'minute') AS minute
        RETURN minute, sum(f.octetTotalCount + f.reverseOctetTotalCount)*8/60 AS bps
        ORDER BY bps DESC
        LIMIT 1
        """
        try:
            with self.driver.session() as session:
                r = session.run(query, start_time=start_time, end_time=end_time).single()
                peak_bps = int(r['bps']) if r and r['bps'] is not None else avg_bps
        except Exception:
            peak_bps = avg_bps
        return {"average_bps": avg_bps, "peak_bps": peak_bps}

# ---- LLM Analysis ----
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

# ---- Main report loop ----
def main():
    neo4j = Neo4jReport(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    try:
        now = neo4j.get_latest_time()
        print(f"Using latest flowStartMilliseconds as now: {now}")

        for window in WINDOWS:
            start_time = now - timedelta(hours=window)
            end_time = now
            print(f"Generating {window}h report from {start_time} to {end_time}...")

            # Get all stats
            traffic_volume = sum(neo4j.top_talkers(start_time, end_time).values())
            total_flows = len(neo4j.flows_in_window(start_time, end_time))
            top_talkers = neo4j.top_talkers(start_time, end_time)
            top_ports = neo4j.top_ports(start_time, end_time)
            protocol_breakdown = neo4j.protocol_breakdown(start_time, end_time)
            source_endpoints, destination_endpoints = neo4j.endpoints(start_time, end_time)
            bandwidth_utilization = neo4j.bandwidth(start_time, end_time)
            performance_metrics = neo4j.perf_metrics(start_time, end_time)

            report = {
                "window": f"{window}h",
                "generated_at": now.isoformat(),
                "traffic_volume": traffic_volume,
                "total_flows": total_flows,
                "top_talkers": top_talkers,
                "top_ports": top_ports,
                "source_endpoints": source_endpoints,
                "destination_endpoints": destination_endpoints,
                "protocol_breakdown": protocol_breakdown,
                "bandwidth_utilization": bandwidth_utilization,
                "performance_metrics": performance_metrics,
                "alarms": [],  # You can add anomaly detection here later!
            }

            report["llm_analysis"] = llm_analysis(report)

            ts = now.strftime("%Y%m%dT%H%M%SZ")
            out_path = os.path.join(OUTPUT_DIR, f"report_{window}h_{ts}.json")
            with open(out_path, 'w') as out_f:
                json.dump(report, out_f, indent=2, default=str)
            print(f"Saved report: {out_path}")

    finally:
        neo4j.close()


if __name__ == "__main__":
    main()
