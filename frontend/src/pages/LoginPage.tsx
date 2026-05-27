import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const handleGithubLogin = () => {
        window.location.href = '/auth/github';
    };

    return (
        <div className="flex min-h-screen bg-background">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-border p-12">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                        <Shield className="h-4 w-4 text-background" aria-hidden />
                    </div>
                    <span className="text-sm font-semibold text-foreground">SAST Copilot</span>
                </div>
                <div className="space-y-4">
                    <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground leading-[1.1]">
                        Catch vulnerabilities<br />before they ship.
                    </h1>
                    <p className="text-base text-muted-foreground max-w-sm leading-relaxed">
                        AI-powered static analysis that scans your codebase, maps findings to OWASP and CWE, and explains each issue in plain language.
                    </p>
                </div>
                <p className="text-xs text-muted-foreground">
                    Static analysis + AI explanation + GitHub integration
                </p>
            </div>

            {/* Right panel / login */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                {/* Mobile brand */}
                <div className="mb-10 flex items-center gap-2.5 lg:hidden">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                        <Shield className="h-4 w-4 text-background" aria-hidden />
                    </div>
                    <span className="text-sm font-semibold text-foreground">SAST Copilot</span>
                </div>

                <div className="w-full max-w-sm space-y-7">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Connect your GitHub account to start scanning.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            type="button"
                            onClick={handleGithubLogin}
                            className="h-11 w-full gap-2.5 text-sm font-semibold"
                        >
                            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    fillRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Continue with GitHub
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Authentication handled by GitHub OAuth. No passwords stored.
                    </p>
                </div>
            </div>
        </div>
    );
}
