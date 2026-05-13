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
        <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-border bg-card text-card-foreground">
            <div className="flex h-16 items-center border-b border-border px-5 gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                    <Shield className="h-4 w-4 text-background" aria-hidden />
                </div>
                <div>
                    <span className="block text-sm font-bold tracking-tight text-foreground leading-tight">SAST Copilot</span>
                    <span className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">AI Security Platform</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-0.5 px-3">
                    <div className="mb-2 px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Navigation
                    </div>
                    {links.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.name}
                                to={link.href}
                                className={cn(
                                    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-foreground text-background shadow-sm'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                )}
                            >
                                <link.icon className={cn('mr-3 h-4 w-4 flex-shrink-0', isActive ? 'text-background' : '')} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t border-border p-3">
                {user && (
                    <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-border object-cover flex-shrink-0" />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <Code className="h-4 w-4 text-muted-foreground" />
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
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="mr-3 h-4 w-4 flex-shrink-0" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
