import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, ShieldCheck, Shield, Activity, FolderGit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Scan {
    id: string;
    status: string;
    riskScore: number;
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    createdAt: string;
    project?: { name: string };
    _count: { issues: number };
}

export default function DashboardPage() {
    const { data: scansData, isLoading } = useQuery<{ scans: Scan[]; total: number }>({
        queryKey: ['scans', { limit: 5 }],
        queryFn: () => api.get('/scans?limit=5'),
    });

    if (isLoading) {
        return <div className="animate-pulse flex space-x-4">Loading dashboard...</div>;
    }

    const recentScans = scansData?.scans || [];
    const averageRisk = recentScans.length
        ? recentScans.reduce((acc, s) => acc + s.riskScore, 0) / recentScans.length
        : 0;

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                <p className="text-muted-foreground mt-1">Your security posture at a glance.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{scansData?.total || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Historically completed</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-destructive">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageRisk.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across recent scans</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-[#ef4444]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                        <Shield className="h-4 w-4 text-[#ef4444]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {recentScans.reduce((acc, s) => acc + s.criticalCount, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-[#eab308]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-[#eab308]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {recentScans.reduce((acc, s) => acc + s.totalIssues, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Across recent scans</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>The latest security scans performed across your projects.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentScans.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">No scans found. Start by running a new scan.</p>
                        ) : (
                            recentScans.map((scan) => (
                                <Link to={`/scans/${scan.id}`} key={scan.id}>
                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors mb-2 cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                                                <FolderGit2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{scan.project?.name || 'Unnamed Project'}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(scan.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {scan.status === 'COMPLETED' ? (
                                                <>
                                                    <div className="flex gap-2">
                                                        {scan.criticalCount > 0 && <Badge variant="critical">{scan.criticalCount} C</Badge>}
                                                        {scan.highCount > 0 && <Badge variant="high">{scan.highCount} H</Badge>}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold">Risk: {scan.riskScore}</p>
                                                        <p className="text-xs text-muted-foreground">{scan.totalIssues} issues</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="animate-pulse">{scan.status}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
