# api/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, func
from api.database import Base

class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(String)           # student / faculty / staff
    roll_number = Column(String, unique=True)
    embedding = Column(String)      # JSON-serialized float list
    created_at = Column(DateTime, default=func.now())

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True)
    person_id = Column(Integer)
    camera_id = Column(String)
    confidence = Column(Float)
    timestamp = Column(DateTime, default=func.now())
    location = Column(String)       # "gate-1", "lab-3", etc.