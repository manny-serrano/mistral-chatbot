import ast
import json
from pathlib import Path

file_path = Path("logs-json/sample_log.json")

try:
    with open(file_path, "r") as f:
        raw_lines = f.readlines()

    # Convert each line from Python dict to JSON object
    logs = []
    for line in raw_lines:
        try:
            log_dict = ast.literal_eval(line.strip())
            logs.append(log_dict)
        except Exception as parse_error:
            print(f"❌ Skipped bad line: {line.strip()} - {parse_error}")

    # Save as valid JSON list
    with open(file_path, "w") as f:
        json.dump(logs, f, indent=2)

    print(f"✅ Fixed {file_path.name} with {len(logs)} log entries")

except Exception as e:
    print(f"❌ Failed to fix {file_path.name}: {e}")
