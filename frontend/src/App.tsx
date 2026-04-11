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
    }, []); // Run once on mount

    // Loading state with a premium loader
    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background">
                <div className="h-12 w-12 rounded-full border-2 border-muted border-t-foreground animate-spin" />
                <p className="mt-6 text-sm font-medium text-muted-foreground">Initializing Copilot…</p>
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
