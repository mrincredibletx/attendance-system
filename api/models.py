from sqlalchemy import Column, Integer, String, Float, DateTime, func
from api.database import Base

class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, default="student")
    roll_number = Column(String, unique=True, nullable=True)
    embedding = Column(String)
    created_at = Column(DateTime, default=func.now())

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer)
    camera_id = Column(String, default="webcam")
    confidence = Column(Float)
    location = Column(String)
    timestamp = Column(DateTime, default=func.now())