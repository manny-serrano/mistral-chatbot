#This file will parse logs and build a readable summary from JSON
import json
# creates dictionary map that maps protocol numbers to their names
PROTOCOL_MAP = {
6: "TCP",
17: "UDP",
27: "RDP",
112: "SunRPC",
132: "NetBIOS",
135: "NetBIOS",
137: "NetBIOS",
138: "NetBIOS",
139: "NetBIOS",
143: "IMAP",
161: "SNMP",
162: "SNMP",
179: "BGP",
443: "HTTPS",
445: "SMB",
514: "Syslog",
515: "LPR",
540: "UUCP"
}

#takes a flow dictionary and returns a readable sentence
def flow_to_sentence(flow: dict) -> str:
    protocol_num = flow.get("protocolIdentifier", "?")
    proto = PROTOCOL_MAP.get(protocol_num, f"Proto{protocol_num}")
    src = f'{flow.get("sourceIPv4Address")}:{flow.get("sourceTransportPort")}'
    dst = f'{flow.get("destinationIPv4Address")}:{flow.get("destinationTransportPort")}'
    duration = flow.get("flowDurationMilliseconds", "?")
    packets = flow.get("packetTotalCount", "?")
    bytes_ = flow.get("octetTotalCount", "?")
    rev_packets = flow.get("reversePacketTotalCount", "?")
    rev_bytes = flow.get("reverseOctetTotalCount", "?")
    flags = flow.get("unionTCPFlags", "?")

    #returns a readable sentence
    return (
        f"{proto} flow from {src} to {dst} lasted {duration} ms, "
        f"sent {packets} packets ({bytes_} bytes), "
        f"reverse: {rev_packets} packets ({rev_bytes} bytes), flags={flags}"
    )
    

def parse_large_flow_file(filepath):
    
    #Generator that yields (flow_dict, summary_sentence) for each line in a large JSON lines file.
    
    with open(filepath, "r") as f:
        for line in f:
            try:
                record = json.loads(line)
                flow = record["flows"]
                summary = flow_to_sentence(flow)
                yield flow, summary
            except Exception as e:
                #can log or count errors
                continue

# Example usage:
# for flow, summary in parse_large_flow_file("flow.20240531080616.json"):
#     print(summary)
