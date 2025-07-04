from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import asyncio
import os

app = FastAPI()
security = HTTPBasic()

def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    guest_password = os.getenv("GUEST_PASSWORD")
    if not guest_password:
        raise HTTPException(status_code=500, detail="Authentication not configured")
    
    if credentials.username != "guest" or credentials.password != guest_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return credentials.username

@app.get("/")
async def read_root(username: str = Depends(authenticate)):
    return {"Hello": "World"}

@app.get("/health")
async def health_check(username: str = Depends(authenticate)):
    return {"status": "healthy"}

@app.websocket("/ws/counter")
async def websocket_counter(websocket: WebSocket):
    await websocket.accept()
    counter = 0
    try:
        while True:
            await websocket.send_text(str(counter))
            counter += 1
            await asyncio.sleep(1)
    except Exception:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
