import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const handleGithubLogin = () => {
        // Redirect to backend OAuth flow
        window.location.href = 'http://localhost:3001/auth/github';
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/10 to-transparent rounded-full blur-3xl opacity-50" />
            </div>

            <div className="z-10 w-full max-w-md space-y-8 rounded-2xl border bg-card/80 p-10 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20 shadow-inner">
                        <Shield className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                        SAST Copilot
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enterprise-grade static analysis enhanced by AI
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <Button
                        onClick={handleGithubLogin}
                        className="group relative flex w-full justify-center py-6 text-sm font-semibold transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
                    >
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-primary-foreground/50 group-hover:text-primary-foreground/80">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                        </span>
                        Continue with GitHub
                    </Button>
                </div>
            </div>
        </div>
    );
}
