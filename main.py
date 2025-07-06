from datetime import datetime
from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
import asyncio
import msgpack
import os

from frame_analyzer import FrameAnalyzer

app = FastAPI()
security = HTTPBasic()
frame_analyzer = FrameAnalyzer()

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
        dropped_frames = 0
        while True:
            # Receive MessagePack binary data
            packed_data = await websocket.receive_bytes()
            frame_count += 1
            
            # Decode MessagePack data
            data = msgpack.unpackb(packed_data, raw=False)
            
            # Extract prompt and frame
            prompt = data.get("prompt", "")
            frame_data = bytes(data.get("frame", []))
            
            # Analyze frame with AI if prompt is provided
            if prompt and frame_data:
                def handle_frame_result(task):
                    try:
                        processed, ai_response = task.result()
                        if processed:
                            print(f"\nAI Response: {ai_response}")
                        else:
                            nonlocal dropped_frames
                            dropped_frames += 1
                            print(".", end="")
                    except Exception as e:
                        print(f"  Error processing frame: {e}")
                
                # Create task and add callback
                task = asyncio.create_task(frame_analyzer.process_frame(frame_data, prompt))
                task.add_done_callback(handle_frame_result)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        print(f"WebSocket connection closed at {datetime.now()}")
        print(f"Total frames received: {frame_count}")
        print(f"Total frames dropped: {dropped_frames}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
