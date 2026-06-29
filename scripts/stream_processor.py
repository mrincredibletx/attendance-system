import cv2
import insightface
import numpy as np
import requests
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://127.0.0.1:8000"
THRESHOLD = float(os.getenv("DETECTION_THRESHOLD", 0.4))
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", 1))
COOLDOWN_SECONDS = 60

app_ai = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app_ai.prepare(ctx_id=-1, det_size=(640, 640))

# Enrolled faces DB se load karo
def load_enrolled():
    try:
        res = requests.get(f"{API_URL}/persons")
        persons = res.json()
        enrolled = {}
        for p in persons:
            if p.get("embedding"):
                enrolled[p["id"]] = {
                    "name": p["name"],
                    "embedding": np.array(json.loads(p["embedding"]))
                }
        print(f"Loaded {len(enrolled)} enrolled persons")
        return enrolled
    except Exception as e:
        print(f"API se load nahi hua: {e}")
        return {}

def identify(frame, enrolled):
    faces = app_ai.get(frame)
    results = []
    for face in faces:
        emb = face.normed_embedding
        best_id, best_name, best_score = None, None, -1
        for pid, data in enrolled.items():
            score = float(np.dot(emb, data["embedding"]))
            if score > best_score:
                best_score = score
                best_id = pid
                best_name = data["name"]
        if best_score > THRESHOLD:
            results.append({
                "person_id": best_id,
                "name": best_name,
                "confidence": best_score,
                "bbox": face.bbox.tolist()
            })
    return results

def log_to_api(person_id, confidence):
    try:
        requests.post(f"{API_URL}/attendance/log", params={
            "person_id": person_id,
            "confidence": confidence,
            "camera_id": "webcam-1"
        })
    except Exception as e:
        print(f"Log error: {e}")

# Main loop
enrolled = load_enrolled()
COOLDOWN = {}

print(f"Camera index {CAMERA_INDEX} se stream shuru ho rahi hai...")
print("Q dabaao band karne ke liye\n")

cap = cv2.VideoCapture(CAMERA_INDEX)

while True:
    ret, frame = cap.read()
    if not ret:
        print("Camera feed nahi aayi!")
        break

    results = identify(frame, enrolled)
    now = time.time()

    for r in results:
        pid = r["person_id"]
        name = r["name"]
        conf = r["confidence"]

        # Cooldown check
        if pid not in COOLDOWN or now - COOLDOWN[pid] > COOLDOWN_SECONDS:
            log_to_api(pid, conf)
            COOLDOWN[pid] = now
            print(f"✓ Present: {name} ({conf:.2f})")

        # Box draw karo
        x1, y1, x2, y2 = map(int, r["bbox"])
        color = (0, 255, 0) if conf > 0.6 else (0, 165, 255)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, f"{name} {conf:.2f}",
                    (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    cv2.imshow("Attendance System", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()