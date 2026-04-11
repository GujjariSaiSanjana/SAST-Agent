import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, FileCode2, Sparkles, AlertTriangle } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { Editor } from '@monaco-editor/react';

// Recharts
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const COLORS = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    WARNING: '#8b5cf6',
};

export default function ScanResultsPage() {
    const { id } = useParams<{ id: string }>();
    const [activeIssue, setActiveIssue] = useState<any>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [scanStatus, setScanStatus] = useState<string>('PENDING');
    const [liveData, setLiveData] = useState<any>({ totalIssues: 0, counts: {} });

    // Fetch summary query
    const { data: summary, refetch: refetchSummary } = useQuery<any>({
        queryKey: ['scanSummary', id],
        queryFn: () => api.get(`/scans/${id}/summary`),
    });

    // Fetch issues query
    const { data: issuesData, refetch: refetchIssues } = useQuery<any>({
        queryKey: ['scanIssues', id],
        queryFn: () => api.get(`/scans/${id}/issues?limit=100`),
    });

    // SSE for live status
    useEffect(() => {
        if (!id) return;
        const url = `/api/scans/${id}/stream`;
        const eventSource = new EventSource(url, {
            withCredentials: true,
        });

        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.status) setScanStatus(data.status);
            if (data.totalIssues !== undefined) {
                setLiveData(data);
                // Proactively refresh findings list when new ones are reported
                refetchIssues();
                refetchSummary();
            }
            if (data.done) {
                eventSource.close();
                refetchSummary();
                refetchIssues();
            }
        };

        eventSource.onerror = (e) => {
            console.error('SSE Error:', e);
            eventSource.close();
        };

        return () => eventSource.close();
    }, [id, refetchSummary, refetchIssues]);

    const handleExplain = async (issueId: string) => {
        setIsExplaining(true);
        try {
            const res = await api.post(`/issues/${issueId}/explain`);
            setActiveIssue(res);
            refetchIssues();
        } catch {
            // ignore
        } finally {
            setIsExplaining(false);
        }
    };

    const isScanning = ['PENDING', 'CLONING', 'SCANNING', 'PROCESSING', 'AI_ANALYSIS'].includes(scanStatus);
    const showInitialLoading = scanStatus === 'PENDING' || scanStatus === 'CLONING' || (isScanning && (!issuesData || issuesData.issues?.length === 0));

    if (showInitialLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 max-w-2xl mx-auto">
                <div className="relative">
                    <div className="h-32 w-32 rounded-full border-4 border-muted" />
                    <div
                        className="absolute left-0 top-0 h-32 w-32 animate-spin rounded-full border-4 border-foreground border-t-transparent"
                        style={{ animationDuration: '3s' }}
                    />
                    <ShieldAlert className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-pulse text-foreground" />
                </div>

                <div className="text-center space-y-4 w-full">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-[-0.05em] text-foreground md:text-4xl">
                            AI security audit in progress
                        </h2>
                        <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                            Status: {scanStatus.replace('_', ' ')}
                        </p>
                    </div>

                    <div className="mt-6 grid grid-cols-4 gap-4 rounded-2xl border border-border bg-card p-6 shadow-whisper">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-500">{liveData.counts?.critical || 0}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Critical</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-500">{liveData.counts?.high || 0}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">High</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-500">{liveData.counts?.medium || 0}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Medium</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-500">{liveData.totalIssues || 0}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Found</div>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground italic">
                        {liveData.totalIssues > 0
                            ? `Identified ${liveData.totalIssues} potential vulnerabilities using ${summary?.scan?.scannerVersion || 'AI'}...`
                            : 'Analyzing code structure and business logic...'}
                    </p>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-full animate-pulse rounded-full bg-foreground/80" />
                </div>
            </div>
        );
    }

    if (scanStatus === 'FAILED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold">Scan Failed</h2>
                <p className="text-muted-foreground mt-2">{(summary as any)?.scan?.errorMsg || 'An unknown error occurred during scanning.'}</p>
            </div>
        );
    }

    const scan = (summary as any)?.scan;
    const severityData = (summary as any)?.severityBreakdown?.map((s: any) => ({
        name: s.severity,
        value: s.count,
    })) || [];

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-[-0.06em] text-foreground md:text-5xl">
                            Scan results
                        </h1>
                        <Badge variant="outline" className="max-w-full truncate border-border font-mono text-xs font-normal text-muted-foreground">
                            {scan?.inputRef}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Completed in {formatTime(scan?.duration || 0)} • Found {scan?.totalIssues || 0} issues
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-card border rounded-lg p-3 text-center min-w-[120px]">
                        <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">Risk Score</p>
                        <p className="text-3xl font-black text-destructive">{scan?.riskScore}</p>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: List of Issues */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="h-[calc(100vh-220px)] flex flex-col">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-lg">Findings</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0">
                            <div className="divide-y">
                                {(issuesData as any)?.issues?.map((issue: any) => (
                                    <div
                                        key={issue.id}
                                        onClick={() => setActiveIssue(issue)}
                                        className={`cursor-pointer p-4 transition-colors hover:bg-accent/80 ${activeIssue?.id === issue.id ? 'border-l-4 border-l-foreground bg-accent/50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <Badge variant={issue.severity.toLowerCase()}>{issue.severity}</Badge>
                                            {issue.aiProcessed && <Sparkles className="h-4 w-4 text-preview" aria-hidden />}
                                        </div>
                                        <p className="font-semibold text-sm line-clamp-2">{issue.title}</p>
                                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                                            <FileCode2 className="h-3 w-3 mr-1" />
                                            <span className="truncate">{issue.filePath.split('/').pop()}</span>
                                            <span className="ml-1">:{issue.lineStart}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Details & Code & AI */}
                <div className="lg:col-span-2 space-y-6">
                    {!activeIssue ? (
                        <Card className="h-full flex items-center justify-center p-12 text-center text-muted-foreground">
                            <div>
                                {severityData.length > 0 && (
                                    <div className="h-64 mb-8">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={severityData}
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {severityData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Select a finding from the list to view details, code, and AI remediation.</p>
                            </div>
                        </Card>
                    ) : (
                        <>
                            {/* Issue Details Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-xl mb-2">{activeIssue.title}</CardTitle>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={activeIssue.severity.toLowerCase()}>{activeIssue.severity}</Badge>
                                                <span className="text-sm font-medium border rounded-md px-2 py-0.5 bg-muted/50">{activeIssue.category}</span>
                                                {activeIssue.cweId && <span className="text-xs text-muted-foreground uppercase">{activeIssue.cweId}</span>}
                                            </div>
                                        </div>
                                        {!activeIssue.aiProcessed && (
                                            <Button onClick={() => handleExplain(activeIssue.id)} disabled={isExplaining} size="sm">
                                                {isExplaining ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                )}
                                                Ask AI Copilot
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeIssue.description}</p>
                                    </div>

                                    {activeIssue.codeSnippet && (
                                        <div className="border rounded-md overflow-hidden">
                                            <div className="bg-muted px-4 py-2 border-b flex justify-between items-center text-xs font-mono">
                                                <span>{activeIssue.filePath}</span>
                                                <span>Line {activeIssue.lineStart}</span>
                                            </div>
                                            <div className="h-48">
                                                <Editor
                                                    height="100%"
                                                    defaultLanguage="javascript" // Would ideally be dynamic based on ext
                                                    theme="vs-dark"
                                                    value={activeIssue.codeSnippet}
                                                    options={{
                                                        readOnly: true,
                                                        minimap: { enabled: false },
                                                        scrollBeyondLastLine: false,
                                                        fontSize: 13,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* AI Details Card */}
                            {activeIssue.aiProcessed && activeIssue.aiExplanation && (
                                <Card className="border-preview/25 shadow-elevated">
                                    <CardHeader className="border-b border-border pb-4">
                                        <CardTitle className="flex items-center text-lg font-semibold text-foreground">
                                            <Sparkles className="mr-2 h-5 w-5 text-preview" aria-hidden />
                                            AI remediation guidance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div>
                                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Explanation & Impact</h4>
                                            <p className="text-sm leading-relaxed mb-3">{activeIssue.aiExplanation}</p>
                                            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm">
                                                <span className="font-bold mr-2">Impact:</span>
                                                {activeIssue.aiImpact}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">How to Fix</h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4">{activeIssue.aiRemediation}</p>

                                            {activeIssue.aiFixCode && (
                                                <div className="overflow-hidden rounded-lg border border-border">
                                                    <div className="border-b border-border bg-muted px-4 py-2 font-mono text-xs font-semibold text-foreground">
                                                        Suggested fix
                                                    </div>
                                                    <div className="h-48">
                                                        <Editor
                                                            height="100%"
                                                            defaultLanguage="javascript"
                                                            theme="vs-dark"
                                                            value={activeIssue.aiFixCode}
                                                            options={{
                                                                readOnly: true,
                                                                minimap: { enabled: false },
                                                                scrollBeyondLastLine: false,
                                                                fontSize: 13,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
