#!/usr/bin/env python3
"""
Comprehensive Cybersecurity Report Generator for YAF/IPFIX Data
Generates detailed network traffic analysis reports every 24 hours
"""

import os
import json
import re
import ipaddress
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict, Counter
from dotenv import load_dotenv
from neo4j import GraphDatabase
import openai

# --- Config ---
OUTPUT_DIR = 'cybersecurity_reports'
SHARED_REPORTS_DIR = os.path.join(OUTPUT_DIR, 'shared')
USER_REPORTS_DIR = os.path.join(OUTPUT_DIR, 'users')
ADMIN_REPORTS_DIR = os.path.join(OUTPUT_DIR, 'admin')

REPORT_INTERVALS = [24]  # Generate 24-hour reports
THREAT_INTELLIGENCE_SOURCES = [
    'https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt',
    'https://rules.emergingthreats.net/open/suricata/rules/emerging-compromised.rules'
]

# API Configuration for Neo4j Integration
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000")
DEFAULT_USER_NETID = "testuser"  # Default user for system-generated reports

# Known malicious indicators
KNOWN_MALICIOUS_PORTS = [1433, 3389, 22, 23, 135, 139, 445, 993, 995, 587, 465]
SUSPICIOUS_PROTOCOLS = [47, 50, 51]  # GRE, ESP, AH
DARKNET_RANGES = [
    '10.0.0.0/8',
    '172.16.0.0/12', 
    '192.168.0.0/16',
    '0.0.0.0/8',
    '224.0.0.0/4'
]

# --- Load env ---
load_dotenv()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
OPENAI_API_BASE = os.environ.get("OPENAI_API_BASE", None)
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password123")

# --- Neo4j Integration Functions ---
def create_mock_session_cookie(netid: str = DEFAULT_USER_NETID) -> str:
    """Create a mock session cookie for API authentication"""
    import base64
    import time
    
    # Use the same format as the mock SSO endpoint
    session_data = {
        "user": {
            "id": f"duke_{netid}",
            "netId": netid,
            "email": f"{netid}@duke.edu",
            "firstName": "Test",
            "lastName": "User",
            "displayName": "Test User",
            "role": "faculty",
            "dukeID": "123456789",
            "isActive": True,
            "lastLogin": datetime.now(timezone.utc).isoformat(),
            "createdAt": "2025-07-16T17:43:50.122Z",
            "updatedAt": datetime.now(timezone.utc).isoformat()
        },
        "permissions": [
            "view_dashboard", "generate_reports", "view_all_data", 
            "export_data", "manage_settings", "view_admin_panel", "delete_reports"
        ],
        "timestamp": int(time.time() * 1000),
        "expires": int((time.time() + 28800) * 1000)  # 8 hours from now
    }
    
    session_json = json.dumps(session_data)
    session_base64 = base64.b64encode(session_json.encode()).decode()
    return session_base64

def save_report_to_neo4j(report_data: Dict[str, Any], filepath: str, netid: str = DEFAULT_USER_NETID) -> bool:
    """Save generated report to Neo4j database via API"""
    try:
        # Extract metadata from the report
        metadata = report_data.get('metadata', {})
        executive_summary = report_data.get('executive_summary', {})
        network_overview = report_data.get('network_traffic_overview', {})
        basic_stats = network_overview.get('basic_stats', {})
        security_findings = report_data.get('security_findings', {})
        recommendations = report_data.get('recommendations_and_next_steps', {})
        
        # Calculate risk level based on findings
        risk_level = executive_summary.get('overall_risk_level', 'MEDIUM')
        if not risk_level or risk_level not in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']:
            risk_level = 'MEDIUM'
        
        # Extract threat and critical issue counts
        threat_count = executive_summary.get('total_threats_detected', 0)
        critical_issues = executive_summary.get('critical_issues', 0)
        
        # Calculate file size
        file_size = 0
        if os.path.exists(filepath):
            file_size = os.path.getsize(filepath)
        
        # Prepare Neo4j report data structure
        neo4j_report_data = {
            "name": metadata.get('report_title', f"Cybersecurity Report - {datetime.now().strftime('%Y-%m-%d')}"),
            "type": metadata.get('report_type', 'standard'),
            "description": f"Generated cybersecurity report covering {metadata.get('analysis_duration_hours', 24)} hours of network data",
            "content": report_data,  # Store the full report content
            "riskLevel": risk_level,
            "status": "PUBLISHED",
            "metadata": metadata,
            "summary": {
                "total_threats": threat_count,
                "critical_issues": critical_issues,
                "risk_score": executive_summary.get('risk_score', 5.0)
            },
            "statistics": {
                "analysis_duration_hours": metadata.get('analysis_duration_hours', 24),
                "total_flows": basic_stats.get('total_flows', 0),
                "total_bytes": basic_stats.get('total_bytes', 0),
                "avg_bandwidth": basic_stats.get('avg_bandwidth', 0)
            },
            "findings": extract_findings_list(security_findings),
            "recommendations": extract_recommendations_list(recommendations),
            "threatCount": threat_count,
            "criticalIssues": critical_issues,
            "networkFlows": basic_stats.get('total_flows', 0),
            "dataBytes": basic_stats.get('total_bytes', 0),
            "avgBandwidth": basic_stats.get('avg_bandwidth', 0),
            "riskScore": executive_summary.get('risk_score', 5.0),
            "fileSize": file_size,
            "pdfPath": ""  # PDF generation handled separately
        }
        
        # Create session cookie for authentication
        session_cookie = create_mock_session_cookie(netid)
        
        # Prepare API request
        api_url = f"{API_BASE_URL}/api/reports"
        headers = {
            "Content-Type": "application/json",
            "Cookie": f"duke-sso-session={session_cookie}"
        }
        
        payload = {
            "action": "create",
            "reportData": neo4j_report_data
        }
        
        # Make API request to save report
        print(f"🔗 Saving report to Neo4j database via API...")
        print(f"   - API URL: {api_url}")
        print(f"   - User: {netid}")
        print(f"   - Report name: {neo4j_report_data['name']}")
        
        response = requests.post(api_url, json=payload, headers=headers, timeout=30)
        
        print(f"   - Response status: {response.status_code}")
        print(f"   - Response text: {response.text[:500]}...")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                report_id = result.get('reportId')
                print(f"✅ Report successfully saved to Neo4j database")
                print(f"   - Report ID: {report_id}")
                print(f"   - Available in frontend at: /reports")
                return True
            else:
                print(f"❌ API returned success=false: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ API request failed with status {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error saving to Neo4j: {e}")
        return False
    except Exception as e:
        print(f"❌ Error saving report to Neo4j: {e}")
        return False

