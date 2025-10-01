// src/pages/teacher/TeacherDashboard.tsx
import { useEffect, useState } from "react";
import { teacherApi } from "../../api/teacherApi";
import { useNavigate } from "react-router-dom";

interface QrSession {
  sessionId: string;
  qrData: string;
  classId: number;
  expiresAt: string;
  prevData?: string;
}

interface Class {
  id: number;
  name: string;
  teacherId: number;
  isAttendanceOpen: boolean;
  createdAt: string;
  teacher: {
    userId: number;
    name: string;
    email: string;
  };
  enrollments: {
    id: number;
    classId: number;
    studentId: number;
  }[];
}

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [qrSession, setQrSession] = useState<QrSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [fade, setFade] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // 🔹 Load classes from backend
  useEffect(() => {
    async function loadClasses() {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError("No authentication token found");
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:3000/teacher/my-classes', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch classes: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("API Response:", data); // Debug log
        
        // Handle response format: { total: number, classes: Class[] }
        if (data && Array.isArray(data.classes)) {
          setClasses(data.classes);
        } else if (Array.isArray(data)) {
          // Fallback: if API returns array directly
          setClasses(data);
        } else {
          console.error("Expected array or object with classes property, but got:", typeof data, data);
          setClasses([]);
          setError("Invalid response format from server");
        }
      } catch (err) {
        console.error("Error loading classes:", err);
        setError(err instanceof Error ? err.message : "Failed to load classes");
        setClasses([]); // Ensure classes is always an array
      } finally {
        setLoading(false);
      }
    }
    
    loadClasses();
  }, []);

  // 🔹 Start session
  const handleStartQr = async () => {
    if (!selected) return alert("Please select a class first");
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Authentication token not found");
        return;
      }

      // Open attendance first
      const attendanceResponse = await fetch('http://localhost:3000/teacher/open-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ classId: selected }),
      });

      if (!attendanceResponse.ok) {
        const error = await attendanceResponse.json();
        throw new Error(error.message || "Failed to open attendance");
      }

      // Start QR session
      const data = await teacherApi.startSession(selected.toString());
      setQrSession({ ...data, classId: selected, prevData: "" });
      setTimeLeft(30);

      // Update local state to reflect attendance is open
      setClasses(prev => prev.map(cls => 
        cls.id === selected ? { ...cls, isAttendanceOpen: true } : cls
      ));
    } catch (err) {
      console.error("Error starting session:", err);
      alert(err instanceof Error ? err.message : "Failed to start QR session");
    }
  };

  // 🔹 Stop session
  const handleEndQr = async () => {
    if (!qrSession) return;
    
    const classId = qrSession.classId;
    
    try {
      const token = localStorage.getItem('token');
      
      // Stop QR session
      await teacherApi.stopSession(qrSession.sessionId);

      // Close attendance
      if (token) {
        const attendanceResponse = await fetch('http://localhost:3000/teacher/close-attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ classId }),
        });

        if (!attendanceResponse.ok) {
          const error = await attendanceResponse.json();
          console.error("Failed to close attendance:", error.message);
        }

        // Update local state to reflect attendance is closed
        setClasses(prev => prev.map(cls => 
          cls.id === classId ? { ...cls, isAttendanceOpen: false } : cls
        ));
      }
    } catch (err) {
      console.error("Error stopping session:", err);
    } finally {
      setQrSession(null);
      setTimeLeft(0);
    }
  };

  // 🔹 Countdown
  useEffect(() => {
    if (!qrSession) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleEndQr();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrSession]);

  // 🔹 Auto-refresh QR every 5s (smooth fade + scale)
  useEffect(() => {
    if (!qrSession) return;

    const interval = setInterval(async () => {
      try {
        setFade(false); // fade-out + shrink
        setTimeout(async () => {
          const data = await teacherApi.getActiveSession();
          if (data?.qrData) {
            setQrSession((prev) =>
              prev
                ? { ...data, classId: prev.classId, prevData: prev.qrData }
                : data
            );
          }
          setFade(true); // fade-in + grow
        }, 300);
      } catch (err) {
        console.error("Error refreshing QR:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [qrSession]);

  // 🔹 Progress circle
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = ((30 - timeLeft) / 30) * circumference;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">📚 Teacher Dashboard</h1>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading your classes...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Class Selector */}
      {!loading && !error && (
        <div className="flex gap-3 items-center">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : "")}
            className="border px-3 py-2 rounded min-w-[300px]"
          >
            <option value="">-- Select Class --</option>
            {Array.isArray(classes) && classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.enrollments.length} student{cls.enrollments.length !== 1 ? 's' : ''})
              </option>
            ))}
          </select>

          {!qrSession && (
            <button
              onClick={handleStartQr}
              disabled={!selected}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Start QR
            </button>
          )}
        </div>
      )}

      {/* Classes Summary */}
      {!loading && !error && Array.isArray(classes) && classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              onClick={() => navigate(`/teacher/attendance/${cls.id}`)}
            >
              <h3 className="font-semibold text-lg">{cls.name} </h3>
              <p>id : {cls.id}</p>
              <p className="text-sm text-gray-600 mt-1">
                {cls.enrollments.length} enrolled student{cls.enrollments.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Created: {new Date(cls.createdAt).toLocaleDateString()}
              </p>
              {cls.isAttendanceOpen && (
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Attendance Open
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Classes Message */}
      {!loading && !error && Array.isArray(classes) && classes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>You don't have any classes yet.</p>
        </div>
      )}

      {/* Fullscreen QR */}
      {qrSession && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-md z-50">
          <div className="relative bg-white p-6 rounded-2xl shadow-lg text-center">
            {/* Close */}
            <button
              onClick={handleEndQr}
              className="absolute top-2 right-2 text-gray-600 hover:text-red-600 text-xl"
            >
              ✖
            </button>

            {/* Class Name */}
            <h2 className="text-lg font-semibold mb-3">
              {classes.find((c) => c.id === qrSession.classId)?.name || "Unknown Class"}
            </h2>

            {/* QR with fade + scale */}
            <div className="relative w-80 h-80 mx-auto">
              {qrSession.prevData && (
                <img
                  src={qrSession.prevData}
                  alt="Old QR"
                  className={`absolute inset-0 w-full h-full object-contain transition-all duration-300 ${
                    fade ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  }`}
                />
              )}
              <img
                src={qrSession.qrData}
                alt="QR Code"
                className={`absolute inset-0 w-full h-full object-contain transition-all duration-300 ${
                  fade ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
              />
            </div>

            {/* Timer */}
            <div className="relative flex justify-center items-center mt-6">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#e5e7eb"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#2563eb"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-lg font-semibold text-gray-700">
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}