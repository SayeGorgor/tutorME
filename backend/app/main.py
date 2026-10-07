from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.api import api_router
from app.core.logging_config import setup_logging

setup_logging()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tutorme2.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(api_router)

@app.get("/")
def root():
    return {'message': 'TutorME backend is running successfully!'}