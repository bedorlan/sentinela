from datetime import datetime
from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()
security = HTTPBasic()

app.mount("/static", StaticFiles(directory="static"), name="static")

def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    guest_password = os.getenv("GUEST_PASSWORD")
    if not guest_password:
        raise HTTPException(status_code=500, detail="Authentication not configured")
    
    if credentials.username != "guest" or credentials.password != guest_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return credentials.username

@app.get("/")
async def read_root(username: str = Depends(authenticate)):
    return FileResponse("static/index.html")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/frames")
async def websocket_frames(websocket: WebSocket):
    await websocket.accept()
    print(f"WebSocket connection established at {datetime.now()}")
    
    try:
        frame_count = 0
        while True:
            # Receive frame data (binary)
            frame_data = await websocket.receive_bytes()
            frame_count += 1
            
            # Get current timestamp for filename
            timestamp = datetime.now()
            
            # Print frame information
            print(f"Frame #{frame_count} received at {timestamp}")
            print(f"  Size: {len(frame_data)} bytes")
            # Check if JPEG by looking for JPEG magic bytes
            frame_type = "JPEG" if frame_data[:2] == b'\xff\xd8' else "Unknown"
            print(f"  Type: {frame_type}")
            print("-" * 50)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        print(f"WebSocket connection closed at {datetime.now()}")
        print(f"Total frames received: {frame_count}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
