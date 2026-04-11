import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, ShieldCheck, Shield, Activity, FolderGit2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Scan {
    id: string;
    status: string;
    inputRef: string;
    riskScore: number;
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    createdAt: string;
    project?: { name: string };
    _count: { issues: number };
}

const COLORS = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    WARNING: '#8b5cf6',
    INFO: '#94a3b8',
};

export default function DashboardPage() {
    const { data: scansData, isLoading: isLoadingScans } = useQuery<{ scans: Scan[]; total: number }>({
        queryKey: ['scans', { limit: 5 }],
        queryFn: () => api.get('/scans?limit=5'),
    });

    const [issueOffset, setIssueOffset] = useState(0);
    const { data: issuesData, isFetching: isFetchingIssues, isLoading: isLoadingIssues } = useQuery<{
        issues: any[];
        total: number;
    }>({
        queryKey: ['globalIssues', issueOffset],
        queryFn: () => api.get(`/issues?limit=10&offset=${issueOffset}`),
    });

    const [allIssues, setAllIssues] = useState<any[]>([]);

    useEffect(() => {
        if (issuesData?.issues) {
            setAllIssues((prev) => {
                const combined = [...prev, ...issuesData.issues];
                const unique = Array.from(new Map(combined.map((i) => [i.id, i])).values());
                return unique;
            });
        }
    }, [issuesData]);

    const isLoading = isLoadingScans || (isLoadingIssues && allIssues.length === 0);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <Shield className="h-16 w-16 text-muted-foreground/25" aria-hidden />
                    <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-foreground" />
                </div>
                <p className="animate-pulse text-sm font-medium text-muted-foreground">
                    Harmonizing security data…
                </p>
            </div>
        );
    }

    const recentScans = scansData?.scans || [];
    const averageRisk = recentScans.length
        ? recentScans.reduce((acc, s) => acc + s.riskScore, 0) / recentScans.length
        : 0;

    return (
        <div className="animate-slide-up space-y-20 pb-16">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
                <div className="max-w-2xl space-y-4">
                    <h1 className="text-4xl font-bold tracking-[-0.08em] text-foreground md:text-6xl md:leading-[1.1]">
                        Overview
                    </h1>
                    <p className="text-lg leading-[1.4] text-muted-foreground">
                        Real-time security analytics across your infrastructure.
                    </p>
                </div>
                <Link to="/scans/new" className="shrink-0">
                    <Button className="h-11 px-6 text-base font-semibold shadow-elevated">New scan</Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="transition-shadow hover:shadow-elevated">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">Total scans</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight text-foreground">{scansData?.total || 0}</div>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Historically performed</p>
                    </CardContent>
                </Card>

                <Card className="transition-shadow hover:shadow-elevated">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">Avg risk</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight text-foreground">{averageRisk.toFixed(1)}</div>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Weighted score</p>
                    </CardContent>
                </Card>

                <Card className="transition-shadow hover:shadow-elevated">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">Criticals</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight text-foreground">
                            {recentScans.reduce((acc, s) => acc + (s.criticalCount || 0), 0)}
                        </div>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Immediate triage</p>
                    </CardContent>
                </Card>

                <Card className="transition-shadow hover:shadow-elevated">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">Total issues</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight text-foreground">
                            {recentScans.reduce((acc, s) => acc + (s.totalIssues || 0), 0)}
                        </div>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Detected findings</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
                <Card className="border-border shadow-whisper">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                            <Activity className="h-5 w-5 text-foreground" aria-hidden />
                            Recent activity
                        </CardTitle>
                        <CardDescription>Latest security assessments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentScans.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">No scan history available.</p>
                        ) : (
                            recentScans.map((scan) => (
                                <Link to={`/scans/${scan.id}`} key={scan.id} className="block">
                                    <div className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-whisper transition-all hover:border-foreground/20 hover:shadow-elevated">
                                        <div className="flex min-w-0 items-center gap-4">
                                            <div className="rounded-2xl border border-border bg-background p-2.5 text-foreground">
                                                <FolderGit2 className="h-5 w-5" aria-hidden />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-foreground md:max-w-none">
                                                    {scan.project?.name || scan.inputRef.split('/').pop() || 'Untitled'}
                                                </p>
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    {formatDate(scan.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            {scan.status === 'COMPLETED' ? (
                                                <div className="flex items-center gap-3">
                                                    {(scan.criticalCount || 0) > 0 && (
                                                        <Badge variant="critical">{scan.criticalCount}C</Badge>
                                                    )}
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                            Risk {scan.riskScore}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="animate-pulse border-input text-xs font-semibold uppercase">
                                                    {scan.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                        <Link to="/scans/history" className="block pt-2 text-center">
                            <Button variant="ghost" size="sm" className="w-full text-sm font-medium text-muted-foreground hover:text-foreground">
                                View all history
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-whisper">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                            <ShieldAlert className="h-5 w-5 text-foreground" aria-hidden />
                            Global findings
                        </CardTitle>
                        <CardDescription>Consolidated vulnerabilities across all projects.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {allIssues.length === 0 && !isFetchingIssues ? (
                            <div className="flex flex-col items-center py-12 text-center">
                                <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground/35" aria-hidden />
                                <p className="text-sm font-medium text-muted-foreground">No vulnerabilities detected.</p>
                            </div>
                        ) : (
                            <>
                                {allIssues.map((issue) => (
                                    <Link to={`/scans/${issue.scanId}`} key={issue.id} className="block">
                                        <div
                                            className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-whisper transition-all hover:border-foreground/20 hover:shadow-elevated"
                                            style={{
                                                borderLeftWidth: 4,
                                                borderLeftColor:
                                                    COLORS[issue.severity as keyof typeof COLORS] || '#cccccc',
                                            }}
                                        >
                                            <div className="mb-2 flex items-start justify-between">
                                                <Badge
                                                    variant={issue.severity.toLowerCase()}
                                                    className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wide"
                                                >
                                                    {issue.severity}
                                                </Badge>
                                                <span className="max-w-[45%] truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    {issue.scan?.project?.name || 'Finding'}
                                                </span>
                                            </div>
                                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                                                {issue.title}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 opacity-70">
                                                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                                                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    {issue.category}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}

                                {issuesData && allIssues.length < issuesData.total && (
                                    <Button
                                        variant="outline"
                                        className="w-full border-dashed text-sm font-medium hover:border-solid"
                                        onClick={() => setIssueOffset((prev) => prev + 10)}
                                        disabled={isFetchingIssues}
                                    >
                                        {isFetchingIssues ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Load more findings
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
