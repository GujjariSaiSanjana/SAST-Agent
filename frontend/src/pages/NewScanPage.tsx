import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Github, Upload, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function NewScanPage() {
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projectName, setProjectName] = useState('');

    const handleGithubSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        setIsLoading(true);
        setError(null);
        try {
            // Create project first if needed
            let projectId = undefined;
            if (projectName) {
                const pRes: any = await api.post('/projects', { name: projectName, repoUrl: url });
                projectId = pRes.id;
            }

            const res: any = await api.post('/scans', { repoUrl: url, projectId });
            navigate(`/scans/${res.id}`);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to start GitHub scan');
        } finally {
            setIsLoading(false);
        }
    };

    const handleZipSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setIsLoading(true);
        setError(null);
        try {
            let projectId = undefined;
            if (projectName) {
                const pRes: any = await api.post('/projects', { name: projectName });
                projectId = pRes.id;
            }

            const formData = new FormData();
            formData.append('file', file);
            if (projectId) formData.append('projectId', projectId);

            const res: any = await api.post('/scans/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate(`/scans/${res.id}`);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload and start ZIP scan');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass =
        'w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

    return (
        <div className="mx-auto max-w-4xl animate-slide-up space-y-12">
            <div className="space-y-3">
                <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl md:leading-[1.1]">
                    New security scan
                </h1>
                <p className="text-lg leading-[1.4] text-muted-foreground">
                    Initialize SAST Copilot on a repository or ZIP archive.
                </p>
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
                    {error}
                </div>
            )}

            <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                    Project name (optional — creates a new project)
                </label>
                <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Core Auth Service"
                    className={inputClass}
                />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="group relative overflow-hidden transition-shadow hover:shadow-elevated">
                    <div className="absolute right-0 top-0 p-4 opacity-[0.07] transition-opacity group-hover:opacity-[0.12]">
                        <Github className="h-24 w-24 text-foreground" aria-hidden />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Github className="w-5 h-5" />
                            GitHub Repository
                        </CardTitle>
                        <CardDescription>Scan a public or accessible repository via URL.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleGithubSubmit} className="space-y-4">
                            <div>
                                <input
                                    type="url"
                                    placeholder="https://github.com/org/repo"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || !url}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Analyze Repository
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden transition-shadow hover:shadow-elevated">
                    <div className="absolute right-0 top-0 p-4 opacity-[0.07] transition-opacity group-hover:opacity-[0.12]">
                        <Upload className="h-24 w-24 text-foreground" aria-hidden />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            ZIP Upload
                        </CardTitle>
                        <CardDescription>Upload a local codebase directly (max 50MB).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleZipSubmit} className="space-y-4">
                            <div>
                                <input
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    disabled={isLoading}
                                    required
                                    className={`${inputClass} cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium`}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || !file}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Analyze Archive
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
