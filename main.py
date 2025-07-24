from datetime import datetime
from fastapi import FastAPI, WebSocket, Depends, HTTPException, Cookie
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from src.email_service import EmailService
from src.inference_engine import InferenceEngine
from src.model.email_request import EmailRequest
from src.model.session import Session
import asyncio
import json
import logging
import msgpack
import os
import sys
import time
import uuid

logger = logging.getLogger(__name__)

app = FastAPI()
sessions: dict[str, Session] = {}
inference_engine: InferenceEngine = None
email_service = EmailService()

is_server_mode = os.getenv("SENTINELA_SERVER_MODE") == '1'

app.mount("/static", StaticFiles(directory="static"), name="static")

if is_server_mode:
    security = HTTPBasic()
    def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
        guest_password = os.getenv("GUEST_PASSWORD")
        if not guest_password:
            raise HTTPException(status_code=500, detail="Authentication not configured")
        
        if credentials.username != "guest" or credentials.password != guest_password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return credentials.username
else:
    def authenticate():
        return "local_user"

@app.get("/")
async def read_root(username: str = Depends(authenticate), session_id: str = Cookie(None)):
    if not session_id or session_id not in sessions:
        session_id = str(uuid.uuid4())
        sessions[session_id] = Session(
            username=username,
            created_at=datetime.now()
        )
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
        
        try:
            translated_values = await inference_engine.translate(values, language)
            translated_texts = dict(zip(keys, translated_values))
            return {"translations": translated_texts}
        except Exception as translation_error:
            logger.error(f"Translation failed for language {language}: {str(translation_error)}")
            raise HTTPException(status_code=500, detail=f"Translation failed: {str(translation_error)}")
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Base texts file not found")
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
    
FRAMES_PER_INFERENCE = 6
FRAME_BUFFER_SIZE = 9

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
    logger.info(f"WebSocket connection established at {datetime.now()} for session: {session_id}, user: {session_info.username}")

    session_info.current_prompt = None
    session_info.frame_buffer.clear()
    shared_language = {"value": "en"}
    inference_task = asyncio.create_task(inference_worker(websocket, session_info, shared_language))

    try:
        while True:
            packed_data = await websocket.receive_bytes()
            
            data = msgpack.unpackb(packed_data, raw=False)
            prompt = data.get("prompt", "")
            frame_data = bytes(data.get("frame", []))
            language = data.get("language", "en")
            
            if not prompt or not frame_data:
                continue

            if session_info.current_prompt != prompt:
                session_info.frame_buffer.clear()
                session_info.current_prompt = prompt
            
            shared_language["value"] = language  # Update shared language
            session_info.frame_buffer.append(frame_data)
            
            if len(session_info.frame_buffer) > FRAME_BUFFER_SIZE:
                del session_info.frame_buffer[:-FRAME_BUFFER_SIZE]
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            inference_task.cancel()
            await inference_task
        except asyncio.CancelledError:
            pass
    
    logger.info(f"WebSocket connection closed at {datetime.now()}")

async def inference_worker(websocket: WebSocket, session_info: Session, shared_language: dict):
    while websocket.client_state.value == 1:
        try:
            await asyncio.sleep(1)
                
            frames_to_process = session_info.frame_buffer[-FRAMES_PER_INFERENCE:]
            current_prompt = session_info.current_prompt
            current_language = shared_language["value"]
            
            if not current_prompt:
                logger.warning("weird: no prompt")
                continue

            def handle_frame_result(task):
                try:
                    result = task.result()
                    if not result.should_process or websocket.client_state.value != 1:
                        return
                        
                    elapsed_time = (datetime.now().timestamp() - result.start_time)
                    logger.info(f"processing_time={elapsed_time:.2f}s, confidence={result.score}, reason={result.reason}")

                    response_data = {
                        "confidence": result.score,
                        "reason": result.reason
                    }
                    packed_response = msgpack.packb(response_data)
                    if websocket.client_state.value == 1:
                        asyncio.create_task(websocket.send_bytes(packed_response))
                except Exception as e:
                    logger.error(f"Error processing frame: {e}")

            task = asyncio.create_task(inference_engine.process_frames(frames_to_process, current_prompt, current_language))
            task.add_done_callback(handle_frame_result)
            
        except Exception as e:
            logger.error(f"Inference worker error: {e}")

@app.post("/send-email")
async def send_email(email_request: EmailRequest, username: str = Depends(authenticate)):
    """Send an email using SMTP"""
    result = email_service.send_email(
        subject=email_request.subject,
        html_body=email_request.html_body
    )
    
    if result["success"]:
        return result
    else:
        raise HTTPException(status_code=500, detail=result["error"])

def validate_environment():
    if is_server_mode and not os.getenv("GUEST_PASSWORD"):
        logger.error("GUEST_PASSWORD environment variable is not set")
        logger.error("Please set GUEST_PASSWORD to enable authentication")
        exit(1)

    global inference_engine
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
        logger.error("Please set OPENROUTER_API_KEY or HF_TOKEN to use the appropriate inference engine")
        exit(1)

def setup_logging():
    info_handler = logging.StreamHandler(sys.stdout)
    info_handler.setLevel(logging.INFO)
    info_handler.addFilter(lambda record: record.levelno < logging.WARNING)

    warning_handler = logging.StreamHandler(sys.stderr)
    warning_handler.setLevel(logging.WARNING)

    logging.basicConfig(level=logging.INFO, handlers=[info_handler, warning_handler])
    logging.getLogger("httpx").setLevel(logging.WARNING)

PORT = 8000

async def launch_browser():
    import webbrowser
    await asyncio.sleep(2)
    logger.info("launching webbrowser")
    browser_name = 'google-chrome'
    try:
        browser = webbrowser.get(browser_name)
        browser.remote_args = [
            "--app=%s",
            "--new-window",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--autoplay-policy=no-user-gesture-required",
        ]
        browser.open(f'http://localhost:{PORT}?t={int(time.time())}')
    except Exception as e:
        logger.error(f"{e}\nunable to open: {browser_name}")

if __name__ == "__main__":
    validate_environment()
    setup_logging()
    
    if not is_server_mode:
        @app.on_event("startup")
        def startup_event():
            asyncio.create_task(launch_browser())
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_config=None)
