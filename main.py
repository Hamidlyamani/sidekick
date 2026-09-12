from fastapi import FastAPI

app = FastAPI(title="Sidekick API", version="1.0.0")


@app.get("/")
def root():
    return {"message": "Welcome to Sidekick API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
