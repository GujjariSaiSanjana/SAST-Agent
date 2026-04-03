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

    // Fetch summary query
    const { data: summary, refetch: refetchSummary } = useQuery({
        queryKey: ['scanSummary', id],
        queryFn: () => api.get(`/scans/${id}/summary`),
        enabled: scanStatus === 'COMPLETED' || scanStatus === 'FAILED',
    });

    // Fetch issues query
    const { data: issuesData, refetch: refetchIssues } = useQuery({
        queryKey: ['scanIssues', id],
        queryFn: () => api.get(`/scans/${id}/issues?limit=100`),
        enabled: scanStatus === 'COMPLETED' || scanStatus === 'AI_ANALYSIS',
    });

    // SSE for live status
    useEffect(() => {
        const eventSource = new EventSource(`http://localhost:3001/api/scans/${id}/stream`, {
            withCredentials: true,
        });

        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.status) setScanStatus(data.status);
            if (data.done) {
                eventSource.close();
                refetchSummary();
                refetchIssues();
            }
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

    if (isScanning) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-primary/30 rounded-full"></div>
                    <div className="w-24 h-24 border-4 border-primary rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                    <ShieldAlert className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Analysis in Progress</h2>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold text-sm">Status: {scanStatus.replace('_', ' ')}</p>
                </div>
                <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-shimmer w-full"></div>
                </div>
            </div>
        );
    }

    if (scanStatus === 'FAILED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold">Scan Failed</h2>
                <p className="text-muted-foreground mt-2">{summary?.scan?.errorMsg || 'An unknown error occurred during scanning.'}</p>
            </div>
        );
    }

    const scan = summary?.scan;
    const severityData = summary?.severityBreakdown?.map((s: any) => ({
        name: s.severity,
        value: s.count,
    })) || [];

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">Scan Results</h1>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
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
                                {issuesData?.issues?.map((issue: any) => (
                                    <div
                                        key={issue.id}
                                        onClick={() => setActiveIssue(issue)}
                                        className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${activeIssue?.id === issue.id ? 'bg-accent border-l-4 border-l-primary' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <Badge variant={issue.severity.toLowerCase()}>{issue.severity}</Badge>
                                            {issue.aiProcessed && <Sparkles className="h-4 w-4 text-purple-500" />}
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
                                            <Button onClick={() => handleExplain(activeIssue.id)} disabled={isExplaining} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                                                {isExplaining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
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
                                <Card className="border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                    <CardHeader className="bg-purple-500/5 border-b border-purple-500/20 pb-4">
                                        <CardTitle className="flex items-center text-purple-400">
                                            <Sparkles className="mr-2 h-5 w-5" />
                                            AI Remediation Guidance
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
                                                <div className="border border-green-500/30 rounded-md overflow-hidden">
                                                    <div className="bg-green-500/10 px-4 py-2 border-b border-green-500/30 text-xs font-mono text-green-400 font-semibold">
                                                        Suggested Fix
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
