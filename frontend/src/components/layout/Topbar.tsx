import { useAuthStore } from '@/store/authStore';

export function Topbar() {
    const { user } = useAuthStore();

    return (
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
            <div className="flex min-w-0 items-center gap-4">
                <h2 className="truncate text-sm font-medium text-muted-foreground">
                    Security Platform
                </h2>
            </div>
            {user && (
                <div className="flex items-center gap-2.5">
                    <span className="max-w-[120px] truncate text-sm font-medium text-foreground">
                        {user.username}
                    </span>
                    {user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full border border-border object-cover"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-semibold text-muted-foreground">
                                {user.username?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </header>
    );
}
