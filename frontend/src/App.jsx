import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

// ── Auth helpers ──────────────────────────────────────
const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
const setUser = (u) => localStorage.setItem("user", JSON.stringify(u));
const clearUser = () => localStorage.removeItem("user");

// ── Components ────────────────────────────────────────

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
      <div style={{
        background: "white", borderRadius: 16, padding: 40, width: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎓</div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#1e3a8a", fontWeight: 700 }}>
            Attendance System
          </h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>
            UEM Jaipur — AI Powered
          </p>
        </div>

        {error && (
          <div style={{
            background: "#fee2e2", color: "#dc2626", padding: "10px 14px",
            borderRadius: 8, marginBottom: 16, fontSize: 14
          }}>{error}</div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>
            Enrollment Number
          </label>
          <input
            value={enrollmentNo}
            onChange={e => setEnrollmentNo(e.target.value)}
            placeholder="e.g. 12023002001100"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter your password"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box"
            }}
          />
        </div>

        <button
          onClick={handleLogin} disabled={loading}
          style={{
            width: "100%", padding: 12, background: loading ? "#93c5fd" : "#1e40af",
            color: "white", border: "none", borderRadius: 8, fontSize: 16,
            fontWeight: 600, cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
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
        params: {
          name: user.name, role: user.role,
          enrollment_no: user.enrollment_no
        }
      });
      setEnrollMsg(res.data.message);
    } catch (e) { setEnrollMsg("Enrollment failed"); }
    setLoading(false);
  };

  const percentage = myAttendance
    ? myAttendance.total_days > 0
      ? (myAttendance.total_days > 0 ? Math.min(100, myAttendance.total_days).toFixed(1) : 0)
      : 0
    : 0;

  const pctColor = percentage >= 75 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Header */}
      <div style={{
        background: "#1e40af", color: "white", padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>🎓 Student Portal</span>
          <span style={{ marginLeft: 12, opacity: 0.8, fontSize: 14 }}>
            Welcome, {user.name}
          </span>
        </div>
        <button onClick={onLogout} style={{
          background: "rgba(255,255,255,0.2)", border: "none", color: "white",
          padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14
        }}>Logout</button>
      </div>

      <div style={{ maxWidth: 800, margin: "24px auto", padding: "0 16px" }}>
        {/* Profile card */}
        <div style={{
          background: "white", borderRadius: 12, padding: 20, marginBottom: 20,
          display: "flex", gap: 20, alignItems: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{
            width: 64, height: 64, background: "#dbeafe", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28
          }}>👨‍🎓</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>{user.name}</div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>{user.enrollment_no}</div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>{user.department} — Section {user.section}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: pctColor }}>{percentage}%</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Attendance</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["attendance", "📊 My Attendance"], ["enroll", "📸 Update Photo"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === tab ? "#1e40af" : "#e5e7eb",
              color: activeTab === tab ? "white" : "#374151", fontWeight: 600
            }}>{label}</button>
          ))}
        </div>

        {/* Attendance Tab */}
        {activeTab === "attendance" && myAttendance && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 16px", color: "#111827" }}>My Attendance History</h2>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Total Present", value: myAttendance.total_days, color: "#10b981" },
                { label: "Percentage", value: `${percentage}%`, color: pctColor },
                { label: "Status", value: percentage >= 75 ? "✅ Good" : "⚠️ Low", color: pctColor }
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: "#f9fafb", borderRadius: 10, padding: 16, textAlign: "center"
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
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
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, color: "#374151" }}>{h}</th>
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

        {/* Enroll Tab */}
        {activeTab === "enroll" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 8px", color: "#111827" }}>Update Your Photo</h2>
            <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
              Upload a clear front-facing photo for better face recognition accuracy.
            </p>
            {enrollMsg && (
              <div style={{
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: enrollMsg.includes("failed") ? "#fee2e2" : "#d1fae5",
                color: enrollMsg.includes("failed") ? "#dc2626" : "#065f46"
              }}>{enrollMsg}</div>
            )}
            <input type="file" accept="image/*" onChange={e => setEnrollFile(e.target.files[0])}
              style={{ marginBottom: 16, display: "block" }} />
            <button onClick={handleSelfEnroll} disabled={loading} style={{
              padding: "10px 24px", background: "#1e40af", color: "white",
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

  const fetchToday = async () => {
    try { const res = await axios.get(`${API}/attendance/today`); setTodayLogs(res.data); }
    catch (e) { console.error(e); }
  };
  const fetchPersons = async () => {
    try { const res = await axios.get(`${API}/persons`); setPersons(res.data); }
    catch (e) { console.error(e); }
  };
  const fetchMyAttendance = async () => {
    try { const res = await axios.get(`${API}/attendance/my/${user.id}`); setMyAttendance(res.data); }
    catch (e) { console.error(e); }
  };

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
    ["enroll", "➕ Enroll"],
    ["myattendance", "📅 My Attendance"],
  ];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{
        background: "#065f46", color: "white", padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>👨‍🏫 Staff Portal</span>
          <span style={{ marginLeft: 12, opacity: 0.8, fontSize: 14 }}>Welcome, {user.name}</span>
        </div>
        <button onClick={onLogout} style={{
          background: "rgba(255,255,255,0.2)", border: "none", color: "white",
          padding: "6px 16px", borderRadius: 8, cursor: "pointer"
        }}>Logout</button>
      </div>

      <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {tabs.map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === tab ? "#065f46" : "#e5e7eb",
              color: activeTab === tab ? "white" : "#374151", fontWeight: 600
            }}>{label}</button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Present Today", value: todayLogs.length, color: "#10b981" },
                { label: "Total Enrolled", value: persons.length, color: "#1e40af" },
                { label: "Absent", value: Math.max(0, persons.length - todayLogs.length), color: "#ef4444" }
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: s.color, color: "white",
                  padding: 20, borderRadius: 12, textAlign: "center"
                }}>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ opacity: 0.9 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Today's Attendance</h2>
                <button onClick={fetchToday} style={{
                  padding: "6px 14px", background: "#10b981", color: "white",
                  border: "none", borderRadius: 8, cursor: "pointer"
                }}>🔄 Refresh</button>
              </div>
              {todayLogs.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center" }}>No attendance marked yet</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      {["Name", "Enrollment No.", "Department", "Section", "Confidence", "Time"].map(h => (
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
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.section}</td>
                        <td style={{ padding: "10px 12px", color: log.confidence > 0.7 ? "#10b981" : "#f59e0b" }}>
                          {(log.confidence * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Students */}
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
                        background: p.role === "faculty" || p.role === "staff" ? "#dbeafe" : "#d1fae5",
                        color: p.role === "faculty" || p.role === "staff" ? "#1e40af" : "#065f46",
                        padding: "2px 10px", borderRadius: 20, fontSize: 12
                      }}>{p.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Enroll */}
        {activeTab === "enroll" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, maxWidth: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 20px" }}>Enroll New Person</h2>
            {enrollMsg && (
              <div style={{
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: enrollMsg.includes("failed") || enrollMsg.includes("error") ? "#fee2e2" : "#d1fae5",
                color: enrollMsg.includes("failed") || enrollMsg.includes("error") ? "#dc2626" : "#065f46"
              }}>{enrollMsg}</div>
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
              width: "100%", padding: 12, background: loading ? "#9ca3af" : "#065f46",
              color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer"
            }}>{loading ? "Enrolling..." : "✓ Enroll"}</button>
          </div>
        )}

        {/* My Attendance */}
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

  const fetchPersons = async () => {
    try { const res = await axios.get(`${API}/persons`); setPersons(res.data); } catch (e) { }
  };
  const fetchToday = async () => {
    try { const res = await axios.get(`${API}/attendance/today`); setTodayLogs(res.data); } catch (e) { }
  };
  const handleSetPassword = async () => {
    try {
      const res = await axios.post(`${API}/set-password`, null, { params: setPwdData });
      setSetPwdMsg(res.data.message);
    } catch (e) { setSetPwdMsg("Failed to set password"); }
  };

  const tabs = [
    ["overview", "📊 Overview"],
    ["users", "👥 All Users"],
    ["passwords", "🔑 Set Passwords"],
    ["reports", "📋 Reports"],
  ];

  const studentCount = persons.filter(p => p.role === "student").length;
  const staffCount = persons.filter(p => p.role === "staff" || p.role === "faculty").length;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{
        background: "#7c3aed", color: "white", padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>⚙️ Admin Portal</span>
          <span style={{ marginLeft: 12, opacity: 0.8, fontSize: 14 }}>Welcome, {user.name}</span>
        </div>
        <button onClick={onLogout} style={{
          background: "rgba(255,255,255,0.2)", border: "none", color: "white",
          padding: "6px 16px", borderRadius: 8, cursor: "pointer"
        }}>Logout</button>
      </div>

      <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {tabs.map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === tab ? "#7c3aed" : "#e5e7eb",
              color: activeTab === tab ? "white" : "#374151", fontWeight: 600
            }}>{label}</button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Total Users", value: persons.length, color: "#7c3aed" },
                { label: "Students", value: studentCount, color: "#1e40af" },
                { label: "Staff / Faculty", value: staffCount, color: "#065f46" },
                { label: "Present Today", value: todayLogs.length, color: "#10b981" },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: s.color, color: "white",
                  padding: 16, borderRadius: 12, textAlign: "center"
                }}>
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
                      {["Name", "Enrollment No.", "Role", "Confidence", "Time"].map(h => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 16px" }}>All Users ({persons.length})</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["Name", "Enrollment No.", "Department", "Section", "Role", "Email"].map(h => (
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
                        background: p.role === "student" ? "#d1fae5" : p.role === "faculty" ? "#dbeafe" : "#ede9fe",
                        color: p.role === "student" ? "#065f46" : p.role === "faculty" ? "#1e40af" : "#7c3aed",
                        padding: "2px 10px", borderRadius: 20, fontSize: 12
                      }}>{p.role}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>{p.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Set Passwords */}
        {activeTab === "passwords" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, maxWidth: 480, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 8px" }}>Set User Password</h2>
            <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
              Set or reset password for any user by enrollment number.
            </p>
            {setPwdMsg && (
              <div style={{
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: setPwdMsg.includes("Failed") ? "#fee2e2" : "#d1fae5",
                color: setPwdMsg.includes("Failed") ? "#dc2626" : "#065f46"
              }}>{setPwdMsg}</div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Enrollment No.</label>
              <input value={setPwdData.enrollment_no}
                onChange={e => setSetPwdData({ ...setPwdData, enrollment_no: e.target.value })}
                placeholder="12023002001100"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 14 }}>New Password</label>
              <input type="password" value={setPwdData.password}
                onChange={e => setSetPwdData({ ...setPwdData, password: e.target.value })}
                placeholder="Enter new password"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <button onClick={handleSetPassword} style={{
              width: "100%", padding: 12, background: "#7c3aed", color: "white",
              border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer"
            }}>Set Password</button>
          </div>
        )}

        {/* Reports */}
        {activeTab === "reports" && (
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 16px" }}>Attendance Reports</h2>
            <p style={{ color: "#6b7280" }}>Per-student reports coming soon. Use the export API for now:</p>
            <code style={{
              display: "block", background: "#f3f4f6", padding: 12, borderRadius: 8,
              fontSize: 13, color: "#374151", marginTop: 12
            }}>
              GET http://127.0.0.1:8000/attendance/export
            </code>
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