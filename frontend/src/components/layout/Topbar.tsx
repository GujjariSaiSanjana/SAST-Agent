import { useAuthStore } from '@/store/authStore';
import { UserCircle } from 'lucide-react';

export function Topbar() {
    const { user } = useAuthStore();

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 md:px-10">
            <div className="flex min-w-0 items-center gap-4">
                <h2 className="truncate text-sm font-medium text-muted-foreground md:text-base">
                    Enterprise Security Hub
                </h2>
            </div>
            <div className="flex items-center gap-4">
                <div
                    className="hidden items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-whisper sm:inline-flex"
                    title="Service status"
                >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    All systems operational
                </div>
                {user && (
                    <div className="flex items-center gap-3">
                        <span className="max-w-[140px] truncate text-sm font-medium text-foreground">
                            {user.username}
                        </span>
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt=""
                                className="h-9 w-9 rounded-full border border-border object-cover"
                            />
                        ) : (
                            <UserCircle className="h-9 w-9 text-muted-foreground" aria-hidden />
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
