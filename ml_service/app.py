"""FastAPI service that serves the trained ticket router.

    uvicorn app:app --host 0.0.0.0 --port 8000
"""
import sys
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Make sure pipeline.py can be found so joblib can unpickle pipeline.clean
sys.path.insert(0, str(Path(__file__).parent))
import pipeline  # noqa: F401

MODEL_PATH = Path(__file__).parent / "model.joblib"
LABEL_THRESHOLD = 0.20   # extra offices returned in "labels" (multi-label view)

bundle = joblib.load(MODEL_PATH)
pipe = bundle["pipeline"]
names = bundle["names"]
classes = pipe.classes_

app = FastAPI(title="SPC Ticket Router (TF-IDF + OvR Logistic Regression)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Ticket(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"ok": True, "offices": len(classes), "trained_on": bundle["n_train"]}


@app.post("/classify")
def classify(t: Ticket):
    text = t.text.strip()
    if not text:
        raise HTTPException(400, "text is empty")

    proba = pipe.predict_proba([text])[0]
    order = np.argsort(-proba)
    ranked = [
        {
            "office_id": int(classes[i]),
            "office": names.get(str(int(classes[i])), ""),
            "score": round(float(proba[i]), 4),
        }
        for i in order[:3]
    ]

    top = ranked[0]
    labels = [r["office_id"] for r in ranked if r["score"] >= LABEL_THRESHOLD] or [top["office_id"]]

    return {
        "office_id": top["office_id"],
        "office": top["office"],
        "labels": labels,
        "confidence": round(top["score"] * 100),
        "top3": ranked,
    }