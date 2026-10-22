"""Train the TF-IDF + One-vs-Rest Logistic Regression ticket router.

    python train.py                      # uses data/tickets.csv
    python train.py --csv path/to/tickets.csv
"""
import argparse, json, warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import LeaveOneOut, cross_val_predict

from pipeline import build_pipeline, clean

HERE = Path(__file__).parent
warnings.filterwarnings("ignore", message="Number of classes in training fold")


def load(csv_path):
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=["concern_text", "assigned_office"]).copy()
    df["office_id"] = df["assigned_office"].astype(int)
    df["text"] = df["concern_text"].astype(str)
    df["key"] = df["text"].map(clean)
    # identical text + identical office adds weight, not information
    df = df.drop_duplicates(subset=["key", "office_id"])
    return df[["text", "office_id"]].reset_index(drop=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(HERE / "data" / "tickets.csv"))
    ap.add_argument("--out", default=str(HERE / "model.joblib"))
    args = ap.parse_args()

    names = json.loads((HERE / "office_names.json").read_text())
    df = load(args.csv)
    X, y = df["text"], df["office_id"].values
    print(f"Training rows: {len(df)} | offices: {df.office_id.nunique()}")

    # Leave-one-out is the honest check for a dataset this small
    pipe = build_pipeline()
    proba = cross_val_predict(clone(pipe), X, y, cv=LeaveOneOut(), method="predict_proba")
    classes = np.unique(y)
    pred = classes[proba.argmax(axis=1)]
    top3 = np.array([yt in classes[np.argsort(-p)[:3]] for yt, p in zip(y, proba)])
    print(f"LOO accuracy : {accuracy_score(y, pred):.3f}")
    print(f"LOO top-3    : {top3.mean():.3f}")
    print(f"LOO macro-F1 : {f1_score(y, pred, average='macro', zero_division=0):.3f}")
    conf = proba.max(axis=1)
    for thr in (0.3, 0.4, 0.5, 0.6):
        m = conf >= thr
        if m.any():
            print(f"  conf>={thr:.1f}: covers {m.mean():.0%} of tickets, accuracy {accuracy_score(y[m], pred[m]):.3f}")
    print("\nPer-office (LOO):")
    for c in classes:
        m = y == c
        print(f"  {c:>2} {names.get(str(c), '?'):<28} n={m.sum():<3} recall={np.mean(pred[m] == c):.2f}")

    pipe.fit(X, y)
    joblib.dump({"pipeline": pipe, "names": names, "n_train": len(df)}, args.out)
    print(f"\nSaved -> {args.out}")


if __name__ == "__main__":
    main()