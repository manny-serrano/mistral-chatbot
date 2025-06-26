#!/usr/bin/env python3
"""
Script to upload the Mistral Security Agent function to OpenWebUI via API.
This automates the process instead of manual copy-paste.
"""

import requests
import json
import os
import sys
from pathlib import Path

def read_function_file(function_path):
    """Read the OpenWebUI function file."""
    try:
        with open(function_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"ERROR: Function file not found: {function_path}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Could not read function file: {e}")
        sys.exit(1)

def get_api_key():
    """Get the OpenWebUI API key from environment variable."""
    
    # First try environment variable
    api_key = os.getenv('OPENWEBUI_API_KEY')
    if api_key:
        return api_key
    
    # Try different variations
    for key_name in ['OPEN_WEBUI_API_KEY', 'OPENWEBUI_KEY', 'WEBUI_API_KEY']:
        api_key = os.getenv(key_name)
        if api_key:
            return api_key
    
    print("ERROR: No API key found. Please set OPENWEBUI_API_KEY environment variable.")
    print()
    print("To get your API key:")
    print("1. Open OpenWebUI at http://localhost:3000")
    print("2. Click on your profile/settings")
    print("3. Go to 'Account' section")
    print("4. Generate or copy your API key")
    print("5. Set it: export OPENWEBUI_API_KEY='your-api-key-here'")
    sys.exit(1)

def format_function_for_api(function_content):
    """Format the function content for API upload."""
    return {
        "id": "mistral_security_agent",
        "name": "Mistral Security Agent",
        "content": function_content,
        "meta": {
            "description": "Intelligent security analysis agent for network threat detection and analysis",
            "manifest": {
                "type": "pipe",
                "author": "Mistral Team",
                "version": "1.1.0",
                "license": "MIT"
            }
        }
    }

def upload_function_to_openwebui(function_data, api_key, openwebui_url="http://localhost:3000"):
    """Upload or update the function to OpenWebUI via API."""
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    function_id = function_data['id']
    
    # First try to update existing function
    update_endpoint = f"{openwebui_url}/api/v1/functions/id/{function_id}/update"
    create_endpoint = f"{openwebui_url}/api/v1/functions/create"
    
    try:
        print("UPLOADING: Trying to update existing function...")
        print(f"Function ID: {function_id}")
        print()
        
        # Try update first
        response = requests.post(update_endpoint, json=function_data, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("SUCCESS: Function updated successfully!")
            print("The Mistral Security Agent has been updated with conversation memory!")
            print()
            print("Function Details:")
            print(f"  Name: {result.get('name', 'N/A')}")
            print(f"  Type: {result.get('type', 'N/A')}")
            print(f"  Active: {result.get('is_active', False)}")
            print(f"  Function ID: {result.get('id', 'N/A')}")
            return True
        
        # If update fails, try create (for new installations)
        elif response.status_code == 404:
            print("Function not found, creating new...")
            response = requests.post(create_endpoint, json=function_data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                print("SUCCESS: Function created successfully!")
                print("The Mistral Security Agent is now active in OpenWebUI")
                print()
                print("Function Details:")
                print(f"  Name: {result.get('name', 'N/A')}")
                print(f"  Type: {result.get('type', 'N/A')}")
                print(f"  Active: {result.get('is_active', False)}")
                print(f"  Function ID: {result.get('id', 'N/A')}")
                return True
        
        # Handle other errors
        print(f"ERROR: Upload/Update failed: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Try to parse error details
        try:
            error_data = response.json()
            if 'detail' in error_data:
                print(f"Error details: {error_data['detail']}")
                
                # If it's a conflict, suggest manual deletion
                if "already registered" in error_data['detail']:
                    print()
                    print("SOLUTION: The function already exists but cannot be updated.")
                    print("You can either:")
                    print("1. Delete the existing function in OpenWebUI and run this script again")
                    print("2. Or manually update the function in OpenWebUI interface")
        except:
            pass
            
        return False
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to OpenWebUI. Is it running on http://localhost:3000?")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def activate_function(function_id, api_key, openwebui_url="http://localhost:3000"):
    """Activate the uploaded function."""
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    endpoint = f"{openwebui_url}/api/v1/functions/id/{function_id}/toggle"
    
    try:
        response = requests.post(endpoint, headers=headers, timeout=30)
        return response.status_code == 200
    except:
        return False

def check_existing_functions(api_key, openwebui_url="http://localhost:3000"):
    """Check if there are existing security functions."""
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{openwebui_url}/api/v1/functions/", headers=headers)
        if response.status_code == 200:
            functions = response.json()
            security_functions = [f for f in functions if 'security' in f.get('name', '').lower()]
            if security_functions:
                print("INFO: Existing security functions found:")
                for func in security_functions:
                    status = "ACTIVE" if func.get('is_active') else "INACTIVE"
                    print(f"  - {func.get('name', 'Unknown')} [{status}]")
                print()
            else:
                print("INFO: No security functions found. Ready to upload!")
                print()
        return True
    except Exception as e:
        print(f"INFO: Could not check function status: {e}")
        return False

def main():
    """Main function to upload the security agent function."""
    
    # File paths
    current_dir = Path(__file__).parent
    function_file = current_dir / "openwebui_functions" / "security_agent_function.py"
    
    # Header
    print("=" * 60)
    print("Mistral Security Agent - Function Uploader")
    print("=" * 60)
    print()
    
    # Check if function file exists
    if not function_file.exists():
        print(f"ERROR: Function file not found: {function_file}")
        sys.exit(1)
    
    # Test API connection first
    api_key = get_api_key()
    try:
        response = requests.get("http://localhost:3000/api/health", timeout=5)
        if response.status_code != 200:
            print("ERROR: Cannot connect to OpenWebUI API. Please check:")
            print("  1. OpenWebUI is running on http://localhost:3000")
            print("  2. API is accessible")
            print("  3. No firewall blocking the connection")
            sys.exit(1)
        else:
            print("SUCCESS: API connection successful!")
    except:
        print("ERROR: Cannot connect to OpenWebUI API")
        sys.exit(1)
    
    # Check existing functions
    check_existing_functions(api_key)
    
    # Read function content
    print("Reading function file...")
    function_content = read_function_file(function_file)
    
    # Format for API
    function_data = format_function_for_api(function_content)
    
    # Upload function
    success = upload_function_to_openwebui(function_data, api_key)
    
    if success:
        print()
        print("=" * 60)
        print("NEXT STEPS:")
        print("1. Open OpenWebUI at http://localhost:3000")
        print("2. Start a new chat")
        print("3. Select 'Mistral Security Agent' from the model dropdown")
        print("4. Ask security questions like:")
        print("   - 'Show me honeypot attack data'")
        print("   - 'Find suspicious network patterns'")
        print("   - 'Analyze network security threats'")
        print("=" * 60)
    else:
        print()
        print("Upload failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 