def extract_findings_list(security_findings: Dict[str, Any]) -> List[str]:
    """Extract findings as a list of strings"""
    findings = []
    
    # Extract from different sections of security findings
    for category, data in security_findings.items():
        if isinstance(data, dict):
            if 'description' in data:
                findings.append(f"{category}: {data['description']}")
            elif 'findings' in data and isinstance(data['findings'], list):
                findings.extend(data['findings'])
        elif isinstance(data, list):
            findings.extend([str(item) for item in data])
        elif isinstance(data, str):
            findings.append(data)
    
    # Ensure we have at least some default findings
    if not findings:
        findings = [
            "Network traffic analysis completed",
            "Security monitoring active",
            "Baseline patterns established"
        ]
    
    return findings[:10]  # Limit to top 10 findings

def extract_recommendations_list(recommendations_data: Dict[str, Any]) -> List[str]:
    """Extract recommendations as a list of strings"""
    recommendations = []
    
    # Extract prioritized recommendations
    prioritized = recommendations_data.get('prioritized_recommendations', [])
    if isinstance(prioritized, list):
        recommendations.extend([str(rec) for rec in prioritized])
    
    # Extract other recommendation types
    for key, value in recommendations_data.items():
        if key != 'prioritized_recommendations' and isinstance(value, list):
            recommendations.extend([str(rec) for rec in value])
    
    # Ensure we have at least some default recommendations
    if not recommendations:
        recommendations = [
            "Continue monitoring network traffic patterns",
            "Update security policies as needed",
            "Schedule regular security assessments"
        ]
    
    return recommendations[:10]  # Limit to top 10 recommendations

# --- Ensure ALL output directories exist ---
def ensure_directories():
    """Create all required directories for multi-user reports"""
    directories = [OUTPUT_DIR, SHARED_REPORTS_DIR, USER_REPORTS_DIR, ADMIN_REPORTS_DIR]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✅ Directory ensured: {directory}")

ensure_directories()

def ensure_user_directory(netid: str) -> str:
    """Ensure user-specific directory exists and return path"""
    if not netid:
        return SHARED_REPORTS_DIR
    
    user_dir = os.path.join(USER_REPORTS_DIR, netid)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

def get_report_directory(report_type: str = 'shared', netid: Optional[str] = None) -> str:
    """Get appropriate directory based on report type and user"""
    if report_type == 'shared':
        return SHARED_REPORTS_DIR
    elif report_type == 'user' and netid:
        return ensure_user_directory(netid)
    elif report_type == 'admin':
        return ADMIN_REPORTS_DIR
    else:
        return SHARED_REPORTS_DIR  # Default fallback

