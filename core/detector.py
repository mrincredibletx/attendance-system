# core/detector.py
import cv2
import insightface
import numpy as np

class FaceSystem:
    def __init__(self):
        self.app = insightface.app.FaceAnalysis(
            providers=['CPUExecutionProvider']  # change to CUDAExecutionProvider on GPU
        )
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        self.known_embeddings = {}  # {name: embedding_vector}

    def register_person(self, name: str, image: np.ndarray):
        faces = self.app.get(image)
        if not faces:
            return False
        embedding = faces[0].normed_embedding
        self.known_embeddings[name] = embedding
        return True

    def identify(self, image: np.ndarray, threshold=0.4):
        faces = self.app.get(image)
        results = []
        for face in faces:
            emb = face.normed_embedding
            best_match, best_score = None, -1
            for name, known_emb in self.known_embeddings.items():
                score = np.dot(emb, known_emb)  # cosine similarity
                if score > best_score:
                    best_score = score
                    best_match = name
            if best_score > threshold:
                results.append({
                    "name": best_match,
                    "confidence": float(best_score),
                    "bbox": face.bbox.tolist()
                })
        return results