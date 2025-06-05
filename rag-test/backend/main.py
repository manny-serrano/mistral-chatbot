from fastapi import FastAPI, File, UploadFile
import shutil
import os
from fastapi.responses import HTMLResponse
import json


#app object will run web server and handle the requests, this is an instance of the FASTAPI class
#creating api, 
app = FastAPI()
UPLOAD_DIR = "/data"
#when someoone sends a GET request to /health, do this function below
#decorator
@app.get("/health")
def health():
    #function returns dictionary which Fastapi converts into JSON
    return {"status": "ok"}

# simple way to check if backend is running going to localhost:8000/health

def process_with_llm(data):
    # Placeholder: Replace this with your actual LLM call
    # For now, just return a string summary
    return f"LLM processed {len(data)} items" if isinstance(data, list) else "LLM processed the file"

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Try to read as standard JSON first
    try:
        with open(file_location, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        # Try to read as NDJSON (one JSON object per line)
        with open(file_location, "r") as f:
            data = [json.loads(line) for line in f if line.strip()]
    except Exception as e:
        return {"filename": file.filename, "message": "File uploaded, but failed to read as JSON", "error": str(e)}
    llm_result = process_with_llm(data)
    # Return a preview and the LLM result
    preview = data[:5] if isinstance(data, list) else str(data)[:200]
    return {
        "filename": file.filename,
        "message": "File uploaded and processed",
        "data_preview": preview,
        "llm_result": llm_result
    }

@app.get("/", response_class=HTMLResponse)
def main():
    content = """
    <html>
        <head>
            <title>Upload File</title>
        </head>
        <body>
            <h1>Upload a JSON File</h1>
            <form action="/upload/" enctype="multipart/form-data" method="post">
                <input name="file" type="file" accept=".json">
                <input type="submit" value="Upload">
            </form>
        </body>
    </html>
    """
    return content
