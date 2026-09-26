"""
Semantic Embedding Service
Uses sentence-transformers ('all-MiniLM-L6-v2') to compute contextual sentence embeddings
and cosine similarity for semantic duplicate detection.
Includes an internal n-gram TF-IDF cosine similarity fallback if the neural model is offline.
"""

import math
import numpy as np

_model = None
_model_failed = False

def get_embedding_model():
    global _model, _model_failed
    if _model is not None:
        return _model
    if _model_failed:
        return None

    try:
        from sentence_transformers import SentenceTransformer
        # Lightweight, high-speed 384-dimensional sentence transformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        return _model
    except Exception as e:
        print(f"[Warning] SentenceTransformer load failed: {e}. Falling back to n-gram TF-IDF cosine similarity.")
        _model_failed = True
        return None

def compute_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    dot = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    val = float(dot / (norm1 * norm2))
    return max(0.0, min(1.0, val))

def _tfidf_fallback_similarity(text1: str, text2: str) -> float:
    from sklearn.feature_extraction.text import TfidfVectorizer
    try:
        vec = TfidfVectorizer(ngram_range=(1, 3), analyzer='char_wb')
        tfidf = vec.fit_transform([text1, text2])
        sim = (tfidf[0] * tfidf[1].T).toarray()[0][0]
        return float(max(0.0, min(1.0, sim)))
    except Exception:
        # Simplest Jaccard fallback
        w1 = set(text1.lower().split())
        w2 = set(text2.lower().split())
        if not w1 or not w2:
            return 0.0
        return float(len(w1 & w2) / len(w1 | w2))

def compute_similarity(text1: str, text2: str) -> float:
    """
    Computes semantic similarity score [0.0, 1.0] between two weather report descriptions.
    """
    if not text1 or not text2:
        return 0.0
    t1 = text1.strip()
    t2 = text2.strip()
    if t1.lower() == t2.lower():
        return 1.0

    model = get_embedding_model()
    if model is not None:
        try:
            embeddings = model.encode([t1, t2], convert_to_numpy=True)
            sim = compute_cosine_similarity(embeddings[0], embeddings[1])
            return round(sim, 4)
        except Exception as e:
            print(f"[Embedding Error] Encoding failed: {e}")

    # Fallback if neural embedding fails
    fallback_sim = _tfidf_fallback_similarity(t1, t2)
    return round(fallback_sim, 4)
