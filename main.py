from datetime import datetime
from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
import asyncio
import msgpack
import os

from src.google_ai_studio_inference import GoogleAIStudioInference
from src.inference_engine import InferenceEngine

app = FastAPI()
security = HTTPBasic()
inference_engine: InferenceEngine = GoogleAIStudioInference()

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
            packed_data = await websocket.receive_bytes()
            frame_count += 1
            
            data = msgpack.unpackb(packed_data, raw=False)
            
            prompt = data.get("prompt", "")
            frame_data = bytes(data.get("frame", []))
            
            if not prompt or not frame_data:
                continue

            def handle_frame_result(task):
                try:
                    processed, ai_response = task.result()
                    if not processed:
                        nonlocal dropped_frames
                        dropped_frames += 1
                        print(".", end="")
                        return

                    if websocket.client_state.value != 1:  # Not connected
                        return
                        
                    try:
                        confidence = float(ai_response.strip())
                        asyncio.create_task(websocket.send_text(str(confidence)))
                    except ValueError:
                        asyncio.create_task(websocket.send_text("0"))
                except Exception as e:
                    print(f"Error processing frame: {e}")

            task = asyncio.create_task(inference_engine.process_frame(frame_data, prompt))
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
