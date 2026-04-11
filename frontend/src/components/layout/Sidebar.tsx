import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Shield, History, LogOut, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function Sidebar() {
    const { pathname } = useLocation();
    const { logout } = useAuthStore();

    const links = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'New Scan', href: '/scans/new', icon: Shield },
        { name: 'Scan History', href: '/scans/history', icon: History },
    ];

    return (
        <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-border bg-card text-card-foreground shadow-whisper">
            <div className="flex h-16 items-center border-b border-border px-5">
                <Code className="mr-2.5 h-6 w-6 text-foreground" aria-hidden />
                <span className="text-base font-semibold tracking-tight text-foreground">SAST Copilot</span>
            </div>
            <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1 px-3">
                    <div className="mb-3 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Menu
                    </div>
                    {links.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.name}
                                to={link.href}
                                className={cn(
                                    'flex items-center rounded-full px-3 py-2.5 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-foreground text-background'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                            >
                                <link.icon
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0',
                                        isActive ? 'text-background' : 'text-muted-foreground'
                                    )}
                                />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-border p-4">
                <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center rounded-full px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-foreground"
                >
                    <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                    Log out
                </button>
            </div>
        </aside>
    );
}
