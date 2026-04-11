import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export default function MainLayout() {
    return (
        <div className="flex min-h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
