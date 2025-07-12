from datetime import datetime
from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import msgpack
import os

from src.inference_engine import InferenceEngine

app = FastAPI()
security = HTTPBasic()
inference_engine: InferenceEngine = None

if os.getenv("OPENROUTER_API_KEY"):
    from src.openrouter_inference import OpenRouterInference
    inference_engine = OpenRouterInference()
elif os.getenv("GOOGLE_API_KEY"):
    from src.google_ai_studio_inference import GoogleAIStudioInference
    inference_engine = GoogleAIStudioInference()
elif os.getenv("HF_TOKEN"):
    from src.gemma_local_inference import GemmaLocalInference
    inference_engine = GemmaLocalInference()
else:
    print("ERROR: No API key environment variable is set")
    print("Please set OPENROUTER_API_KEY, GOOGLE_API_KEY, or HF_TOKEN to use the appropriate inference engine")
    exit(1)

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

@app.get("/favicon.ico")
async def read_icon():
    return FileResponse("static/favicon.ico")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/translations/{language}")
async def get_translations(language: str):
    """Get translations for the specified language"""
    try:
        with open("static/locales/extracted_texts.json", "r", encoding="utf-8") as f:
            base_texts = json.load(f)
    
        if language.lower().startswith('en'):
            print(f"📖 English texts loaded directly from file")
            print(f"📄 Base texts: {base_texts}")
            return {"translations": base_texts}
        
        if not hasattr(inference_engine, 'translate'):
            raise HTTPException(status_code=501, detail="Translation not supported")
        
        translated_texts = await inference_engine.translate(base_texts, language)
        
        print(f"✅ Translation completed for language: {language}")
        print(f"📄 Final translated texts: {translated_texts}")
        
        return {"translations": translated_texts}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Base texts file not found")
    except Exception as e:
        print(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

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
                        
                    confidence, reason = ai_response
                    response_data = {
                        "confidence": confidence,
                        "reason": reason
                    }
                    packed_response = msgpack.packb(response_data)
                    asyncio.create_task(websocket.send_bytes(packed_response))
                except Exception as e:
                    print(f"Error processing frame: {e}")

            task = asyncio.create_task(inference_engine.process_frame(frame_data, prompt))
            task.add_done_callback(handle_frame_result)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        print(f"WebSocket connection closed at {datetime.now()}")
        print(f"Total frames received: {frame_count}")
        print(f"Total frames processed: {frame_count - dropped_frames}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
