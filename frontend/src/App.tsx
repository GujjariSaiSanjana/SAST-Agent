import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewScanPage from './pages/NewScanPage';
import ScanHistoryPage from './pages/ScanHistoryPage';
import ScanResultsPage from './pages/ScanResultsPage';
import ProjectsPage from './pages/ProjectsPage';

export default function App() {
    const { checkAuth, isLoading, isAuthenticated } = useAuthStore();

    useEffect(() => { checkAuth(); }, []);

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Initializing SAST Copilot…</p>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />

            <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/scans/new" element={<NewScanPage />} />
                <Route path="/scans/history" element={<ScanHistoryPage />} />
                <Route path="/scans/:id" element={<ScanResultsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
            </Route>

            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        </Routes>
    );
}
