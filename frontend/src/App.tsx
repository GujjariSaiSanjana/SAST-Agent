import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewScanPage from './pages/NewScanPage';
import ScanHistoryPage from './pages/ScanHistoryPage';
import ScanResultsPage from './pages/ScanResultsPage';

export default function App() {
    const { checkAuth, isLoading, isAuthenticated } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Loading state with a premium loader
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-t-2 border-primary rounded-full animate-spin"></div>
                <p className="mt-4 text-muted-foreground animate-pulse">Initializing Copilot...</p>
            </div>
        );
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
            />

            {/* Protected Routes wrapped in Layout */}
            <Route
                element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
            >
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/scans/new" element={<NewScanPage />} />
                <Route path="/scans/history" element={<ScanHistoryPage />} />
                <Route path="/scans/:id" element={<ScanResultsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        </Routes>
    );
}
