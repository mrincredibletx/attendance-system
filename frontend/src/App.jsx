import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "https://dedicator-subarctic-perceive.ngrok-free.dev";

const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
const setUser = (u) => localStorage.setItem("user", JSON.stringify(u));
const clearUser = () => localStorage.removeItem("user");

// ── Camera Attendance ─────────────────────────────────
function CameraAttendance({ user }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [stream, setStream] = useState(null);

  const startCamera = async (facingMode = "user") => {
  try {
    if (stream) stream.getTracks().forEach(t => t.stop());
    const s = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: facingMode } 
    });
    setStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
    setStatus("ready");
  } catch (e) {
    setStatus("error");
  }
};

const [facingMode, setFacingMode] = useState("user");

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setStatus("idle");
    setResult(null);
  };

  useEffect(() => { return () => { if (stream) stream.getTracks().forEach(t => t.stop()); }; }, [stream]);

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setStatus("processing");
    setResult(null);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");
      try {
        const res = await axios.post(`${API}/identify`, formData);
        const data = res.data;
        if (data.status === "recognized") {
          setResult({ success: true, name: data.name, confidence: data.confidence, enrollment_no: data.enrollment_no });
          await axios.post(`${API}/attendance/log`, null, {
            params: { person_id: data.person_id, confidence: data.confidence, camera_id: "manual-camera", taken_by: user.name }
          });
          setRecentLogs(prev => [{
            name: data.name, enrollment_no: data.enrollment_no,
            confidence: data.confidence, time: new Date().toLocaleTimeString(), taken_by: user.name
          }, ...prev.slice(0, 9)]);
        } else {
          setResult({ success: false, message: data.message });
        }
      } catch (e) {
        setResult({ success: false, message: "Recognition failed" });
      }
      setStatus("ready");
    }, "image/jpeg", 0.9);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h2 style={{ margin: "0 0 16px" }}>Live Camera</h2>
        <div style={{
          background: "#111827", borderRadius: 8, overflow: "hidden",
          aspectRatio: "4/3", marginBottom: 16, display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width: "100%", height: "100%", objectFit: "cover", display: stream ? "block" : "none" }} />
          {!stream && (
            <div style={{ textAlign: "center", color: "#6b7280" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 14 }}>Camera not started</div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 8 }}>
          {!stream ? (
            <button onClick={startCamera} style={{
              flex: 1, padding: 10, background: "#065f46", color: "white",
              border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer"
            }}>Start Camera</button>
          ) : (
            <>
              <button onClick={captureAndIdentify} disabled={status === "processing"} style={{
                flex: 2, padding: 10,
                background: status === "processing" ? "#9ca3af" : "#1e40af",
                color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer"
              }}>{status === "processing" ? "Identifying..." : "Capture & Identify"}</button>
              <button onClick={stopCamera} style={{
                flex: 1, padding: 10, background: "#fee2e2", color: "#dc2626",
                border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer"
              }}>Stop</button>
            </>
          )}
        </div>
        {result && (
          <div style={{
            marginTop: 16, padding: 14, borderRadius: 8,
            background: result.success ? "#d1fae5" : "#fee2e2",
            color: result.success ? "#065f46" : "#dc2626"
          }}>
            {result.success ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 16 }}>✓ {result.name}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{result.enrollment_no} — {(result.confidence * 100).toFixed(1)}%</div>
                <div style={{ fontSize: 13 }}>Attendance marked!</div>
              </>
            ) : (
              <div style={{ fontWeight: 600 }}>✗ {result.message}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h2 style={{ margin: "0 0 16px" }}>Recent — this session</h2>
        {recentLogs.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", marginTop: 40 }}>No attendance taken yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentLogs.map((log, i) => (
              <div key={i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{log.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {log.enrollment_no} · {(log.confidence * 100).toFixed(1)}% · {log.time}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Taken by: {log.taken_by}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

{!stream ? (
  <div style={{ display: "flex", gap: 8 }}>
    <button onClick={() => { setFacingMode("user"); startCamera("user"); }} style={{
      flex: 1, padding: 10, background: "#065f46", color: "white",
      border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer"
    }}>Front Camera</button>
    <button onClick={() => { setFacingMode("environment"); startCamera("environment"); }} style={{
      flex: 1, padding: 10, background: "#1e40af", color: "white",
      border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer"
    }}>Back Camera</button>
  </div>
) : (
  <>
    <button onClick={captureAndIdentify} disabled={status === "processing"} style={{
      flex: 2, padding: 10,
      background: status === "processing" ? "#9ca3af" : "#1e40af",
      color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer"
    }}>{status === "processing" ? "Identifying..." : "Capture & Identify"}</button>
    <button onClick={stopCamera} style={{
      flex: 1, padding: 10, background: "#fee2e2", color: "#dc2626",
      border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer"
    }}>Stop</button>
  </>
)}

// ── Login Page ────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!enrollmentNo || !password) { setError("Please fill all fields"); return; }
    setLoading(true); setError("");
    try {
      const res = await axios.post(`${API}/login`, null, {
        params: { enrollment_no: enrollmentNo, password }
      });
      setUser(res.data);
      onLogin(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="https://media.uem.edu.in/uploads/sites/7/2021/03/cropped-logo.png"
            alt="UEM Jaipur" style={{ height: 56, width: "auto", marginBottom: 12 }} />
          <h1 style={{ margin: 0, fontSize: 20, color: "#1e3a8a", fontWeight: 700 }}>Attendance System</h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>AI-Powered Face Recognition</p>
        </div>
        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>Enrollment Number</label>
          <input value={enrollmentNo} onChange={e => setEnrollmentNo(e.target.value)}
            placeholder="e.g. 12023002001100"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter your password"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: 12, background: loading ? "#93c5fd" : "#1e40af",
          color: "white", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer"
        }}>{loading ? "Signing in..." : "Sign in"}</button>
        <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 16 }}>
          Contact admin if you don't have credentials
        </p>
      </div>
    </div>
  );
}

