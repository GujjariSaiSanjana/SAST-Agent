import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Shield, History, LogOut, Code, FolderGit2 } from 'lucide-react';
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
        <div className="flex h-screen w-64 flex-col border-r bg-card text-card-foreground">
            <div className="flex h-14 items-center border-b px-4">
                <Code className="mr-2 h-6 w-6 text-primary" />
                <span className="font-bold text-lg tracking-tight">SAST Copilot</span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                    <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Menu
                    </div>
                    {links.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.name}
                                to={link.href}
                                className={cn(
                                    'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                            >
                                <link.icon className={cn('mr-3 h-5 w-5 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground')} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t p-4">
                <button
                    onClick={logout}
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                    Log out
                </button>
            </div>
        </div>
    );
}
