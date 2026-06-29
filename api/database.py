from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def log_attendance(name: str, confidence: float, camera: str = "webcam"):
    db = SessionLocal()
    try:
        from api.models import AttendanceLog, Person
        person = db.query(Person).filter(Person.name == name).first()
        if person:
            log = AttendanceLog(
                person_id=person.id,
                camera_id=camera,
                confidence=confidence,
                location=camera
            )
            db.add(log)
            db.commit()
    finally:
        db.close()