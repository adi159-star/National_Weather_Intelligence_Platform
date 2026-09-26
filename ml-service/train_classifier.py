"""
Weather Event Classifier Training Pipeline
Trains a TF-IDF + Logistic Regression model for automated meteorological event classification.
Saves the fitted pipeline to models/weather_classifier.joblib and evaluation metrics to models/metrics.json.
"""

import os
import json
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "weather_training_data.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "weather_classifier.joblib")
METRICS_SAVE_PATH = os.path.join(MODELS_DIR, "metrics.json")

def load_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    # Basic data cleaning
    df = df.dropna(subset=['text', 'label'])
    df['text'] = df['text'].astype(str).str.strip().str.lower()
    df['label'] = df['label'].astype(str).str.strip().str.lower()
    return df

def train_and_evaluate():
    os.makedirs(MODELS_DIR, exist_ok=True)
    print(f"[1/5] Loading training dataset from: {DATA_PATH}")
    df = load_data()
    print(f"      Total samples: {len(df)}, Classes count: {df['label'].nunique()}")

    # Stratified train/test split
    # Since small prototype dataset, use test_size=0.20 or 0.25 with min class count handling
    X = df['text'].values
    y = df['label'].values

    # Check minimum samples per class for stratification
    class_counts = df['label'].value_counts()
    min_count = class_counts.min()
    stratify_target = y if min_count >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=stratify_target
    )
    print(f"[2/5] Split dataset: Train={len(X_train)} samples, Test={len(X_test)} samples")

    # Pipeline: TF-IDF Vectorizer + Multinomial Logistic Regression
    # ngram_range=(1, 2) captures unigrams and bigrams like "heavy rain", "water entered"
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=1,
            max_df=0.95
        )),
        ('clf', LogisticRegression(
            C=2.5,
            max_iter=1000,
            solver='lbfgs',
            random_state=42
        ))
    ])

    print("[3/5] Fitting TF-IDF + Logistic Regression pipeline...")
    pipeline.fit(X_train, y_train)

    print("[4/5] Evaluating model on unseen test set...")
    y_pred = pipeline.predict(X_test)

    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    recall = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))

    report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    print(f"      Accuracy:  {accuracy:.4f} ({accuracy * 100:.1f}%)")
    print(f"      Precision: {precision:.4f} ({precision * 100:.1f}%)")
    print(f"      Recall:    {recall:.4f} ({recall * 100:.1f}%)")
    print(f"      F1 Score:  {f1:.4f} ({f1 * 100:.1f}%)")

    metrics_payload = {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "classes": sorted(list(pipeline.classes_)),
        "class_report": report_dict,
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "model_type": "TF-IDF + LogisticRegression (Extensible to Transformers/BERT)"
    }

    print(f"[5/5] Saving model pipeline to: {MODEL_SAVE_PATH}")
    joblib.dump(pipeline, MODEL_SAVE_PATH)

    with open(METRICS_SAVE_PATH, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"      Metrics saved to: {METRICS_SAVE_PATH}")

    return pipeline, metrics_payload

if __name__ == "__main__":
    train_and_evaluate()
