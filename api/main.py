from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from api.database import get_db, Base, engine
from api.models import Person, AttendanceLog
from jose import jwt
import bcrypt
from datetime import date, datetime, timedelta
import numpy as np
import insightface
import json
import io
from PIL import Image
from dotenv import load_dotenv
import os

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

# Auth setup
SECRET_KEY = os.getenv("SECRET_KEY", "rakesh-attendance-secret-key")
ALGORITHM = "HS256"

def hash_password(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str):
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# ── Health check ──────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Attendance System API running!"}

# ── Login ─────────────────────────────────────────────
@app.post("/login")
def login(enrollment_no: str, password: str, db: Session = Depends(get_db)):
    person = db.query(Person).filter(
        Person.enrollment_no == enrollment_no
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="Enrollment number nahi mila")

    if not person.password:
        raise HTTPException(status_code=401, detail="Password set nahi hai — admin se contact karo")

    if not verify_password(password, person.password):
        raise HTTPException(status_code=401, detail="Galat password")

    token = create_token({
        "id": person.id,
        "name": person.name,
        "role": person.role,
        "enrollment_no": person.enrollment_no
    })

    return {
        "token": token,
        "id": person.id,
        "name": person.name,
        "role": person.role,
        "enrollment_no": person.enrollment_no,
        "department": person.department,
        "section": person.section
    }

# ── Set Password ──────────────────────────────────────
@app.post("/set-password")
def set_password(enrollment_no: str, password: str, db: Session = Depends(get_db)):
    person = db.query(Person).filter(
        Person.enrollment_no == enrollment_no
    ).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person nahi mila")
    person.password = hash_password(password)
    db.commit()
    return {"status": "success", "message": f"{person.name} ka password set ho gaya"}

# ── Enrollment ────────────────────────────────────────
@app.post("/enroll")
async def enroll_person(
    name: str,
    role: str = "student",
    enrollment_no: str = None,
    department: str = None,
    section: str = None,
    email: str = None,
    contact: str = None,
    password: str = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    img = np.array(Image.open(io.BytesIO(contents)).convert("RGB"))

    faces = app_ai.get(img)
    if not faces:
        return {"status": "error", "message": "Koi face detect nahi hua"}

    existing = db.query(Person).filter(
        Person.enrollment_no == enrollment_no
    ).first()
    if existing:
        return {"status": "error", "message": f"{enrollment_no} already enrolled hai"}

    embedding = faces[0].normed_embedding.tolist()

    person = Person(
        name=name,
        role=role,
        enrollment_no=enrollment_no,
        department=department,
        section=section,
        email=email,
        contact=contact,
        password=hash_password(password) if password else None,
        embedding=json.dumps(embedding)
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    return {"status": "success", "message": f"{name} enrolled!", "id": person.id}

# ── Attendance log ────────────────────────────────────
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

# ── Aaj ki attendance ─────────────────────────────────
@app.get("/attendance/today")
def today_attendance(db: Session = Depends(get_db)):
    today = date.today()
    logs = db.query(AttendanceLog).filter(
        func.date(AttendanceLog.timestamp) == today
    ).all()
    result = {}
    for log in logs:
        person = db.query(Person).filter(Person.id == log.person_id).first()
        if person and log.person_id not in result:
            result[log.person_id] = {
                "name": person.name,
                "enrollment_no": person.enrollment_no,
                "department": person.department,
                "section": person.section,
                "role": person.role,
                "confidence": log.confidence,
                "time": log.timestamp.strftime("%H:%M:%S"),
                "camera": log.camera_id
            }
    return list(result.values())

# ── My attendance (student/staff) ─────────────────────
@app.get("/attendance/my/{person_id}")
def my_attendance(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person nahi mila")

    logs = db.query(AttendanceLog).filter(
        AttendanceLog.person_id == person_id
    ).order_by(AttendanceLog.timestamp.desc()).all()

    return {
        "name": person.name,
        "enrollment_no": person.enrollment_no,
        "department": person.department,
        "section": person.section,
        "role": person.role,
        "total_days": len(logs),
        "logs": [{
            "date": l.timestamp.strftime("%Y-%m-%d"),
            "time": l.timestamp.strftime("%H:%M:%S"),
            "confidence": l.confidence,
            "camera": l.camera_id
        } for l in logs]
    }

# ── Sab enrolled persons ──────────────────────────────
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
        "embedding": p.embedding,
        "has_password": p.password is not None
    } for p in persons]

# ── Attendance report ─────────────────────────────────
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

# ── Export ────────────────────────────────────────────
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