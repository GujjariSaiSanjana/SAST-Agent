import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, ShieldCheck, Activity, FolderGit2, Loader2, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
};

function StatCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string | number; sub?: string; icon: any; trend?: 'up' | 'down' | 'neutral' }) {
    return (
        <Card className="transition-shadow hover:shadow-elevated">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
                        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                {trend && trend !== 'neutral' && (
                    <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trend === 'down' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {trend === 'down' ? 'Improving' : 'Needs attention'}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { data: scansData, isLoading: isLoadingScans } = useQuery<{ scans: any[]; total: number }>({
        queryKey: ['scans', { limit: 10 }],
        queryFn: () => api.get('/scans?limit=10'),
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
                return Array.from(new Map(combined.map(i => [i.id, i])).values());
            });
        }
    }, [issuesData]);

    if (isLoadingScans || (isLoadingIssues && allIssues.length === 0)) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                <p className="text-sm text-muted-foreground">Loading security data…</p>
            </div>
        );
    }

    const scans = scansData?.scans || [];
    const completedScans = scans.filter(s => s.status === 'COMPLETED');
    const totalIssues = completedScans.reduce((a, s) => a + (s.totalIssues || 0), 0);
    const totalCriticals = completedScans.reduce((a, s) => a + (s.criticalCount || 0), 0);
    const avgRisk = completedScans.length
        ? Math.round(completedScans.reduce((a, s) => a + s.riskScore, 0) / completedScans.length)
        : 0;

    // Bar chart data: last 7 completed scans risk score trend
    const chartData = completedScans.slice(0, 7).reverse().map((s, i) => ({
        name: `#${i + 1}`,
        risk: s.riskScore,
        critical: s.criticalCount || 0,
        label: s.project?.name || s.inputRef?.split('/').pop() || 'Scan',
    }));

    // Severity breakdown across all recent issues
    const sevCount: Record<string, number> = {};
    allIssues.forEach(issue => { sevCount[issue.severity] = (sevCount[issue.severity] || 0) + 1; });

    return (
        <div className="animate-slide-up space-y-10 pb-16">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-[-0.06em] text-foreground md:text-5xl">Overview</h1>
                    <p className="mt-1 text-muted-foreground">Real-time security posture across all scans.</p>
                </div>
                <Link to="/scans/new" className="shrink-0">
                    <Button className="gap-2 shadow-sm">
                        <Plus className="h-4 w-4" />
                        New scan
                    </Button>
                </Link>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total scans" value={scansData?.total || 0} sub="All time" icon={Activity} />
                <StatCard label="Avg risk score" value={avgRisk} sub="Recent scans" icon={ShieldAlert} trend={avgRisk >= 30 ? 'up' : avgRisk >= 10 ? 'neutral' : 'down'} />
                <StatCard label="Critical issues" value={totalCriticals} sub="Immediate triage" icon={ShieldAlert} trend={totalCriticals > 0 ? 'up' : 'neutral'} />
                <StatCard label="Total findings" value={totalIssues} sub="Detected vulnerabilities" icon={ShieldCheck} />
            </div>

            {/* Charts + activity */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Risk trend chart */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Risk Score Trend</CardTitle>
                        <CardDescription>Last {chartData.length} completed scans</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {chartData.length === 0 ? (
                            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                                No completed scans yet.
                            </div>
                        ) : (
                            <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} barSize={28}>
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.[0]) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="rounded-lg border bg-card p-2.5 text-xs shadow-elevated">
                                                        <p className="font-semibold text-foreground">{d.label}</p>
                                                        <p className="text-muted-foreground">Risk: <span className="text-foreground font-bold">{d.risk}</span></p>
                                                        {d.critical > 0 && <p className="text-red-500">{d.critical} critical</p>}
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.risk >= 50 ? '#ef4444' : entry.risk >= 20 ? '#f97316' : entry.risk >= 5 ? '#eab308' : '#3b82f6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Severity breakdown */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Severity Breakdown</CardTitle>
                        <CardDescription>Across recent findings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {allIssues.length === 0 ? (
                            <div className="flex h-40 items-center justify-center">
                                <div className="text-center">
                                    <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                                    <p className="text-xs text-muted-foreground">No vulnerabilities found</p>
                                </div>
                            </div>
                        ) : (
                            ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => {
                                const count = sevCount[s] || 0;
                                return (
                                    <div key={s} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: SEVERITY_COLORS[s] }} />
                                            <span className="text-xs font-medium text-muted-foreground">{s}</span>
                                        </div>
                                        <span className="text-sm font-bold tabular-nums" style={{ color: count > 0 ? SEVERITY_COLORS[s] : undefined }}>{count}</span>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent scans + Global findings */}
            <div className="grid gap-8 lg:grid-cols-2">
                {/* Recent scans */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">Recent Scans</CardTitle>
                            <Link to="/scans/history">
                                <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {scans.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-center px-4">
                                <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                <p className="text-sm text-muted-foreground">No scans yet.</p>
                                <Link to="/scans/new" className="mt-3">
                                    <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Start scan</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {scans.slice(0, 6).map(scan => (
                                    <Link to={`/scans/${scan.id}`} key={scan.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="rounded-lg border border-border bg-background p-2 flex-shrink-0">
                                                <FolderGit2 className="h-3.5 w-3.5 text-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {scan.project?.name || scan.inputRef?.split('/').pop() || 'Untitled'}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">{formatDate(scan.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {scan.status === 'COMPLETED' ? (
                                                <>
                                                    {(scan.criticalCount || 0) > 0 && (
                                                        <span className="text-[10px] font-bold text-red-500">{scan.criticalCount}C</span>
                                                    )}
                                                    <span className="text-xs font-semibold text-foreground">Risk {scan.riskScore}</span>
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] animate-pulse">{scan.status}</Badge>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Global findings feed */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Latest Findings</CardTitle>
                        <CardDescription>Consolidated vulnerabilities across all projects.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {allIssues.length === 0 && !isFetchingIssues ? (
                            <div className="flex flex-col items-center py-12 text-center">
                                <ShieldCheck className="h-10 w-10 text-emerald-500 mb-3 opacity-70" />
                                <p className="text-sm font-medium text-foreground">No vulnerabilities detected</p>
                                <p className="text-xs text-muted-foreground mt-1">Run a scan to see findings here.</p>
                            </div>
                        ) : (
                            <>
                                <div className="divide-y">
                                    {allIssues.map(issue => (
                                        <Link to={`/scans/${issue.scan?.id || issue.scanId}`} key={issue.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-foreground line-clamp-1">{issue.title}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {issue.category}{issue.scan?.project?.name ? ` · ${issue.scan.project.name}` : ''}
                                                </p>
                                            </div>
                                            <span className="flex-shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: SEVERITY_COLORS[issue.severity] }}>
                                                {issue.severity}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                                {issuesData && allIssues.length < issuesData.total && (
                                    <div className="p-3 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => setIssueOffset(prev => prev + 10)}
                                            disabled={isFetchingIssues}
                                        >
                                            {isFetchingIssues ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                                            Load more
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
