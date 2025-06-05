import pandas as pd
from datetime import timedelta
# ----------------------------------------------------------------------------------
#      used the "MISTRAL Data Fields\MISTRAL Data Fields\Suspicious_Data" 
#      after that for Zeek use the conn.log and for YAF use the json file 
#      but note that you should select what type of nmap attack 
# ----------------------------------------------------------------------------------
 

# --------------------------
# Function to Load Zeek Logs
# --------------------------
def load_zeek_connlog(file_path: str) -> pd.DataFrame:
    """
    Load Zeek conn.log as JSON (newline-delimited).
    """
    zeek_df = pd.read_json(file_path, lines=True)

    # Convert timestamp and normalize protocol
    zeek_df["ts"] = pd.to_datetime(zeek_df["ts"], errors="coerce")
    zeek_df["proto"] = zeek_df["proto"].str.lower()
    
    return zeek_df

    """
    Load Zeek conn.log from TSV format (with #fields line) or JSON.
    Assumes JSON lines if .json is in the filename, else TSV.
    """
    if file_path.endswith(".json"):
        zeek_df = pd.read_json(file_path, lines=True)
    else:
        # Parse TSV with header extraction from #fields line
        with open(file_path, 'r') as f:
            for line in f:
                if line.startswith("#fields"):
                    columns = line.strip().split("\t")[1:]
                    break
        zeek_df = pd.read_csv(file_path, sep="\t", comment="#", names=columns, header=None)
    
    # Convert timestamp to datetime
    zeek_df["ts"] = pd.to_datetime(zeek_df["ts"], unit="s", errors="coerce")
    
    # Normalize protocol to lowercase
    zeek_df["proto"] = zeek_df["proto"].str.lower()
    
    return zeek_df


# -------------------------
# Function to Load YAF Logs
# -------------------------
def load_yaf_flows(file_path: str) -> pd.DataFrame:
    """
    Load YAF flows in JSON lines format, extracting the nested 'flows' field.
    """
    # Load each line as a dict, then extract the 'flows' sub-dict
    raw_records = pd.read_json(file_path, lines=True)
    
    if "flows" not in raw_records.columns:
        raise ValueError("Expected top-level key 'flows' not found in YAF file.")

    # Expand the nested 'flows' object into a new dataframe
    yaf_df = pd.json_normalize(raw_records["flows"])

    # Convert timestamp field
    yaf_df["flowStartMilliseconds"] = pd.to_datetime(
        yaf_df["flowStartMilliseconds"], errors="coerce"
    )

    # Map numeric protocol identifiers to string (tcp, udp, etc.)
    protocol_map = {6: "tcp", 17: "udp", 1: "icmp"}
    yaf_df["protocol"] = yaf_df["protocolIdentifier"].map(protocol_map)

    return yaf_df

    """
    Load YAF flows in JSON lines format and normalize key fields.
    """
    yaf_df = pd.read_json(file_path, lines=True)
    
    # Convert flow start time to datetime
    yaf_df["flowStartMilliseconds"] = pd.to_datetime(yaf_df["flowStartMilliseconds"], errors="coerce")
    
    # Map numeric protocol values to text equivalents
    protocol_map = {6: "tcp", 17: "udp", 1: "icmp"}
    yaf_df["protocol"] = yaf_df["protocolIdentifier"].map(protocol_map)
    
    return yaf_df


# ------------------------------
# Function to Build a Join Key
# ------------------------------
def build_join_key(df: pd.DataFrame, fields: list) -> pd.Series:
    """
    Create a 5-tuple key (src_ip:dst_ip:src_port:dst_port:protocol) for matching.
    """
    return df[fields[0]].astype(str) + ":" + \
           df[fields[1]].astype(str) + ":" + \
           df[fields[2]].astype(str) + ":" + \
           df[fields[3]].astype(str) + ":" + \
           df[fields[4]].astype(str)


# --------------------------
# Main Execution Starts Here
# --------------------------

# === File paths (edit these with the full path) ===
zeek_file = ""
yaf_file = ""

# === Load the data ===
zeek = load_zeek_connlog(zeek_file)
yaf = load_yaf_flows(yaf_file)

# === Create join keys for both logs ===
zeek["join_key"] = build_join_key(zeek, [
    "id.orig_h", "id.resp_h", "id.orig_p", "id.resp_p", "proto"
])

yaf["join_key"] = build_join_key(yaf, [
    "sourceIPv4Address", "destinationIPv4Address", "sourceTransportPort",
    "destinationTransportPort", "protocol"
])
# === Convert timestamps to same timezone format ===
zeek["ts"] = zeek["ts"].dt.tz_localize(None)
yaf["flowStartMilliseconds"] = yaf["flowStartMilliseconds"].dt.tz_localize(None)

# === Sort logs by time for merge_asof ===
zeek = zeek.sort_values("ts")
yaf = yaf.sort_values("flowStartMilliseconds")

# === Perform timestamp-tolerant join ===
joined = pd.merge_asof(
    left=zeek,
    right=yaf,
    left_on="ts",
    right_on="flowStartMilliseconds",
    by="join_key",
    direction="nearest",
    tolerance=timedelta(seconds=1)  # allow up to 1s time difference
)

# === Drop unmatched rows ===
joined_clean = joined.dropna(subset=["flowStartMilliseconds"])

# === Output the result ===
output_path = "joined_zeek_yaf.csv"
joined_clean.to_csv(output_path, index=False)

print(f"Joined {len(joined_clean)} Zeek flows with matching YAF entries.")
print(f"Output saved to: {output_path}")
