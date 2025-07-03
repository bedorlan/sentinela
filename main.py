from fastapi import FastAPI, WebSocket
import asyncio

app = FastAPI()

@app.get("/")
async def read_root():
    return {"Hello": "World"}

@app.get("/health")
async def health_check():
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
