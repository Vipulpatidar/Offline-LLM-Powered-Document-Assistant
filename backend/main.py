from fastapi import FastAPI

from api.chat import router as chat_router
from api.delete import router as delete_router
from api.retrieve import router as retrieve_router
from api.upload import router as upload_router
from core.queue import start_worker
from routes.pipeline import router as pipeline_router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="Local AI Hub")

app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(retrieve_router)
app.include_router(delete_router)
app.include_router(pipeline_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:8080"] if using Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    start_worker()
