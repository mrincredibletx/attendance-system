from fastapi import FastAPI, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from api.database import get_db, Base, engine
from api.models import Person, AttendanceLog
import numpy as np
import insightface
import json
import io
from PIL import Image
from datetime import date
from dotenv import load_dotenv

load_dotenv()

Base.metadata.create_all(bind=engine)

app_ai = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app_ai.prepare(ctx_id=-1, det_size=(640, 640))

app = FastAPI(title="Attendance System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Attendance System API running!"}

@app.post("/enroll")
async def enroll_person(
    name: str,
    role: str = "student",
    enrollment_no: str = None,
    department: str = None,
    section: str = None,
    email: str = None,
    contact: str = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    img = np.array(Image.open(io.BytesIO(contents)).convert("RGB"))

    faces = app_ai.get(img)
    if not faces:
        return {"status": "error", "message": "Koi face detect nahi hua"}

    embedding = faces[0].normed_embedding.tolist()

    # Already enrolled hai?
    existing = db.query(Person).filter(
        Person.enrollment_no == enrollment_no
    ).first()
    if existing:
        return {"status": "error", "message": f"{enrollment_no} already enrolled hai"}

    person = Person(
        name=name,
        role=role,
        enrollment_no=enrollment_no,
        department=department,
        section=section,
        email=email,
        contact=contact,
        embedding=json.dumps(embedding)
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    return {"status": "success", "message": f"{name} enrolled!", "id": person.id}

@app.post("/attendance/log")
def log_attendance(
    person_id: int,
    confidence: float,
    camera_id: str = "webcam",
    db: Session = Depends(get_db)
):
    log = AttendanceLog(
        person_id=person_id,
        camera_id=camera_id,
        confidence=confidence,
        location=camera_id
    )
    db.add(log)
    db.commit()
    return {"status": "logged"}

@app.get("/attendance/today")
def today_attendance(db: Session = Depends(get_db)):
    today = date.today()
    logs = db.query(AttendanceLog).filter(
        func.date(AttendanceLog.timestamp) == today
    ).all()
    result = []
    for log in logs:
        person = db.query(Person).filter(Person.id == log.person_id).first()
        result.append({
            "name": person.name if person else "Unknown",
            "enrollment_no": person.enrollment_no if person else None,
            "department": person.department if person else None,
            "section": person.section if person else None,
            "role": person.role if person else None,
            "confidence": log.confidence,
            "time": log.timestamp.strftime("%H:%M:%S"),
            "camera": log.camera_id
        })
    return result

@app.get("/persons")
def get_persons(db: Session = Depends(get_db)):
    persons = db.query(Person).all()
    return [{
        "id": p.id,
        "name": p.name,
        "role": p.role,
        "enrollment_no": p.enrollment_no,
        "department": p.department,
        "section": p.section,
        "email": p.email,
        "contact": p.contact,
        "embedding": p.embedding
    } for p in persons]

@app.get("/attendance/report/{person_id}")
def get_report(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return {"error": "Person nahi mila"}
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.person_id == person_id
    ).all()
    return {
        "name": person.name,
        "enrollment_no": person.enrollment_no,
        "department": person.department,
        "role": person.role,
        "total_days": len(logs),
        "logs": [{
            "date": l.timestamp.strftime("%Y-%m-%d"),
            "time": l.timestamp.strftime("%H:%M:%S"),
            "confidence": l.confidence
        } for l in logs]
    }

@app.get("/attendance/export")
def export_attendance(db: Session = Depends(get_db)):
    logs = db.query(AttendanceLog).all()
    result = []
    for log in logs:
        person = db.query(Person).filter(Person.id == log.person_id).first()
        result.append({
            "name": person.name if person else "Unknown",
            "enrollment_no": person.enrollment_no if person else None,
            "department": person.department if person else None,
            "section": person.section if person else None,
            "role": person.role if person else None,
            "confidence": log.confidence,
            "date": log.timestamp.strftime("%Y-%m-%d"),
            "time": log.timestamp.strftime("%H:%M:%S"),
            "camera": log.camera_id
        })
    return result