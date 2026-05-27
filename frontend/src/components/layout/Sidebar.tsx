import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Shield, History, LogOut, Code, FolderOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function Sidebar() {
    const { pathname } = useLocation();
    const { logout, user } = useAuthStore();

    const links = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'New Scan', href: '/scans/new', icon: Plus },
        { name: 'Projects', href: '/projects', icon: FolderOpen },
        { name: 'Scan History', href: '/scans/history', icon: History },
    ];

    return (
        <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-border bg-card text-card-foreground">
            {/* Brand */}
            <div className="flex h-14 items-center border-b border-border px-4 gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground flex-shrink-0">
                    <Shield className="h-3.5 w-3.5 text-background" aria-hidden />
                </div>
                <span className="text-sm font-semibold tracking-tight text-foreground">SAST Copilot</span>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto py-3">
                <nav className="space-y-0.5 px-2">
                    {links.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.name}
                                to={link.href}
                                className={cn(
                                    'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-foreground text-background'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                            >
                                <link.icon className={cn('mr-2.5 h-3.5 w-3.5 flex-shrink-0', isActive ? 'text-background' : '')} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User + logout */}
            <div className="border-t border-border p-2">
                {user && (
                    <div className="mb-1 flex items-center gap-2.5 rounded-md px-3 py-2">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-border object-cover flex-shrink-0" />
                        ) : (
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <Code className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">{user.username}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{user.email || 'GitHub user'}</p>
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="mr-2.5 h-3.5 w-3.5 flex-shrink-0" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
