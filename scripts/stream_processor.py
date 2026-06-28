import cv2
import insightface
import numpy as np
import json
import os
from datetime import datetime

app = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=-1, det_size=(640, 640))

EMBEDDINGS_FILE = "enrollment/enrolled_faces.json"
LOG_FILE = "attendance_log.txt"
THRESHOLD = 0.4
COOLDOWN = {}

def load_enrolled():
    if os.path.exists(EMBEDDINGS_FILE):
        with open(EMBEDDINGS_FILE, "r") as f:
            data = json.load(f)
            return {k: np.array(v) for k, v in data.items()}
    return {}

def identify(frame, enrolled):
    faces = app.get(frame)
    results = []
    for face in faces:
        emb = face.normed_embedding
        best_match, best_score = None, -1
        for name, known_emb in enrolled.items():
            score = float(np.dot(emb, known_emb))
            if score > best_score:
                best_score = score
                best_match = name
        if best_score > THRESHOLD:
            results.append({"name": best_match, "confidence": best_score})
    return results

def log_attendance(name, confidence):
    now = datetime.now()
    line = f"{now.strftime('%Y-%m-%d %H:%M:%S')} | {name} | {confidence:.2f}\n"
    with open(LOG_FILE, "a") as f:
        f.write(line)
    print(f"✓ Present marked: {name} (confidence: {confidence:.2f})")

enrolled = load_enrolled()
if not enrolled:
    print("Koi enrolled face nahi mila! Pehle enrollment karo.")
    exit()

print(f"Loaded {len(enrolled)} enrolled person(s): {list(enrolled.keys())}")
print("Q dabaao band karne ke liye\n")

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        print("Camera nahi mili!")
        break

    results = identify(frame, enrolled)
    now_ts = datetime.now().timestamp()

    for r in results:
        name = r["name"]
        conf = r["confidence"]

        # Cooldown - ek baar per 60 seconds log karo
        if name not in COOLDOWN or now_ts - COOLDOWN[name] > 60:
            log_attendance(name, conf)
            COOLDOWN[name] = now_ts

        # Box draw karo