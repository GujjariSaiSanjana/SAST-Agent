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

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">New Security Scan</h1>
                <p className="text-muted-foreground mt-1">Initialize SAST Copilot on a repository or ZIP archive.</p>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive border border-destructive/30 p-4 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Project Name (Optional, will create a new project)</label>
                <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Core Auth Service"
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="relative overflow-hidden group border-2 hover:border-primary transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Github className="w-24 h-24" />
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
                                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || !url}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Analyze Repository
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-2 hover:border-primary transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Upload className="w-24 h-24" />
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
                                    className="w-full flex h-10 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
