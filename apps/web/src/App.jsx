import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import {AuthProvider, useAuth} from './context/AuthContext';
import {ThemeProvider} from './context/ThemeContext';
import {ToastProvider} from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/Login';
import Developers from './pages/Developers';
import Profile from './pages/Profile';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import HodDashboard from './pages/HodDashboard';
import LeadershipDashboard from './pages/LeadershipDashboard';
import AdminDashboard from './pages/AdminDashboard';
import FileComplaint from './pages/FileComplaint';
import MyComplaints from './pages/MyComplaints';
import AssignedComplaints from './pages/AssignedComplaints';
import CollegeComplaints from './pages/CollegeComplaints';
import InboundComplaints from './pages/InboundComplaints';
import OutboundComplaints from './pages/OutboundComplaints';
import UserManagement from './pages/UserManagement';
import GovernanceManagement from './pages/GovernanceManagement';
import BulkOperations from './pages/BulkOperations';
import MetricsAnalytics from './pages/MetricsAnalytics';

function ProtectedRoute({children, allowedRoles = [], requireHod = false, requireLeadership = false}) {
    const {user, loading, isLeadership, isHod} = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"/>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace/>;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace/>;
    }

    if (requireLeadership && !isLeadership) {
        return <Navigate to="/" replace/>;
    }

    if (requireHod && !isHod && !isLeadership) {
        return <Navigate to="/" replace/>;
    }

    return children;
}

function RoleHomeRedirect() {
    const {user, loading, isAdmin, isLeadership, isHod} = useAuth();

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace/>;
    if (isAdmin) return <Navigate to="/admin/dashboard" replace/>;
    if (isLeadership) return <Navigate to="/leadership/dashboard" replace/>;
    if (isHod) return <Navigate to="/hod/dashboard" replace/>;
    if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace/>;
    return <Navigate to="/student/dashboard" replace/>;
}

export default function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<Login/>}/>
                            <Route path="/developers" element={<Developers/>}/>

                            <Route
                                element={
                                    <ProtectedRoute>
                                        <AppLayout/>
                                    </ProtectedRoute>
                                }
                            >
                                <Route path="/" element={<RoleHomeRedirect/>}/>
                                <Route path="/profile" element={<Profile/>}/>

                                <Route path="/complaints/file" element={<FileComplaint/>}/>
                                <Route path="/complaints/my" element={<MyComplaints/>}/>
                                <Route
                                    path="/complaints/assigned"
                                    element={
                                        <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                                            <AssignedComplaints/>
                                        </ProtectedRoute>
                                    }
                                />

                                <Route
                                    path="/complaints/inbound"
                                    element={
                                        <ProtectedRoute allowedRoles={['faculty', 'admin']} requireHod={true}>
                                            <InboundComplaints/>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/complaints/outbound"
                                    element={
                                        <ProtectedRoute allowedRoles={['faculty', 'admin']} requireHod={true}>
                                            <OutboundComplaints/>
                                        </ProtectedRoute>
                                    }
                                />

                                <Route
                                    path="/complaints/college"
                                    element={
                                        <ProtectedRoute allowedRoles={['admin', 'faculty']} requireLeadership={true}>
                                            <CollegeComplaints/>
                                        </ProtectedRoute>
                                    }
                                />

                                <Route
                                    path="/metrics"
                                    element={
                                        <ProtectedRoute allowedRoles={['admin', 'faculty']} requireHod={true}>
                                            <MetricsAnalytics/>
                                        </ProtectedRoute>
                                    }
                                />

                                <Route
                                    path="/users"
                                    element={
                                        <ProtectedRoute allowedRoles={['admin', 'faculty']} requireHod={true}>
                                            <UserManagement/>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="/admin/users" element={<Navigate to="/users" replace/>}/>

                                <Route
                                    path="/student/dashboard"
                                    element={
                                        <ProtectedRoute allowedRoles={['student']}>
                                            <StudentDashboard/>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/faculty/dashboard"
                                    element={
                                        <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                                            <FacultyDashboard/>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/hod/dashboard"
                                    element={
                                        <ProtectedRoute allowedRoles={['faculty', 'admin']} requireHod={true}>
                                            <HodDashboard/>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/leadership/dashboard"
                                    element={
                                        <ProtectedRoute allowedRoles={['faculty', 'admin']} requireLeadership={true}>
                                            <LeadershipDashboard/>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/dashboard"
                                    element={
                                        <ProtectedRoute allowedRoles={['admin']}>
                                            <AdminDashboard/>
                                        </ProtectedRoute>
                                    }
                                />

                                <Route
                                    path="/admin/governance"
                                    element={
                                        <ProtectedRoute allowedRoles={['admin']}>
                                            <GovernanceManagement/>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/bulk"
                                    element={
                                        <ProtectedRoute allowedRoles={['admin']}>
                                            <BulkOperations/>
                                        </ProtectedRoute>
                                    }
                                />
                            </Route>

                            <Route path="*" element={<Navigate to="/" replace/>}/>
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}