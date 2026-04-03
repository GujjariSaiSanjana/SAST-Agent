import { useAuthStore } from '@/store/authStore';
import { UserCircle } from 'lucide-react';

export function Topbar() {
    const { user } = useAuthStore();

    return (
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold tracking-tight">Enterprise Security Hub</h2>
            </div>
            <div className="flex items-center gap-4">
                {user && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{user.username}</span>
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="h-8 w-8 rounded-full border border-border" />
                        ) : (
                            <UserCircle className="h-8 w-8 text-muted-foreground" />
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
