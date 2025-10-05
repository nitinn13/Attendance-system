// src/pages/teacher/ClassAttendance.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BACKEND_API } from '../../api/config';

interface AttendanceRecord {
    userId: number;
    name: string;
    status: 'PRESENT' | 'ABSENT';
}

interface ClassInfo {
    id: number;
    name: string;
}

export default function ClassAttendance() {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!classId) {
            setError("No class ID provided");
            setLoading(false);
            return;
        }

        loadAttendance();
    }, [classId]);

    const loadAttendance = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                setError("Authentication token not found");
                setLoading(false);
                return;
            }

            // Fetch attendance data
            const response = await fetch(`${BACKEND_API}/teacher/attendance?classId=${classId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                credentials: "include",
            });

            if (!response.ok) {
                let errorMessage = 'Failed to fetch attendance';
                try {
                    const error = await response.json();
                    errorMessage = error.message || errorMessage;
                } catch {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned invalid response format. Please check if you are logged in.');
            }

            const data: AttendanceRecord[] = await response.json();
            console.log('Attendance data:', data);
            setAttendance(data);

            // Fetch class info
            const classResponse = await fetch(`${BACKEND_API}/teacher/my-classes`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                credentials: "include",
            });

            if (classResponse.ok) {
                const classContentType = classResponse.headers.get('content-type');
                if (classContentType && classContentType.includes('application/json')) {
                    const classData = await classResponse.json();
                    console.log('Class data:', classData);
                    const currentClass = classData.classes?.find((c: any) => c.id === Number(classId));
                    if (currentClass) {
                        setClassInfo({ id: currentClass.id, name: currentClass.name });
                    }
                }
            }
        } catch (err) {
            console.error('Error loading attendance:', err);
            setError(err instanceof Error ? err.message : 'Failed to load attendance');
            setAttendance([]); // Ensure attendance is always an array
        } finally {
            setLoading(false);
        }
    };

    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
    const attendanceRate = attendance.length > 0
        ? Math.round((presentCount / attendance.length) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <button
                        onClick={() => navigate('/teacher/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-semibold text-gray-900">
                        {classInfo ? classInfo.name : 'Class Attendance'}
                    </h1>
                    <p className="text-gray-500 mt-1">View attendance records for this class</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-600">Loading attendance...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800">
                        <strong className="font-medium">Error:</strong> {error}
                    </div>
                )}

                {/* Content */}
                {!loading && !error && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Total Students */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Students</p>
                                        <p className="text-3xl font-semibold text-gray-900 mt-2">{attendance.length}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Present */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Present</p>
                                        <p className="text-3xl font-semibold text-green-600 mt-2">{presentCount}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Absent */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Absent</p>
                                        <p className="text-3xl font-semibold text-red-600 mt-2">{absentCount}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Rate Bar */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-medium text-gray-900">Attendance Rate</h3>
                                <span className="text-2xl font-semibold text-blue-600">{attendanceRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                                    style={{ width: `${attendanceRate}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Student List</h3>
                            </div>

                            {attendance.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="mt-4 text-gray-500">No students enrolled in this class</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Student ID
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {attendance.map((record) => (
                                                <tr key={record.userId} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        #{record.userId}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                                                <span className="text-blue-600 font-medium text-sm">
                                                                    {record.name.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">{record.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {record.status === 'PRESENT' ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                                                Present
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                                                                Absent
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex gap-4">
                            <button
                                onClick={loadAttendance}
                                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}