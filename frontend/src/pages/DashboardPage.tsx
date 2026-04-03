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
    INFO: '#94a3b8'
};

export default function DashboardPage() {
    const { data: scansData, isLoading: isLoadingScans } = useQuery<{ scans: Scan[]; total: number }>({
        queryKey: ['scans', { limit: 5 }],
        queryFn: () => api.get('/scans?limit=5'),
    });

    const [issueOffset, setIssueOffset] = useState(0);
    const { data: issuesData, isFetching: isFetchingIssues, isLoading: isLoadingIssues } = useQuery<{ issues: any[]; total: number }>({
        queryKey: ['globalIssues', issueOffset],
        queryFn: () => api.get(`/issues?limit=10&offset=${issueOffset}`),
    });

    const [allIssues, setAllIssues] = useState<any[]>([]);

    useEffect(() => {
        if (issuesData?.issues) {
            setAllIssues(prev => {
                const combined = [...prev, ...issuesData.issues];
                // Unique by ID to prevent duplicates if total changes between pages
                const unique = Array.from(new Map(combined.map(i => [i.id, i])).values());
                return unique;
            });
        }
    }, [issuesData]);

    const isLoading = isLoadingScans || isLoadingIssues && allIssues.length === 0;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="relative">
                    <Shield className="h-16 w-16 text-primary/20" />
                    <Loader2 className="absolute inset-0 h-16 w-16 text-primary animate-spin" />
                </div>
                <p className="text-muted-foreground font-medium animate-pulse text-sm">Harmonizing security data...</p>
            </div>
        );
    }

    const recentScans = scansData?.scans || [];
    const averageRisk = recentScans.length
        ? recentScans.reduce((acc, s) => acc + s.riskScore, 0) / recentScans.length
        : 0;

    return (
        <div className="space-y-8 animate-slide-up pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Overview</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Real-time security analytics across your infrastructure.</p>
                </div>
                <Link to="/scans/new">
                    <Button className="shadow-lg shadow-primary/20 px-6 font-bold uppercase tracking-wider text-xs">New Scan</Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-xl transition-all border-l-4 border-l-primary/60 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Scans</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter">{scansData?.total || 0}</div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Historically performed</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-xl transition-all border-l-4 border-l-destructive/60 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Risk</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter">{averageRisk.toFixed(1)}</div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Weighted score</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-xl transition-all border-l-4 border-l-red-500/60 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Criticals</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter text-red-500">
                            {recentScans.reduce((acc, s) => acc + (s.criticalCount || 0), 0)}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Immediate triage required</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-xl transition-all border-l-4 border-l-amber-500/60 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Issues</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter">
                            {recentScans.reduce((acc, s) => acc + (s.totalIssues || 0), 0)}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Detected findings</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Scans */}
                <Card className="border-none bg-accent/20">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>Latest security assessments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentScans.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-8">No scan history available.</p>
                        ) : (
                            recentScans.map((scan) => (
                                <Link to={`/scans/${scan.id}`} key={scan.id} className="block">
                                    <div className="p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary/20 transition-colors text-primary">
                                                <FolderGit2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm truncate max-w-[140px] md:max-w-none">{scan.project?.name || scan.inputRef.split('/').pop() || 'Untitled'}</p>
                                                <p className="text-[10px] font-semibold text-muted-foreground">{formatDate(scan.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {scan.status === 'COMPLETED' ? (
                                                <div className="flex items-center gap-3">
                                                    {(scan.criticalCount || 0) > 0 && <Badge variant="critical">{scan.criticalCount}C</Badge>}
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Risk {scan.riskScore}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="animate-pulse bg-primary/5 border-primary/20 text-primary text-[10px] uppercase font-bold">{scan.status}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                        <Link to="/scans/history" className="block text-center pt-2">
                            <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">View All History</Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Global Vulnerabilities Feed */}
                <Card className="border-none bg-accent/20">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-destructive" />
                            Global Findings feed
                        </CardTitle>
                        <CardDescription>Consolidated vulnerabilities across all projects.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {allIssues.length === 0 && !isFetchingIssues ? (
                            <div className="text-center py-12 flex flex-col items-center">
                                <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground text-sm font-medium">No vulnerabilities detected.</p>
                            </div>
                        ) : (
                            <>
                                {allIssues.map((issue) => (
                                    <Link to={`/scans/${issue.scanId}`} key={issue.id} className="block">
                                        <div className="p-4 rounded-xl border bg-card hover:border-destructive/50 hover:shadow-md transition-all cursor-pointer group border-l-4"
                                            style={{ borderLeftColor: COLORS[issue.severity as keyof typeof COLORS] || '#ccc' }}>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant={issue.severity.toLowerCase()} className="text-[9px] px-1.5 py-0 h-4 uppercase font-black tracking-widest">
                                                    {issue.severity}
                                                </Badge>
                                                <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-40 group-hover:opacity-100 transition-opacity">
                                                    {issue.scan?.project?.name || 'VULNERABILITY'}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-1">{issue.title}</p>
                                            <div className="flex items-center gap-2 mt-2 opacity-60">
                                                <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                                <p className="text-[9px] font-black tracking-tighter uppercase truncate opacity-50">{issue.category}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}

                                {issuesData && allIssues.length < issuesData.total && (
                                    <Button
                                        variant="outline"
                                        className="w-full mt-4 text-[10px] font-black uppercase tracking-widest bg-background/50 border-dashed hover:border-solid transition-all"
                                        onClick={() => setIssueOffset(prev => prev + 10)}
                                        disabled={isFetchingIssues}
                                    >
                                        {isFetchingIssues ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Load More Findings'}
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
