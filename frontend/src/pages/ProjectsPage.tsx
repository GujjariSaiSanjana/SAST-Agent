import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus, Trash2, Shield, AlertTriangle, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function RiskBadge({ score }: { score: number }) {
    if (score >= 50) return <span className="text-sm font-bold text-red-500">{score}</span>;
    if (score >= 20) return <span className="text-sm font-bold text-orange-500">{score}</span>;
    if (score >= 5) return <span className="text-sm font-bold text-yellow-500">{score}</span>;
    return <span className="text-sm font-bold text-emerald-500">{score || '—'}</span>;
}

export default function ProjectsPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    const [description, setDescription] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const { data: projects, isLoading } = useQuery<any[]>({
        queryKey: ['projects'],
        queryFn: () => api.get('/projects'),
    });

    const createMutation = useMutation({
        mutationFn: (dto: any) => api.post('/projects', dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setShowCreate(false);
            setName('');
            setRepoUrl('');
            setDescription('');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/projects/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setDeleteConfirm(null);
        },
    });

    const inputClass = 'w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

    return (
        <div className="animate-slide-up space-y-8 pb-16">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-[-0.06em] text-foreground">Projects</h1>
                    <p className="mt-1 text-muted-foreground">Organize scans by project and track security posture over time.</p>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)} className="shrink-0 gap-2">
                    <Plus className="h-4 w-4" />
                    New Project
                </Button>
            </div>

            {/* Create form */}
            {showCreate && (
                <Card className="border-dashed border-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Create new project</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!name) return;
                                createMutation.mutate({ name, repoUrl: repoUrl || undefined, description: description || undefined });
                            }}
                            className="space-y-3"
                        >
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        Project name *
                                    </label>
                                    <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auth Service" required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        Repository URL
                                    </label>
                                    <input className={inputClass} value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/org/repo" type="url" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Description
                                </label>
                                <input className={inputClass} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button type="submit" disabled={createMutation.isPending || !name} size="sm">
                                    {createMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Create project
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Project list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading projects…</span>
                </div>
            ) : !projects || projects.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                            <FolderOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground">No projects yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Create a project to organize your scans.</p>
                        <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
                            <Plus className="h-4 w-4" /> New Project
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {(projects as any[]).map((project) => {
                        const latestScan = project.scans?.[0];
                        const riskScore = latestScan?.riskScore ?? 0;
                        const scanCount = project._count?.scans ?? 0;

                        return (
                            <Card key={project.id} className="group flex flex-col transition-shadow hover:shadow-elevated">
                                <CardContent className="flex flex-1 flex-col p-5 gap-4">
                                    {/* Title row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                                                <FolderOpen className="h-4 w-4 text-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-foreground text-sm">{project.name}</p>
                                                {project.repoUrl && (
                                                    <a
                                                        href={project.repoUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground truncate"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="h-2.5 w-2.5" />
                                                        {project.repoUrl.replace('https://github.com/', '')}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {deleteConfirm === project.id ? (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => deleteMutation.mutate(project.id)}
                                                    className="rounded px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                                                >
                                                    {deleteMutation.isPending ? '…' : 'Confirm'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(project.id)}
                                                className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {project.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                                    )}

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3">
                                        <div className="text-center">
                                            <p className="text-[10px] font-medium text-muted-foreground">Risk</p>
                                            <RiskBadge score={riskScore} />
                                        </div>
                                        <div className="text-center border-x border-border">
                                            <p className="text-[10px] font-medium text-muted-foreground">Scans</p>
                                            <p className="text-sm font-bold text-foreground">{scanCount}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-medium text-muted-foreground">Latest</p>
                                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                                {latestScan ? formatDate(latestScan.createdAt) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status + action */}
                                    <div className="flex items-center justify-between mt-auto pt-1">
                                        {latestScan ? (
                                            <Badge
                                                variant={latestScan.status === 'COMPLETED' ? 'default' : latestScan.status === 'FAILED' ? 'destructive' : 'outline'}
                                                className="text-[10px]"
                                            >
                                                {latestScan.status}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No scans yet</span>
                                        )}
                                        {latestScan && (
                                            <Link to={`/scans/${latestScan.id}`}>
                                                <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                                    View scan <ChevronRight className="h-3 w-3" />
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
