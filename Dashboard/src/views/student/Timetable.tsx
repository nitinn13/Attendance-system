// src/views/student/Timetable.tsx
import React, { useState, useEffect } from "react";
import { studentApi } from "../../api/studentApi";
import QrScanner from "../../types/QrScanner";

interface Class {
  id: number;
  name: string;
  isAttendanceOpen: boolean;
}

export default function Timetable() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [message, setMessage] = useState<string>("");
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Replace with logged-in studentId (later from auth/store)
  const studentId = "STU123";

  // 🔹 Load student classes from backend
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

        const response = await fetch('http://localhost:3000/student/my-classes', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch classes: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned invalid response format');
        }

        const data = await response.json();
        console.log('Student classes data:', data);
        
        // Handle response format: { total: number, classes: Class[] }
        if (data && Array.isArray(data.classes)) {
          setClasses(data.classes);
        } else if (Array.isArray(data)) {
          setClasses(data);
        } else {
          console.error("Expected array or object with classes property");
          setClasses([]);
          setError("Invalid response format from server");
        }
      } catch (err) {
        console.error("Error loading classes:", err);
        setError(err instanceof Error ? err.message : "Failed to load classes");
        setClasses([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadClasses();
  }, []);

  // Fetch active session
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await studentApi.getActiveSession();
        setActiveSession(res);
      } catch {
        setActiveSession(null);
      }
    }
    fetchSession();
  }, []);

  // Handle QR scan result
  const handleScan = async (result: string | null) => {
    if (!result || scanned || !selectedClass) return;
    setScanned(true);

    try {
      const parsed = JSON.parse(result); 
      setLastResult({ raw: result, parsed });
      setMessage("Verifying QR code...");
      console.log('Parsed:', parsed.classId);

      // Verify the QR code is valid for this class
      if (parsed.classId !== selectedClass.id) {
        throw new Error("QR code is for a different class");
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Mark attendance via API
      const response = await fetch('http://localhost:3000/student/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ classId: selectedClass.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark attendance');
      }

      const data = await response.json();
      console.log('Attendance marked:', data);

      // Update local state
      setAttendance((prev) => ({ ...prev, [selectedClass.id]: true }));
      setMessage("✅ " + (data.message || "Attendance marked successfully!"));

      // Close modal after delay
      setTimeout(() => {
        setScanning(false);
        setMessage("");
        setSelectedClass(null);
        setScanned(false);
      }, 2000);
    } catch (err: any) {
      console.error("Attendance submission failed:", err);
      const errorMessage = err.message || err.response?.data?.message || "Failed to mark attendance";
      setMessage("❌ " + errorMessage);
      setScanned(false); // allow retry
      
      // Auto-hide error after 3 seconds but keep modal open
      setTimeout(() => {
        setMessage("");
      }, 3000);
    }
  };

  const handleRecordAttendance = (cls: Class) => {
    setSelectedClass(cls);
    setScanning(true);
    setScanned(false);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-semibold text-gray-900">My Classes</h1>
          <p className="text-gray-500 mt-1">View your enrolled classes and mark attendance</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading your classes...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800">
            <strong className="font-medium">Error:</strong> {error}
          </div>
        )}

        {/* Classes Grid */}
        {!loading && !error && Array.isArray(classes) && classes.length > 0 && (
          <div className="grid gap-4">
            {classes.map((cls) => {
              const hasAttendance = attendance[cls.id];
              const isActive = cls.isAttendanceOpen;

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">{cls.name}</h2>
                        {isActive && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                            Attendance Open
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Class ID: #{cls.id}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {hasAttendance ? (
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Attendance Recorded
                        </div>
                      ) : isActive ? (
                        <button
                          onClick={() => handleRecordAttendance(cls)}
                          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Scan QR Code
                        </button>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Attendance Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Classes Message */}
        {!loading && !error && Array.isArray(classes) && classes.length === 0 && (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="mt-4 text-gray-500">You are not enrolled in any classes</p>
            <p className="mt-1 text-sm text-gray-400">Contact your teacher to get enrolled</p>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {scanning && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Scan QR Code
              </h2>
              <p className="text-gray-600">{selectedClass.name}</p>
            </div>

            {/* Live QR Scanner */}
            <div className="w-full aspect-square border-4 border-blue-600 rounded-xl overflow-hidden flex items-center justify-center bg-gray-900 mb-6">
              <QrScanner
                onDecode={(result) => handleScan(result)}
                onError={(error) => console.error("QR Scan Error:", error)}
              />
            </div>

            {/* Status message */}
            {message && (
              <div className={`text-center p-3 rounded-lg mb-4 ${
                message.includes("✅")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : message.includes("❌")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                <p className="font-medium">{message}</p>
              </div>
            )}

            {/* Cancel button */}
            <button
              onClick={() => {
                setScanning(false);
                setSelectedClass(null);
                setMessage("");
              }}
              className="w-full px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}