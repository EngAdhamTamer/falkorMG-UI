from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router
from nlp_routes import router as nlp_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(nlp_router)
app.include_router(nlp_router)