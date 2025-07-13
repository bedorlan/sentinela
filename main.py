from datetime import datetime
from fastapi import FastAPI, WebSocket, Depends, HTTPException, Cookie
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import msgpack
import os
import uuid

from src.inference_engine import InferenceEngine


app = FastAPI()
security = HTTPBasic()
sessions = {}
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
async def read_root(username: str = Depends(authenticate), session_id: str = Cookie(None)):
    if not session_id or session_id not in sessions:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "username": username,
            "created_at": datetime.now(),
            "inference_in_progress": False
        }
        print(f"New session created: {session_id} for user: {username}")
    
    response = FileResponse("static/index.html")
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="strict",
        secure=False
    )
    return response

@app.get("/favicon.ico")
async def read_icon():
    return FileResponse("static/favicon.ico")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/translations/{language}")
async def get_translations(language: str, username: str = Depends(authenticate)):
    """Get translations for the specified language"""
    try:
        with open("static/locales/translation_keys.json", "r", encoding="utf-8") as f:
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
    session_id = None
    cookies = websocket.headers.get("cookie")
    if cookies:
        for cookie in cookies.split("; "):
            if cookie.startswith("session_id="):
                session_id = cookie.split("=", 1)[1]
                break
    
    if not session_id or session_id not in sessions:
        print(f"WebSocket connection rejected: Invalid session ID: {session_id}")
        await websocket.close(code=1008, reason="Invalid session")
        return
    
    await websocket.accept()
    session_info = sessions[session_id]
    print(f"WebSocket connection established at {datetime.now()} for session: {session_id}, user: {session_info['username']}")
    
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

            if session_info["inference_in_progress"]:
                dropped_frames += 1
                print(".", end="")
                continue
            
            session_info["inference_in_progress"] = True

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
                finally:
                    session_info["inference_in_progress"] = False

            task = asyncio.create_task(inference_engine.process_frame(frame_data, prompt))
            task.add_done_callback(handle_frame_result)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        session_info["inference_in_progress"] = False
        print(f"WebSocket connection closed at {datetime.now()}")
        print(f"Total frames received: {frame_count}")
        print(f"Total frames processed: {frame_count - dropped_frames}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