// ── Student Portal ────────────────────────────────────
function StudentPortal({ user, onLogout }) {
  const [myAttendance, setMyAttendance] = useState(null);
  const [activeTab, setActiveTab] = useState("attendance");
  const [enrollFile, setEnrollFile] = useState(null);
  const [enrollMsg, setEnrollMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchMyAttendance(); }, []);

  const fetchMyAttendance = async () => {
    try {
      const res = await axios.get(`${API}/attendance/my/${user.id}`);
      setMyAttendance(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSelfEnroll = async () => {
    if (!enrollFile) { setEnrollMsg("Please select a photo"); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", enrollFile);
    try {
      const res = await axios.post(`${API}/enroll`, formData, {
        params: { name: user.name, role: user.role, enrollment_no: user.enrollment_no }
      });
      setEnrollMsg(res.data.message);
    } catch (e) { setEnrollMsg("Enrollment failed"); }
    setLoading(false);
  };

  const totalDays = myAttendance?.total_days || 0;
  const percentage = Math.min(100, (totalDays / 30) * 100).toFixed(1);
  const pctColor = percentage >= 75 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "#1a3a6b", color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="https://media.uem.edu.in/uploads/sites/7/2021/03/cropped-logo.png"
            alt="UEM" style={{ height: 32, filter: "brightness(10)" }} />
          <div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Student Portal</span>
            <span style={{ marginLeft: 10, opacity: 0.8, fontSize: 13 }}>Welcome, {user.name}</span>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "6px 16px", borderRadius: 8, cursor: "pointer" }}>Logout</button>
      </div>

      <div style={{ maxWidth: 800, margin: "24px auto", padding: "0 16px" }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 20, display: "flex", gap: 20, alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ width: 60, height: 60, background: "#dbeafe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>👨‍🎓</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{user.name}</div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>{user.enrollment_no}</div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>{user.department} — Section {user.section}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: pctColor }}>{percentage}%</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Attendance</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["attendance", "📊 My Attendance"], ["enroll", "📸 Update Photo"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === tab ? "#1a3a6b" : "#e5e7eb",
              color: activeTab === tab ? "white" : "#374151", fontWeight: 600
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "attendance" && myAttendance && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 16px" }}>Attendance History</h2>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Total Present", value: totalDays, color: "#10b981" },
                { label: "Percentage", value: `${percentage}%`, color: pctColor },
                { label: "Status", value: percentage >= 75 ? "✅ Good" : "⚠️ Low", color: pctColor }
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "#f9fafb", borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{s.label}</div>
                </div>
              ))}
            </div>
            {myAttendance.logs.length === 0 ? (
              <p style={{ color: "#6b7280", textAlign: "center" }}>No attendance records found</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Date", "Time", "Confidence", "Camera"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myAttendance.logs.map((log, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "10px 12px" }}>{log.date}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.time}</td>
                      <td style={{ padding: "10px 12px", color: log.confidence > 0.7 ? "#10b981" : "#f59e0b" }}>
                        {(log.confidence * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.camera}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "enroll" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 8px" }}>Update Your Photo</h2>
            <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>Upload a clear front-facing photo for better recognition accuracy.</p>
            {enrollMsg && (
              <div style={{ padding: 12, borderRadius: 8, marginBottom: 16, background: enrollMsg.includes("failed") ? "#fee2e2" : "#d1fae5", color: enrollMsg.includes("failed") ? "#dc2626" : "#065f46" }}>{enrollMsg}</div>
            )}
            <input type="file" accept="image/*" onChange={e => setEnrollFile(e.target.files[0])} style={{ marginBottom: 16, display: "block" }} />
            <button onClick={handleSelfEnroll} disabled={loading} style={{
              padding: "10px 24px", background: "#1a3a6b", color: "white",
              border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600
            }}>{loading ? "Uploading..." : "Upload Photo"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Staff Portal ──────────────────────────────────────
function StaffPortal({ user, onLogout }) {
  const [todayLogs, setTodayLogs] = useState([]);
  const [persons, setPersons] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [myAttendance, setMyAttendance] = useState(null);
  const [enrollData, setEnrollData] = useState({ name: "", role: "student", enrollment_no: "", department: "", section: "", email: "", contact: "" });
  const [enrollFile, setEnrollFile] = useState(null);
  const [enrollMsg, setEnrollMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchToday(); fetchPersons(); fetchMyAttendance();
    const interval = setInterval(fetchToday, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchToday = async () => { try { const res = await axios.get(`${API}/attendance/today`); setTodayLogs(res.data); } catch (e) { } };
  const fetchPersons = async () => { try { const res = await axios.get(`${API}/persons`); setPersons(res.data); } catch (e) { } };
  const fetchMyAttendance = async () => { try { const res = await axios.get(`${API}/attendance/my/${user.id}`); setMyAttendance(res.data); } catch (e) { } };

  const handleEnroll = async () => {
    if (!enrollFile || !enrollData.name) { setEnrollMsg("Name and photo are required"); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", enrollFile);
    try {
      const res = await axios.post(`${API}/enroll`, formData, { params: enrollData });
      setEnrollMsg(res.data.message);
      fetchPersons();
    } catch (e) { setEnrollMsg("Enrollment failed"); }
    setLoading(false);
  };

  const tabs = [
    ["dashboard", "📊 Dashboard"],
    ["students", "👥 Students"],
    ["camera", "📸 Take Attendance"],
    ["enroll", "➕ Enroll"],
    ["myattendance", "📅 My Attendance"],
  ];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "#0f5132", color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="https://media.uem.edu.in/uploads/sites/7/2021/03/cropped-logo.png" alt="UEM" style={{ height: 32, filter: "brightness(10)" }} />
          <div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Staff Portal</span>
            <span style={{ marginLeft: 10, opacity: 0.8, fontSize: 13 }}>Welcome, {user.name}</span>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "6px 16px", borderRadius: 8, cursor: "pointer" }}>Logout</button>
      </div>

      <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {tabs.map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === tab ? "#0f5132" : "#e5e7eb",
              color: activeTab === tab ? "white" : "#374151", fontWeight: 600
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Present Today", value: todayLogs.length, color: "#10b981" },
                { label: "Total Enrolled", value: persons.length, color: "#1e40af" },
                { label: "Absent", value: Math.max(0, persons.length - todayLogs.length), color: "#ef4444" }
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: s.color, color: "white", padding: 20, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ opacity: 0.9 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Today's Attendance</h2>
                <button onClick={fetchToday} style={{ padding: "6px 14px", background: "#10b981", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>🔄 Refresh</button>
              </div>
              {todayLogs.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center" }}>No attendance marked yet</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      {["Name", "Enrollment No.", "Department", "Confidence", "Time", "Taken By"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayLogs.map((log, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{log.name}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.enrollment_no}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.department}</td>
                        <td style={{ padding: "10px 12px", color: log.confidence > 0.7 ? "#10b981" : "#f59e0b" }}>
                          {(log.confidence * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.time}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.taken_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 16px" }}>All Enrolled Persons ({persons.length})</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["Name", "Enrollment No.", "Department", "Section", "Role"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {persons.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.enrollment_no}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.department}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.section}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        background: p.role === "student" ? "#d1fae5" : "#dbeafe",
                        color: p.role === "student" ? "#065f46" : "#1e40af",
                        padding: "2px 10px", borderRadius: 20, fontSize: 12
                      }}>{p.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "camera" && <CameraAttendance user={user} />}

        {activeTab === "enroll" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, maxWidth: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 20px" }}>Enroll New Person</h2>
            {enrollMsg && (
              <div style={{ padding: 12, borderRadius: 8, marginBottom: 16, background: enrollMsg.includes("failed") ? "#fee2e2" : "#d1fae5", color: enrollMsg.includes("failed") ? "#dc2626" : "#065f46" }}>{enrollMsg}</div>
            )}
            {[
              { label: "Full Name *", key: "name", placeholder: "Rakesh Bangra" },
              { label: "Enrollment No. *", key: "enrollment_no", placeholder: "12023002001100" },
              { label: "Department", key: "department", placeholder: "B.Tech CSE" },
              { label: "Section", key: "section", placeholder: "B" },
              { label: "Email", key: "email", placeholder: "student@gmail.com" },
              { label: "Contact", key: "contact", placeholder: "9876543210" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 14 }}>{f.label}</label>
                <input value={enrollData[f.key]} onChange={e => setEnrollData({ ...enrollData, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Role</label>
              <select value={enrollData.role} onChange={e => setEnrollData({ ...enrollData, role: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Photo *</label>
              <input type="file" accept="image/*" onChange={e => setEnrollFile(e.target.files[0])}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleEnroll} disabled={loading} style={{
              width: "100%", padding: 12, background: loading ? "#9ca3af" : "#0f5132",
              color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer"
            }}>{loading ? "Enrolling..." : "Enroll"}</button>
          </div>
        )}

        {activeTab === "myattendance" && myAttendance && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 16px" }}>My Attendance</h2>
            <p style={{ color: "#6b7280" }}>Total present days: <strong>{myAttendance.total_days}</strong></p>
            {myAttendance.logs.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No records found</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Date", "Time", "Confidence", "Camera"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myAttendance.logs.map((log, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "10px 12px" }}>{log.date}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.time}</td>
                      <td style={{ padding: "10px 12px", color: log.confidence > 0.7 ? "#10b981" : "#f59e0b" }}>
                        {(log.confidence * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.camera}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin Portal ──────────────────────────────────────
function AdminPortal({ user, onLogout }) {
  const [persons, setPersons] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [setPwdData, setSetPwdData] = useState({ enrollment_no: "", password: "" });
  const [setPwdMsg, setSetPwdMsg] = useState("");

  useEffect(() => { fetchPersons(); fetchToday(); }, []);

  const fetchPersons = async () => { try { const res = await axios.get(`${API}/persons`); setPersons(res.data); } catch (e) { } };
  const fetchToday = async () => { try { const res = await axios.get(`${API}/attendance/today`); setTodayLogs(res.data); } catch (e) { } };

  const handleSetPassword = async () => {
    try {
      const res = await axios.post(`${API}/set-password`, null, { params: setPwdData });
      setSetPwdMsg(res.data.message);
    } catch (e) { setSetPwdMsg("Failed to set password"); }
  };

  const studentCount = persons.filter(p => p.role === "student" || p.role === "students").length;
  const staffCount = persons.filter(p => p.role === "staff" || p.role === "faculty").length;

  const tabs = [
    ["overview", "📊 Overview"],
    ["camera", "📸 Take Attendance"],
    ["users", "👥 All Users"],
    ["passwords", "🔑 Set Passwords"],
  ];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "#4c1d95", color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="https://media.uem.edu.in/uploads/sites/7/2021/03/cropped-logo.png" alt="UEM" style={{ height: 32, filter: "brightness(10)" }} />
          <div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Admin Portal</span>
            <span style={{ marginLeft: 10, opacity: 0.8, fontSize: 13 }}>Welcome, {user.name}</span>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "6px 16px", borderRadius: 8, cursor: "pointer" }}>Logout</button>
      </div>

      <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {tabs.map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === tab ? "#4c1d95" : "#e5e7eb",
              color: activeTab === tab ? "white" : "#374151", fontWeight: 600
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Total Users", value: persons.length, color: "#4c1d95" },
                { label: "Students", value: studentCount, color: "#1e40af" },
                { label: "Staff / Faculty", value: staffCount, color: "#065f46" },
                { label: "Present Today", value: todayLogs.length, color: "#10b981" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: s.color, color: "white", padding: 16, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ opacity: 0.9, fontSize: 13 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h2 style={{ margin: "0 0 16px" }}>Today's Attendance</h2>
              {todayLogs.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No attendance marked today</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      {["Name", "Enrollment No.", "Role", "Confidence", "Time", "Taken By"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayLogs.map((log, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{log.name}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.enrollment_no}</td>
                        <td style={{ padding: "10px 12px" }}>{log.role}</td>
                        <td style={{ padding: "10px 12px", color: log.confidence > 0.7 ? "#10b981" : "#f59e0b" }}>
                          {(log.confidence * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.time}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.taken_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "camera" && <CameraAttendance user={user} />}

        {activeTab === "users" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 16px" }}>All Users ({persons.length})</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["Name", "Enrollment No.", "Department", "Section", "Role", "Email", "Password"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {persons.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.enrollment_no}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.department}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.section}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        background: p.role === "student" || p.role === "students" ? "#d1fae5" : p.role === "admin" ? "#ede9fe" : "#dbeafe",
                        color: p.role === "student" || p.role === "students" ? "#065f46" : p.role === "admin" ? "#4c1d95" : "#1e40af",
                        padding: "2px 10px", borderRadius: 20, fontSize: 12
                      }}>{p.role}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>{p.email}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {p.has_password ? "✅ Set" : "❌ Not Set"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "passwords" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, maxWidth: 480, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 8px" }}>Set User Password</h2>
            <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>Set or reset password for any user by enrollment number.</p>
            {setPwdMsg && (
              <div style={{ padding: 12, borderRadius: 8, marginBottom: 16, background: setPwdMsg.includes("Failed") ? "#fee2e2" : "#d1fae5", color: setPwdMsg.includes("Failed") ? "#dc2626" : "#065f46" }}>{setPwdMsg}</div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Enrollment No.</label>
              <input value={setPwdData.enrollment_no} onChange={e => setSetPwdData({ ...setPwdData, enrollment_no: e.target.value })}
                placeholder="12023002001100"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 14 }}>New Password</label>
              <input type="password" value={setPwdData.password} onChange={e => setSetPwdData({ ...setPwdData, password: e.target.value })}
                placeholder="Enter new password"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <button onClick={handleSetPassword} style={{
              width: "100%", padding: 12, background: "#4c1d95", color: "white",
              border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer"
            }}>Set Password</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(getUser());

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { clearUser(); setUser(null); };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const role = user.role?.toLowerCase();
  if (role === "student" || role === "students") return <StudentPortal user={user} onLogout={handleLogout} />;
  if (role === "staff" || role === "faculty") return <StaffPortal user={user} onLogout={handleLogout} />;
  if (role === "admin") return <AdminPortal user={user} onLogout={handleLogout} />;

  return <div style={{ padding: 40, textAlign: "center" }}>Unknown role: {user.role}</div>;
}