import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [todayLogs, setTodayLogs] = useState([]);
  const [persons, setPersons] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Aaj ki attendance fetch karo
  const fetchToday = async () => {
    try {
      const res = await axios.get(`${API}/attendance/today`);
      setTodayLogs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Enrolled persons fetch karo
  const fetchPersons = async () => {
    try {
      const res = await axios.get(`${API}/persons`);
      setPersons(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchToday();
    fetchPersons();
    // Har 10 second mein auto refresh
    const interval = setInterval(fetchToday, 10000);
    return () => clearInterval(interval);
  }, []);

  // Enrollment form
  const [enrollData, setEnrollData] = useState({
    name: "", role: "student", roll_number: ""
  });
  const [enrollFile, setEnrollFile] = useState(null);

  const handleEnroll = async () => {
    if (!enrollFile || !enrollData.name) {
      setMessage("Naam aur photo dono chahiye!");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", enrollFile);
    try {
      const res = await axios.post(
        `${API}/enroll?name=${enrollData.name}&role=${enrollData.role}&roll_number=${enrollData.roll_number}`,
        formData
      );
      setMessage(res.data.message);
      fetchPersons();
    } catch (e) {
      setMessage("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div style={{ background: "#1e40af", color: "white", padding: "16px 24px", borderRadius: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🎓 Attendance System</h1>
        <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>AI-Powered Face Recognition</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["dashboard", "enroll", "persons"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === tab ? "#1e40af" : "#e5e7eb",
              color: activeTab === tab ? "white" : "#374151",
              fontWeight: 600, textTransform: "capitalize"
            }}>
            {tab === "dashboard" ? "📊 Dashboard" : tab === "enroll" ? "➕ Enroll" : "👥 Persons"}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Aaj ki Attendance</h2>
            <button onClick={fetchToday}
              style={{ padding: "6px 16px", background: "#10b981", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
              🔄 Refresh
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Present", value: todayLogs.length, color: "#10b981" },
              { label: "Enrolled", value: persons.length, color: "#1e40af" },
              { label: "Absent", value: Math.max(0, persons.length - todayLogs.length), color: "#ef4444" }
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, background: stat.color, color: "white",
                padding: 20, borderRadius: 12, textAlign: "center"
              }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stat.value}</div>
                <div style={{ opacity: 0.9 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Logs table */}
          {todayLogs.length === 0 ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>
              Abhi tak koi attendance mark nahi hui
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["Naam", "Roll", "Role", "Confidence", "Time", "Camera"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{log.name}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.roll_number || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        background: log.role === "faculty" ? "#dbeafe" : "#d1fae5",
                        color: log.role === "faculty" ? "#1e40af" : "#065f46",
                        padding: "2px 8px", borderRadius: 20, fontSize: 12
                      }}>{log.role}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: log.confidence > 0.7 ? "#10b981" : "#f59e0b" }}>
                      {(log.confidence * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{log.time}</td>
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
        <div style={{ maxWidth: 480 }}>
          <h2>Naya Person Enroll Karo</h2>
          {message && (
            <div style={{
              padding: 12, borderRadius: 8, marginBottom: 16,
              background: message.includes("Error") ? "#fee2e2" : "#d1fae5",
              color: message.includes("Error") ? "#dc2626" : "#065f46"
            }}>{message}</div>
          )}
          {[
            { label: "Naam *", key: "name", placeholder: "Rakesh Bangra" },
            { label: "Roll Number", key: "roll_number", placeholder: "21CSE001" },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>{field.label}</label>
              <input value={enrollData[field.key]}
                onChange={e => setEnrollData({ ...enrollData, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Role</label>
            <select value={enrollData.role}
              onChange={e => setEnrollData({ ...enrollData, role: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Photo Upload *</label>
            <input type="file" accept="image/*"
              onChange={e => setEnrollFile(e.target.files[0])}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <button onClick={handleEnroll} disabled={loading}
            style={{
              width: "100%", padding: "12px", background: loading ? "#9ca3af" : "#1e40af",
              color: "white", border: "none", borderRadius: 8, fontSize: 16,
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer"
            }}>
            {loading ? "Enrolling..." : "✓ Enroll Karo"}
          </button>
        </div>
      )}

      {/* Persons Tab */}
      {activeTab === "persons" && (
        <div>
          <h2>Enrolled Persons ({persons.length})</h2>
          {persons.length === 0 ? (
            <p style={{ color: "#6b7280" }}>Koi enrolled person nahi hai abhi</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {persons.map(p => (
                <div key={p.id} style={{ background: "#f9fafb", padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>
                    {p.role === "faculty" ? "👨‍🏫" : p.role === "staff" ? "👷" : "👨‍🎓"}
                  </div>
                  <div style={{ fontWeight: 600, textAlign: "center" }}>{p.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center" }}>{p.roll || "-"}</div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span style={{
                      background: p.role === "faculty" ? "#dbeafe" : "#d1fae5",
                      color: p.role === "faculty" ? "#1e40af" : "#065f46",
                      padding: "2px 10px", borderRadius: 20, fontSize: 12
                    }}>{p.role}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}