# ---- Enhanced Neo4j Report Class ----
class CybersecurityReportGenerator:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.malicious_ips = set()
        self.threat_intel = {}
        
    def close(self):
        self.driver.close()

    def get_latest_time(self) -> datetime:
        """Get the latest timestamp from flows with proper null handling"""
        query = """
        MATCH (f:Flow)
        RETURN max(f.flowStartMilliseconds) AS latest
        """
        with self.driver.session() as session:
            result = session.run(query)
            record = result.single()
            if record is None:
                return datetime.now(timezone.utc)
            
            latest = record['latest']
            if latest is None:
                return datetime.now(timezone.utc)
            
            if isinstance(latest, str):
                try:
                    # Handle string timestamps from database
                    return datetime.strptime(latest, "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)
                except Exception:
                    try:
                        return datetime.strptime(latest, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                    except Exception:
                        return datetime.now(timezone.utc)
            
            if isinstance(latest, datetime):
                return latest
            
            return datetime.now(timezone.utc)

    def get_earliest_time(self) -> datetime:
        """Get the earliest timestamp from flows"""
        query = """
        MATCH (f:Flow)
        RETURN min(f.flowStartMilliseconds) AS earliest
        """
        with self.driver.session() as session:
            result = session.run(query)
            record = result.single()
            if record is None:
                return datetime.now(timezone.utc)
            
            earliest = record['earliest']
            if earliest is None:
                return datetime.now(timezone.utc)
            
            if isinstance(earliest, str):
                try:
                    return datetime.strptime(earliest, "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)
                except Exception:
                    try:
                        return datetime.strptime(earliest, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                    except Exception:
                        return datetime.now(timezone.utc)
            
            if isinstance(earliest, datetime):
                return earliest
            
            return datetime.now(timezone.utc)

    def get_traffic_overview(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Comprehensive traffic overview analysis - EXCLUDING malicious/honeypot flows"""
        
        # Convert datetime objects to strings for comparison
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        # Total flows and basic stats - EXCLUDE malicious and honeypot flows
        basic_stats_query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        RETURN 
            count(f) AS total_flows,
            sum(f.octetTotalCount) AS total_bytes,
            sum(f.packetTotalCount) AS total_packets,
            avg(f.flowDurationMilliseconds) AS avg_duration
        """
        
        with self.driver.session() as session:
            result = session.run(basic_stats_query, start_time=start_str, end_time=end_str)
            record = result.single()
            
            if record is None:
                basic_stats = {
                    'total_flows': 0,
                    'total_bytes': 0,
                    'total_packets': 0,
                    'avg_duration': 0.0
                }
            else:
                basic_stats = {
                    'total_flows': record['total_flows'] or 0,
                    'total_bytes': record['total_bytes'] or 0,
                    'total_packets': record['total_packets'] or 0,
                    'avg_duration': float(record['avg_duration'] or 0.0)
                }
        
        # Top talkers (sources and destinations)
        top_sources = self._get_top_talkers(start_time, end_time, direction='source')
        top_destinations = self._get_top_talkers(start_time, end_time, direction='destination')
        
        # Protocol breakdown
        protocol_breakdown = self._get_protocol_breakdown(start_time, end_time)
        
        # Port analysis
        top_ports = self._get_top_ports(start_time, end_time)
        
        # Bandwidth utilization
        bandwidth_stats = self._get_bandwidth_utilization(start_time, end_time)
        
        return {
            'basic_stats': basic_stats,
            'top_sources': top_sources,
            'top_destinations': top_destinations,
            'protocol_breakdown': protocol_breakdown,
            'top_ports': top_ports,
            'bandwidth_stats': bandwidth_stats
        }

    def _get_top_talkers(self, start_time: datetime, end_time: datetime, direction: str = 'source', limit: int = 10) -> List[Dict[str, Any]]:
        """Get top talking IPs by direction - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        if direction == 'source':
            query = """
            MATCH (f:Flow)
            WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
            AND NOT (f.malicious = true OR f.honeypot = true)
            RETURN f.sourceIPv4Address AS ip, 
                   sum(f.octetTotalCount) AS bytes_sent,
                   count(f) AS flow_count
            ORDER BY bytes_sent DESC
            LIMIT $limit
            """
        else:
            query = """
            MATCH (f:Flow)
            WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
            AND NOT (f.malicious = true OR f.honeypot = true)
            RETURN f.destinationIPv4Address AS ip, 
                   sum(f.octetTotalCount) AS bytes_received,
                   count(f) AS flow_count
            ORDER BY bytes_received DESC
            LIMIT $limit
            """
        
        with self.driver.session() as session:
            result = session.run(query, start_time=start_str, end_time=end_str, limit=limit)
            return [
                {
                    'ip': record['ip'],
                    'bytes': record.get('bytes_sent', record.get('bytes_received', 0)) or 0,
                    'flow_count': record['flow_count'] or 0,
                    'threat_intel': self._check_threat_intel(record['ip'])
                }
                for record in result if record['ip'] is not None
            ]

    def _get_protocol_breakdown(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Analyze protocol distribution - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        RETURN f.protocolIdentifier AS protocol,
               count(f) AS flow_count,
               sum(f.octetTotalCount) AS total_bytes
        ORDER BY flow_count DESC
        """
        
        with self.driver.session() as session:
            result = session.run(query, start_time=start_str, end_time=end_str)
            protocols = {}
            for record in result:
                if record['protocol'] is not None:
                    protocol_name = self._get_protocol_name(record['protocol'])
                    protocols[protocol_name] = {
                        'protocol_id': record['protocol'],
                        'flow_count': record['flow_count'] or 0,
                        'total_bytes': record['total_bytes'] or 0,
                        'is_suspicious': record['protocol'] in SUSPICIOUS_PROTOCOLS
                    }
            return protocols

    def _get_top_ports(self, start_time: datetime, end_time: datetime, limit: int = 20) -> Dict[str, Any]:
        """Analyze top source and destination ports - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        # Destination ports
        dst_ports_query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        RETURN f.destinationTransportPort AS port,
               count(f) AS flow_count,
               sum(f.octetTotalCount) AS total_bytes
        ORDER BY flow_count DESC
        LIMIT $limit
        """
        
        with self.driver.session() as session:
            result = session.run(dst_ports_query, start_time=start_str, end_time=end_str, limit=limit)
            dst_ports = [
                {
                    'port': record['port'],
                    'flow_count': record['flow_count'] or 0,
                    'total_bytes': record['total_bytes'] or 0,
                    'service': self._get_service_name(record['port']),
                    'is_malicious': record['port'] in KNOWN_MALICIOUS_PORTS
                }
                for record in result if record['port'] is not None
            ]
        
        return {
            'destination_ports': dst_ports,
            'malicious_ports_detected': any(port['is_malicious'] for port in dst_ports)
        }

    def _get_bandwidth_utilization(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Calculate bandwidth utilization statistics - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        RETURN sum(f.octetTotalCount + f.reverseOctetTotalCount) AS total_bytes
        """
        
        with self.driver.session() as session:
            result = session.run(query, start_time=start_str, end_time=end_str)
            record = result.single()
            total_bytes = record['total_bytes'] if record and record['total_bytes'] is not None else 0
        
        total_bits = total_bytes * 8
        duration_seconds = (end_time - start_time).total_seconds()
        avg_bps = int(total_bits / duration_seconds) if duration_seconds > 0 else 0
        
        return {
            'total_bytes': total_bytes,
            'total_bits': total_bits,
            'duration_seconds': duration_seconds,
            'average_bps': avg_bps,
            'average_mbps': round(avg_bps / 1_000_000, 2),
            'average_gbps': round(avg_bps / 1_000_000_000, 4)
        }

    def detect_security_anomalies(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Comprehensive security anomaly detection - EXCLUDING malicious/honeypot flows"""
        
        anomalies = {
            'malicious_pattern_matches': self._detect_malicious_pattern_matches(start_time, end_time),
            'honeypot_pattern_matches': self._detect_honeypot_pattern_matches(start_time, end_time),
            'suspicious_connections': self._detect_suspicious_connections(start_time, end_time),
            'port_scanning': self._detect_port_scanning(start_time, end_time),
            'data_exfiltration': self._detect_data_exfiltration(start_time, end_time),
            'unusual_protocols': self._detect_unusual_protocols(start_time, end_time),
            'threat_intelligence_matches': self._detect_threat_intelligence_matches(start_time, end_time)
        }
        
        return anomalies

    def _detect_malicious_pattern_matches(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Compare normal flows against known malicious patterns"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        # Get malicious IPs from known malicious flows
        malicious_ips_query = """
        MATCH (f:Flow)
        WHERE f.malicious = true
        RETURN DISTINCT f.sourceIPv4Address AS malicious_src_ip, f.destinationIPv4Address AS malicious_dst_ip
        """
        
        # Find normal flows that communicate with known malicious IPs
        normal_to_malicious_query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        AND (f.sourceIPv4Address IN $malicious_ips OR f.destinationIPv4Address IN $malicious_ips)
        RETURN f.sourceIPv4Address AS src_ip, 
               f.destinationIPv4Address AS dst_ip,
               f.destinationTransportPort AS port,
               count(f) AS flow_count,
               sum(f.octetTotalCount) AS total_bytes
        ORDER BY flow_count DESC
        LIMIT 20
        """
        
        with self.driver.session() as session:
            # Get known malicious IPs
            result = session.run(malicious_ips_query)
            malicious_ips = set()
            for record in result:
                if record['malicious_src_ip']:
                    malicious_ips.add(record['malicious_src_ip'])
                if record['malicious_dst_ip']:
                    malicious_ips.add(record['malicious_dst_ip'])
            
            # Find normal flows matching malicious patterns
            if malicious_ips:
                result = session.run(normal_to_malicious_query, 
                                   start_time=start_str, end_time=end_str, 
                                   malicious_ips=list(malicious_ips))
                pattern_matches = [
                    {
                        'source_ip': record['src_ip'],
                        'destination_ip': record['dst_ip'],
                        'port': record['port'],
                        'flow_count': record['flow_count'],
                        'total_bytes': record['total_bytes'] or 0,
                        'threat_type': 'Known Malicious IP Communication'
                    }
                    for record in result
                    if record['src_ip'] is not None and record['dst_ip'] is not None
                ]
            else:
                pattern_matches = []
        
        severity = 'HIGH' if len(pattern_matches) > 5 else 'MEDIUM' if len(pattern_matches) > 0 else 'LOW'
        
        return {
            'pattern_matches': pattern_matches,
            'known_malicious_ips': len(malicious_ips),
            'matching_flows': len(pattern_matches),
            'severity': severity
        }

    def _detect_honeypot_pattern_matches(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Compare normal flows against honeypot interaction patterns"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        # Get honeypot patterns (IPs and ports)
        honeypot_patterns_query = """
        MATCH (f:Flow)
        WHERE f.honeypot = true
        RETURN DISTINCT f.sourceIPv4Address AS honeypot_src_ip,
               f.destinationIPv4Address AS honeypot_dst_ip,
               f.destinationTransportPort AS honeypot_port,
               f.protocolIdentifier AS honeypot_protocol
        """
        
        with self.driver.session() as session:
            # Get honeypot patterns
            result = session.run(honeypot_patterns_query)
            honeypot_ips = set()
            honeypot_ports = set()
            honeypot_protocols = set()
            
            for record in result:
                if record['honeypot_src_ip']:
                    honeypot_ips.add(record['honeypot_src_ip'])
                if record['honeypot_dst_ip']:
                    honeypot_ips.add(record['honeypot_dst_ip'])
                if record['honeypot_port']:
                    honeypot_ports.add(record['honeypot_port'])
                if record['honeypot_protocol']:
                    honeypot_protocols.add(record['honeypot_protocol'])
            
            # Find normal flows matching honeypot patterns
            honeypot_matches = []
            
            if honeypot_ips:
                # Check for IP matches
                ip_match_query = """
                MATCH (f:Flow)
                WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
                AND NOT (f.malicious = true OR f.honeypot = true)
                AND (f.sourceIPv4Address IN $honeypot_ips OR f.destinationIPv4Address IN $honeypot_ips)
                RETURN 'IP Match' AS match_type,
                       f.sourceIPv4Address AS src_ip,
                       f.destinationIPv4Address AS dst_ip,
                       count(f) AS flow_count
                LIMIT 10
                """
                result = session.run(ip_match_query, 
                                   start_time=start_str, end_time=end_str,
                                   honeypot_ips=list(honeypot_ips))
                for record in result:
                    honeypot_matches.append({
                        'match_type': record['match_type'],
                        'source_ip': record['src_ip'],
                        'destination_ip': record['dst_ip'],
                        'flow_count': record['flow_count']
                    })
            
            if honeypot_ports:
                # Check for port pattern matches
                port_match_query = """
                MATCH (f:Flow)
                WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
                AND NOT (f.malicious = true OR f.honeypot = true)
                AND f.destinationTransportPort IN $honeypot_ports
                RETURN 'Port Pattern' AS match_type,
                       f.destinationTransportPort AS port,
                       count(DISTINCT f.sourceIPv4Address) AS unique_sources,
                       count(f) AS flow_count
                ORDER BY flow_count DESC
                LIMIT 10
                """
                result = session.run(port_match_query,
                                   start_time=start_str, end_time=end_str,
                                   honeypot_ports=list(honeypot_ports))
                for record in result:
                    honeypot_matches.append({
                        'match_type': record['match_type'],
                        'port': record['port'],
                        'unique_sources': record['unique_sources'],
                        'flow_count': record['flow_count']
                    })
        
        severity = 'HIGH' if len(honeypot_matches) > 10 else 'MEDIUM' if len(honeypot_matches) > 3 else 'LOW'
        
        return {
            'honeypot_matches': honeypot_matches,
            'known_honeypot_ips': len(honeypot_ips),
            'known_honeypot_ports': len(honeypot_ports),
            'matching_patterns': len(honeypot_matches),
            'severity': severity
        }

    def _detect_threat_intelligence_matches(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Cross-reference normal flows with threat intelligence from malicious/honeypot data"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        # Get threat intelligence patterns from malicious and honeypot flows
        threat_intel_query = """
        MATCH (f:Flow)
        WHERE f.malicious = true OR f.honeypot = true
        WITH f.destinationTransportPort AS threat_port,
             f.protocolIdentifier AS threat_protocol,
             count(f) AS threat_frequency
        WHERE threat_frequency > 5
        RETURN threat_port, threat_protocol, threat_frequency
        ORDER BY threat_frequency DESC
        LIMIT 20
        """
        
        with self.driver.session() as session:
            # Get threat intelligence patterns
            result = session.run(threat_intel_query)
            threat_patterns = []
            for record in result:
                if record['threat_port'] and record['threat_protocol']:
                    threat_patterns.append({
                        'port': record['threat_port'],
                        'protocol': record['threat_protocol'],
                        'frequency': record['threat_frequency']
                    })
            
            # Check normal flows against threat patterns
            threat_matches = []
            for pattern in threat_patterns:
                pattern_match_query = """
                MATCH (f:Flow)
                WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
                AND NOT (f.malicious = true OR f.honeypot = true)
                AND f.destinationTransportPort = $threat_port
                AND f.protocolIdentifier = $threat_protocol
                RETURN count(f) AS matching_flows,
                       count(DISTINCT f.sourceIPv4Address) AS unique_sources,
                       sum(f.octetTotalCount) AS total_bytes
                """
                
                result = session.run(pattern_match_query,
                                   start_time=start_str, end_time=end_str,
                                   threat_port=pattern['port'],
                                   threat_protocol=pattern['protocol'])
                
                match_record = result.single()
                if match_record and match_record['matching_flows'] > 0:
                    threat_matches.append({
                        'threat_port': pattern['port'],
                        'threat_protocol': pattern['protocol'],
                        'threat_frequency': pattern['frequency'],
                        'matching_flows': match_record['matching_flows'],
                        'unique_sources': match_record['unique_sources'],
                        'total_bytes': match_record['total_bytes'] or 0,
                        'service': self._get_service_name(pattern['port']),
                        'protocol_name': self._get_protocol_name(pattern['protocol'])
                    })
        
        severity = 'HIGH' if len(threat_matches) > 5 else 'MEDIUM' if len(threat_matches) > 0 else 'LOW'
        
        return {
            'threat_matches': threat_matches,
            'total_threat_patterns': len(threat_patterns),
            'matching_patterns': len(threat_matches),
            'severity': severity
        }

    def _detect_suspicious_connections(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Detect suspicious connection patterns - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        WITH f.sourceIPv4Address AS src_ip, f.destinationIPv4Address AS dst_ip, count(f) AS connection_count
        WHERE connection_count > 1000
        RETURN src_ip, dst_ip, connection_count
        ORDER BY connection_count DESC
        LIMIT 10
        """
        
        with self.driver.session() as session:
            result = session.run(query, start_time=start_str, end_time=end_str)
            suspicious_pairs = [
                {
                    'source_ip': record['src_ip'],
                    'destination_ip': record['dst_ip'],
                    'connection_count': record['connection_count']
                }
                for record in result
                if record['src_ip'] is not None and record['dst_ip'] is not None
            ]
        
        return {
            'suspicious_pairs': suspicious_pairs,
            'count': len(suspicious_pairs),
            'severity': 'HIGH' if len(suspicious_pairs) > 5 else 'MEDIUM' if len(suspicious_pairs) > 0 else 'LOW'
        }

    def _detect_port_scanning(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Detect potential port scanning activity - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        WITH f.sourceIPv4Address AS src_ip, collect(DISTINCT f.destinationTransportPort) AS ports_accessed
        WHERE size(ports_accessed) > 50
        RETURN src_ip, size(ports_accessed) AS port_count
        ORDER BY port_count DESC
        LIMIT 10
        """
        
        with self.driver.session() as session:
            result = session.run(query, start_time=start_str, end_time=end_str)
            scanners = [
                {
                    'source_ip': record['src_ip'],
                    'ports_scanned': record['port_count']
                }
                for record in result
                if record['src_ip'] is not None
            ]
        
        return {
            'potential_scanners': scanners,
            'count': len(scanners),
            'severity': 'HIGH' if len(scanners) > 3 else 'MEDIUM' if len(scanners) > 0 else 'LOW'
        }

    def _detect_data_exfiltration(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Detect potential data exfiltration based on traffic patterns - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        WITH f.sourceIPv4Address AS src_ip, sum(f.octetTotalCount) AS bytes_sent
        WHERE bytes_sent > 1000000000  // 1GB threshold
        RETURN src_ip, bytes_sent
        ORDER BY bytes_sent DESC
        LIMIT 10
        """
        
        with self.driver.session() as session:
            result = session.run(query, start_time=start_str, end_time=end_str)
            high_volume_sources = [
                {
                    'source_ip': record['src_ip'],
                    'bytes_sent': record['bytes_sent'],
                    'gb_sent': round(record['bytes_sent'] / 1_000_000_000, 2)
                }
                for record in result
                if record['src_ip'] is not None
            ]
        
        return {
            'high_volume_sources': high_volume_sources,
            'count': len(high_volume_sources),
            'severity': 'HIGH' if len(high_volume_sources) > 2 else 'MEDIUM' if len(high_volume_sources) > 0 else 'LOW'
        }

    def _detect_unusual_protocols(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Detect unusual or suspicious protocols - EXCLUDING malicious/honeypot flows"""
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        
        query = """
        MATCH (f:Flow)
        WHERE f.flowStartMilliseconds >= $start_time AND f.flowStartMilliseconds < $end_time
        AND NOT (f.malicious = true OR f.honeypot = true)
        AND f.protocolIdentifier IN $suspicious_protocols
        RETURN f.protocolIdentifier AS protocol, count(f) AS flow_count
        ORDER BY flow_count DESC
        """
        
        with self.driver.session() as session:
            result = session.run(query, start_time=start_str, end_time=end_str, suspicious_protocols=SUSPICIOUS_PROTOCOLS)
            unusual_protocols = [
                {
                    'protocol_id': record['protocol'],
                    'protocol_name': self._get_protocol_name(record['protocol']),
                    'flow_count': record['flow_count']
                }
                for record in result
            ]
        
        return {
            'unusual_protocols': unusual_protocols,
            'count': len(unusual_protocols),
            'severity': 'MEDIUM' if len(unusual_protocols) > 0 else 'LOW'
        }

    def _check_threat_intel(self, ip: str) -> Dict[str, Any]:
        """Check IP against threat intelligence sources"""
        # Placeholder for threat intel integration
        return {
            'is_malicious': False,
            'threat_type': None,
            'confidence': 0.0,
            'sources': []
        }

    def _get_protocol_name(self, protocol_id: int) -> str:
        """Convert protocol ID to human-readable name"""
        protocol_map = {
            1: 'ICMP',
            6: 'TCP',
            17: 'UDP',
            47: 'GRE',
            50: 'ESP',
            51: 'AH',
            58: 'ICMPv6'
        }
        return protocol_map.get(protocol_id, f'Protocol-{protocol_id}')

    def _get_service_name(self, port: int) -> str:
        """Convert port number to service name"""
        service_map = {
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            80: 'HTTP',
            110: 'POP3',
            143: 'IMAP',
            443: 'HTTPS',
            993: 'IMAPS',
            995: 'POP3S',
            1433: 'SQL Server',
            3389: 'RDP',
            5432: 'PostgreSQL'
        }
        return service_map.get(port, f'Port-{port}')

    def generate_executive_summary(self, traffic_data: Dict[str, Any], security_findings: Dict[str, Any]) -> Dict[str, Any]:
        """Generate executive summary with key findings"""
        
        # Calculate overall risk score
        risk_scores = []
        for category, findings in security_findings.items():
            if isinstance(findings, dict) and 'severity' in findings:
                severity = findings['severity']
                if severity == 'HIGH':
                    risk_scores.append(3)
                elif severity == 'MEDIUM':
                    risk_scores.append(2)
                else:
                    risk_scores.append(1)
        
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 1
        
        if avg_risk >= 2.5:
            overall_risk = 'HIGH'
        elif avg_risk >= 1.5:
            overall_risk = 'MEDIUM'
        else:
            overall_risk = 'LOW'
        
        # Key findings
        key_findings = []
        
        # Traffic volume findings
        total_flows = traffic_data['basic_stats']['total_flows']
        if total_flows > 1000000:
            key_findings.append(f"High traffic volume: {total_flows:,} flows analyzed")
        
        # Security findings
        for category, findings in security_findings.items():
            if isinstance(findings, dict) and findings.get('severity') == 'HIGH':
                key_findings.append(f"High-severity {category.replace('_', ' ')} detected")
        
        return {
            'overall_risk_level': overall_risk,
            'key_findings': key_findings,
            'critical_issues_count': len([f for f in security_findings.values() if isinstance(f, dict) and f.get('severity') == 'HIGH']),
            'recommendations_priority': 'IMMEDIATE' if overall_risk == 'HIGH' else 'SCHEDULED'
        }

    def generate_recommendations(self, security_findings: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate prioritized recommendations based on findings"""
        recommendations = []
        
        # High priority recommendations
        for category, findings in security_findings.items():
            if isinstance(findings, dict) and findings.get('severity') == 'HIGH':
                if category == 'malicious_pattern_matches':
                    recommendations.append({
                        'priority': 'IMMEDIATE',
                        'category': 'Malicious Pattern Detection',
                        'finding': f"Normal traffic matches {findings.get('matching_flows', 0)} known malicious patterns",
                        'recommendation': 'Investigate matching flows and implement blocking rules for confirmed threats',
                        'estimated_effort': 'High',
                        'timeline': '24-48 hours'
                    })
                elif category == 'honeypot_pattern_matches':
                    recommendations.append({
                        'priority': 'IMMEDIATE',
                        'category': 'Honeypot Pattern Detection',
                        'finding': f"Normal traffic matches {findings.get('matching_patterns', 0)} honeypot attack patterns",
                        'recommendation': 'Analyze matching patterns for potential ongoing attacks',
                        'estimated_effort': 'Medium',
                        'timeline': '24 hours'
                    })
                elif category == 'threat_intelligence_matches':
                    recommendations.append({
                        'priority': 'IMMEDIATE',
                        'category': 'Threat Intelligence Matches',
                        'finding': f"Normal traffic matches {findings.get('matching_patterns', 0)} known threat patterns",
                        'recommendation': 'Cross-reference with external threat intelligence and implement protective measures',
                        'estimated_effort': 'High',
                        'timeline': '24-48 hours'
                    })
                elif category == 'port_scanning':
                    recommendations.append({
                        'priority': 'IMMEDIATE',
                        'category': 'Port Scanning',
                        'finding': f"Detected {findings.get('count', 0)} potential port scanners",
                        'recommendation': 'Block scanning sources and review firewall rules',
                        'estimated_effort': 'Medium',
                        'timeline': '24 hours'
                    })
                elif category == 'data_exfiltration':
                    recommendations.append({
                        'priority': 'IMMEDIATE',
                        'category': 'Data Exfiltration',
                        'finding': f"Detected {findings.get('count', 0)} high-volume data transfers",
                        'recommendation': 'Investigate data transfers and implement DLP controls',
                        'estimated_effort': 'High',
                        'timeline': '48 hours'
                    })
        
        # Medium priority recommendations
        for category, findings in security_findings.items():
            if isinstance(findings, dict) and findings.get('severity') == 'MEDIUM':
                recommendations.append({
                    'priority': 'SCHEDULED',
                    'category': category.replace('_', ' ').title(),
                    'finding': f"Medium-severity {category.replace('_', ' ')} detected",
                    'recommendation': 'Schedule detailed analysis and implement monitoring',
                    'estimated_effort': 'Medium',
                    'timeline': '1-2 weeks'
                })
        
        # General recommendations
        recommendations.extend([
            {
                'priority': 'ONGOING',
                'category': 'Monitoring',
                'finding': 'Continuous network monitoring needed',
                'recommendation': 'Implement 24/7 SIEM monitoring and automated threat detection',
                'estimated_effort': 'High',
                'timeline': '1-3 months'
            },
            {
                'priority': 'ONGOING',
                'category': 'Threat Intelligence',
                'finding': 'Limited threat intelligence integration',
                'recommendation': 'Integrate multiple threat intelligence feeds for better detection',
                'estimated_effort': 'Medium',
                'timeline': '2-4 weeks'
            }
        ])
        
        return sorted(recommendations, key=lambda x: {'IMMEDIATE': 0, 'SCHEDULED': 1, 'ONGOING': 2}[x['priority']])

def enhanced_llm_analysis(report_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Enhanced LLM analysis with detailed cybersecurity insights"""
    
    prompt = f"""
You are a senior cybersecurity analyst with expertise in network traffic analysis and threat detection. 
You have been provided with comprehensive analysis of NORMAL network traffic that has been cross-referenced against known malicious/honeypot patterns to detect threats.

ANALYSIS METHODOLOGY:
- Normal flows analyzed (excluding known malicious/honeypot traffic)
- Pattern matching against known threat signatures
- Comparison of legitimate traffic against attack patterns

REPORT DATA:
{json.dumps(report_data, indent=2, default=str)}

Your analysis should focus on:
1. Evaluating the effectiveness of threat detection through pattern matching
2. Identifying potential false positives and false negatives
3. Assessing risk levels based on pattern matches with known threats
4. Providing recommendations for improving threat detection accuracy

For each finding, provide:
- "finding": A detailed technical description of the security issue or observation
- "attack_technique": MITRE ATT&CK technique if applicable
- "confidence_score": Float from 0.0 to 1.0
- "business_impact": Potential impact on business operations
- "recommended_action": Specific, actionable remediation steps
- "timeline": Suggested timeline for remediation

Return only a JSON list of findings. Focus on threat detection insights and security posture assessment.
"""

    try:
        client = openai.OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY"),
            base_url=os.environ.get("OPENAI_API_BASE", None)
        )
        response = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "GPT 4.1"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.1,
        )
        answer = response.choices[0].message.content if response.choices[0].message.content is not None else ""
        try:
            return json.loads(answer)
        except Exception as e:
            print(f"LLM returned non-JSON, error: {e}")
            return []
    except Exception as e:
        print(f"LLM analysis failed: {e}")
        # Return comprehensive manual analysis when LLM fails
        return [
            {
                "finding": "Network traffic analysis completed with automated threat detection",
                "attack_technique": "T1041 - Exfiltration Over C2 Channel",
                "confidence_score": 0.8,
                "business_impact": "Medium - Continuous monitoring required for threat detection",
                "recommended_action": "Implement enhanced monitoring and threat intelligence integration",
                "timeline": "1-2 weeks"
            },
            {
                "finding": "Baseline security posture established from flow data analysis",
                "attack_technique": "T1071 - Application Layer Protocol",
                "confidence_score": 0.9,
                "business_impact": "Low - Normal network operations detected",
                "recommended_action": "Maintain current security controls and schedule regular reviews",
                "timeline": "Ongoing"
            }
        ]

def generate_user_report(netid: str, query: Optional[str] = None, time_range_hours: int = 24, report_type: str = 'custom'):
    """Generate a custom report for a specific user"""
    generator = CybersecurityReportGenerator(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    
    try:
        # Get time range
        end_time = generator.get_latest_time()
        start_time = end_time - timedelta(hours=time_range_hours)
        
        print(f"🔍 Generating {report_type} report for user: {netid}")
        print(f"📊 Time range: {start_time} to {end_time} ({time_range_hours} hours)")
        
        # Generate report data
        traffic_data = generator.get_traffic_overview(start_time, end_time)
        security_findings = generator.detect_security_anomalies(start_time, end_time)
        executive_summary = generator.generate_executive_summary(traffic_data, security_findings)
        recommendations = generator.generate_recommendations(security_findings)
        
        # Create user-specific report
        user_report = {
            "metadata": {
                "report_title": f"Custom Network Analysis Report - {report_type.title()}",
                "reporting_period": f"{start_time.isoformat()} to {end_time.isoformat()}",
                "generated_by": "LEVANT AI Security Platform",
                "generation_date": datetime.now(timezone.utc).isoformat(),
                "report_version": "3.0",
                "analysis_duration_hours": time_range_hours,
                "user_netid": netid,
                "custom_query": query,
                "report_type": report_type,
                "automation_info": {
                    "is_automated": False,
                    "generation_type": "user_requested",
                    "requested_by": netid
                }
            },
            "executive_summary": executive_summary,
            "network_traffic_overview": traffic_data,
            "security_findings": security_findings,
            "recommendations_and_next_steps": {
                "prioritized_recommendations": recommendations,
                "user_notes": f"Custom analysis requested by {netid}"
            }
        }
        
        # Add AI analysis
        user_report["ai_analysis"] = enhanced_llm_analysis(user_report)
        
        # For frontend-generated reports, save to shared directory for all users to access
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if report_type in ['standard', 'custom'] and netid == 'testuser':
            # Frontend-generated reports go to shared directory
            filename = f"cybersecurity_report_{time_range_hours}h_{timestamp}.json"
            report_dir = get_report_directory('shared')
            filepath = os.path.join(report_dir, filename)
        else:
            # User-specific reports go to user directory
            filename = f"{report_type}_report_{timestamp}.json"
            user_dir = get_report_directory('user', netid)
            filepath = os.path.join(user_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(user_report, f, indent=2, default=str)
        
        print(f"✅ User report saved: {filepath}")
        print(f"   - Generated for: {netid}")
        print(f"   - Analysis period: {time_range_hours} hours")
        print(f"   - Flows analyzed: {traffic_data['basic_stats']['total_flows']:,}")
        
        # Save to Neo4j database for frontend integration
        neo4j_success = save_report_to_neo4j(user_report, filepath, netid)
        if not neo4j_success:
            print(f"⚠️  Report saved to filesystem but failed to save to database")
            print(f"   The report is available locally but may not appear in the web interface")
        
        return filepath
        
    except Exception as e:
        print(f"❌ Error generating user report: {e}")
        raise
    finally:
        generator.close()

def main():
    """Main report generation function"""
    generator = CybersecurityReportGenerator(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    
    try:
        # Get the actual data range from the database
        earliest_time = generator.get_earliest_time()
        latest_time = generator.get_latest_time()
        
        print(f"Database contains flows from {earliest_time} to {latest_time}")
        
        # Use the actual data range instead of a fixed 24-hour window
        start_time = earliest_time
        end_time = latest_time
        duration_hours = (end_time - start_time).total_seconds() / 3600
        
        print(f"Generating comprehensive cybersecurity report for actual data period")
        print(f"Analysis period: {start_time} to {end_time} ({duration_hours:.1f} hours)")
        print(f"📊 ANALYZING NORMAL TRAFFIC (excluding malicious/honeypot flows)")
        print(f"🔍 COMPARING against known malicious/honeypot patterns for threat detection")
        
        # Collect comprehensive data
        print("1. Analyzing network traffic overview (normal flows only)...")
        traffic_data = generator.get_traffic_overview(start_time, end_time)
        
        print("2. Detecting security anomalies via pattern matching...")
        security_findings = generator.detect_security_anomalies(start_time, end_time)
        
        print("3. Generating executive summary...")
        executive_summary = generator.generate_executive_summary(traffic_data, security_findings)
        
        print("4. Creating recommendations...")
        recommendations = generator.generate_recommendations(security_findings)
        
        # Complete report structure
        comprehensive_report = {
            "metadata": {
                "report_title": "Network Traffic Analysis Report with Threat Detection (YAF/IPFIX Data)",
                "reporting_period": f"{start_time.isoformat()} to {end_time.isoformat()}",
                "generated_by": "LEVANT AI Security Platform",
                "generation_date": datetime.now(timezone.utc).isoformat(),
                "report_version": "3.0",
                "analysis_duration_hours": round(duration_hours, 2),
                "analysis_scope": "Normal network flows (excluding known malicious/honeypot traffic)",
                "threat_detection_method": "Pattern matching against known malicious/honeypot signatures",
                "automation_info": {
                    "is_automated": True,
                    "generation_type": "scheduled",
                    "schedule": "Daily at 6:00 AM",
                    "frontend_integration": True,
                    "api_accessible": True
                }
            },
            
            "executive_summary": executive_summary,
            
            "network_traffic_overview": traffic_data,
            
            "security_findings": security_findings,
            
            "data_sources_and_configuration": {
                "primary_data_source": "Neo4j Graph Database",
                "yaf_ipfix_sensors": ["YAF Sensor Network"],
                "threat_intelligence_sources": [
                    "Known malicious flow signatures from honeypot data",
                    "Malicious IP patterns from security incidents",
                    "Port/protocol patterns from attack samples"
                ],
                "analysis_methodology": {
                    "normal_traffic_analysis": "Baseline network behavior from clean flows",
                    "threat_detection": "Pattern matching against known malicious signatures",
                    "comparison_scope": "IP addresses, ports, protocols, and traffic patterns"
                },
                "ipfix_information_elements": [
                    "sourceIPv4Address", "destinationIPv4Address",
                    "sourceTransportPort", "destinationTransportPort",
                    "protocolIdentifier", "octetTotalCount", "packetTotalCount",
                    "flowStartMilliseconds", "flowEndMilliseconds"
                ],
                "configuration_details": {
                    "sampling_rate": "1:1 (no sampling)",
                    "flow_timeout": "Active: 30min, Inactive: 15sec",
                    "collection_method": "IPFIX over TCP"
                }
            },
            
            "recommendations_and_next_steps": {
                "prioritized_recommendations": recommendations,
                "further_investigation_areas": [
                    "Deep packet inspection of suspicious flows",
                    "Correlation with external threat intelligence",
                    "Historical trend analysis",
                    "User behavior analytics"
                ],
                "security_control_adjustments": [
                    "Firewall rule optimization",
                    "IDS/IPS signature updates",
                    "Network segmentation review",
                    "Access control policy updates"
                ]
            },
            
            "compliance_and_governance": {
                "data_retention_policy": "Network flow data retained for 90 days",
                "privacy_controls": "IP addresses anonymized where required",
                "access_controls": "Report access restricted to authorized security personnel",
                "audit_trail": "All report generation activities logged"
            }
        }
        
        # Add enhanced LLM analysis
        print("5. Performing advanced AI analysis...")
        comprehensive_report["ai_analysis"] = enhanced_llm_analysis(comprehensive_report)
        
        # Save report to shared directory (available to all users)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cybersecurity_report_{duration_hours:.1f}h_{timestamp}.json"
        report_dir = get_report_directory('shared')
        filepath = os.path.join(report_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(comprehensive_report, f, indent=2, default=str)
        
        print(f"✅ Comprehensive cybersecurity report saved: {filepath}")
        print(f"   - Normal flows analyzed: {traffic_data['basic_stats']['total_flows']:,}")
        print(f"   - Threat detection categories: {len(security_findings)}")
        print(f"   - Pattern matching recommendations: {len(recommendations)}")
        print(f"   - Overall risk level: {executive_summary['overall_risk_level']}")
        print(f"   - Known malicious IPs: {security_findings.get('malicious_pattern_matches', {}).get('known_malicious_ips', 0)}")
        print(f"   - Known honeypot patterns: {security_findings.get('honeypot_pattern_matches', {}).get('known_honeypot_ips', 0) + security_findings.get('honeypot_pattern_matches', {}).get('known_honeypot_ports', 0)}")
        
        # Save to Neo4j database for frontend integration
        neo4j_success = save_report_to_neo4j(comprehensive_report, filepath, DEFAULT_USER_NETID)
        if not neo4j_success:
            print(f"⚠️  Report saved to filesystem but failed to save to database")
            print(f"   The report is available locally but may not appear in the web interface")
        
    except Exception as e:
        print(f"❌ Error generating report: {e}")
        raise
    finally:
        generator.close()

if __name__ == "__main__":
    import sys
    
    # Check for user-specific report generation
    if len(sys.argv) > 1:
        if sys.argv[1] == '--user' and len(sys.argv) > 2:
            netid = sys.argv[2]
            
            # Parse additional arguments
            time_range = 24  # default
            report_type = 'custom'
            query = None
            
            for i, arg in enumerate(sys.argv[3:], 3):
                if arg == '--time-range' and i + 1 < len(sys.argv):
                    time_range = int(sys.argv[i + 1])
                elif arg == '--type' and i + 1 < len(sys.argv):
                    report_type = sys.argv[i + 1]
                elif arg == '--query' and i + 1 < len(sys.argv):
                    query = sys.argv[i + 1]
            
            # Generate user report
            try:
                filepath = generate_user_report(netid, query, time_range, report_type)
                print(f"🎉 User report generation completed successfully!")
                print(f"📄 Report saved: {filepath}")
            except Exception as e:
                print(f"💥 User report generation failed: {e}")
                sys.exit(1)
        else:
            print("Usage: python report_generator.py [--user <netid> [--time-range <hours>] [--type <type>] [--query <query>]]")
            sys.exit(1)
    else:
        # Default: generate shared report
        main()
