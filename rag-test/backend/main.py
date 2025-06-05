from fastapi import FastAPI

#app object will run web server and handle the requests, this is an instance of the FASTAPI class
#creating api, 
app = FastAPI()
#when someoone sends a GET request to /health, do this function below
#decorator
@app.get("/health")
def health():
    #function returns dictionary which Fastapi converts into JSON
    return {"status": "ok"}

# simple way to check if backend is running going to localhost:8000/health
