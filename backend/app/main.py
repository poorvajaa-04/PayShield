from fastapi import FastAPI

app = FastAPI(
    title="PayShield API",
    version="0.1.0"
)


@app.get("/")
def root():
    return {
        "project": "PayShield",
        "status": "running"
    }