from datetime import datetime
from fastapi import FastAPI, WebSocket, Depends, HTTPException, Cookie
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import logging
import msgpack
import os
import uuid

from src.inference_engine import InferenceEngine

logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

FPS = 3
FRAMES_TO_PROCESS = 2 * FPS
FRAME_BUFFER_SIZE = 3 * FPS

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
    logger.error("No API key environment variable is set")
    logger.error("Please set OPENROUTER_API_KEY, GOOGLE_API_KEY, or HF_TOKEN to use the appropriate inference engine")
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
            "frame_buffer": [],
            "current_prompt": None
        }
        logger.info(f"New session created: {session_id} for user: {username}")
    
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

            return {"translations": base_texts}
        
        if not hasattr(inference_engine, 'translate'):
            raise HTTPException(status_code=501, detail="Translation not supported")
        
        keys = list(base_texts.keys())
        values = list(base_texts.values())
        
        translated_values = await inference_engine.translate(values, language)
        
        translated_texts = dict(zip(keys, translated_values))
        
        return {"translations": translated_texts}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Base texts file not found")
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
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
        logger.warning(f"WebSocket connection rejected: Invalid session ID: {session_id}")
        await websocket.close(code=1008, reason="Invalid session")
        return
    
    await websocket.accept()
    session_info = sessions[session_id]
    logger.info(f"WebSocket connection established at {datetime.now()} for session: {session_id}, user: {session_info['username']}")

    session_info["current_prompt"] = None
    session_info["frame_buffer"].clear()
    inference_task = asyncio.create_task(inference_worker(websocket, session_info))

    try:
        while True:
            packed_data = await websocket.receive_bytes()
            
            data = msgpack.unpackb(packed_data, raw=False)
            prompt = data.get("prompt", "")
            frame_data = bytes(data.get("frame", []))
            
            if not prompt or not frame_data:
                continue

            if session_info["current_prompt"] != prompt:
                session_info["frame_buffer"].clear()
                session_info["current_prompt"] = prompt
            
            session_info["frame_buffer"].append(frame_data)
            
            if len(session_info["frame_buffer"]) > FRAME_BUFFER_SIZE:
                del session_info["frame_buffer"][:-FRAME_BUFFER_SIZE]
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            inference_task.cancel()
            await inference_task
        except asyncio.CancelledError:
            pass
    
    logger.info(f"WebSocket connection closed at {datetime.now()}")

async def inference_worker(websocket: WebSocket, session_info: dict):
    while websocket.client_state.value == 1:
        try:
            await asyncio.sleep(1)
                
            frames_to_process = session_info["frame_buffer"][-FRAMES_TO_PROCESS:]
            current_prompt = session_info["current_prompt"]
            
            if not current_prompt:
                logger.warning("weird: no prompt")
                continue

            start_time = datetime.now()
            def handle_frame_result(task):
                try:
                    processed, ai_response = task.result()
                    if not processed or websocket.client_state.value != 1:
                        return
                        
                    confidence, reason = ai_response
                    elapsed_time = (datetime.now() - start_time).total_seconds()
                    logger.info(f"processing_time={elapsed_time:.2f}s, confidence={confidence}, reason={reason}")
                    response_data = {
                        "confidence": confidence,
                        "reason": reason
                    }
                    packed_response = msgpack.packb(response_data)
                    if websocket.client_state.value == 1:
                        asyncio.create_task(websocket.send_bytes(packed_response))
                except Exception as e:
                    logger.error(f"Error processing frame: {e}")

            task = asyncio.create_task(inference_engine.process_frames(frames_to_process, current_prompt))
            task.add_done_callback(handle_frame_result)
            
        except Exception as e:
            logger.error(f"Inference worker error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
