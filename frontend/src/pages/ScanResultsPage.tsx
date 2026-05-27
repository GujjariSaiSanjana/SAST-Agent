import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, FileCode2, Sparkles, AlertTriangle, ChevronLeft, Shield, Bug, Link2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { Editor } from '@monaco-editor/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    WARNING: '#8b5cf6',
    INFO: '#94a3b8',
};

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'WARNING', 'INFO'];

function langFromPath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript',
        py: 'python', go: 'go', java: 'java',
        php: 'php', rb: 'ruby', c: 'c', cpp: 'cpp', h: 'cpp',
        cs: 'csharp', rs: 'rust', kt: 'kotlin', swift: 'swift',
        sh: 'shell', sql: 'sql', yaml: 'yaml', yml: 'yaml', json: 'json',
    };
    return map[ext] || 'plaintext';
}

function SeverityBadge({ severity }: { severity: string }) {
    const colors: Record<string, string> = {
        CRITICAL: 'bg-red-500/15 text-red-500 border-red-500/30',
        HIGH: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
        MEDIUM: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
        LOW: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
        WARNING: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        INFO: 'bg-muted text-muted-foreground border-border',
    };
    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors[severity] || colors.INFO}`}>
            {severity}
        </span>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="text-center">
            <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        </div>
    );
}

export default function ScanResultsPage() {
    const { id } = useParams<{ id: string }>();
    const [activeIssue, setActiveIssue] = useState<any>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [scanStatus, setScanStatus] = useState<string>('PENDING');
    const [liveData, setLiveData] = useState<any>({ totalIssues: 0, counts: {} });
    const [activeTab, setActiveTab] = useState<'description' | 'poc' | 'fix'>('description');

    const { data: summary, refetch: refetchSummary } = useQuery<any>({
        queryKey: ['scanSummary', id],
        queryFn: () => api.get(`/scans/${id}/summary`),
    });

    const { data: issuesData, refetch: refetchIssues } = useQuery<any>({
        queryKey: ['scanIssues', id],
        queryFn: () => api.get(`/scans/${id}/issues?limit=100`),
    });

    useEffect(() => {
        if (!id) return;
        const eventSource = new EventSource(`/api/scans/${id}/stream`, { withCredentials: true });

        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.status) setScanStatus(data.status);
            if (data.totalIssues !== undefined) {
                setLiveData(data);
                refetchIssues();
                refetchSummary();
            }
            if (data.done) {
                eventSource.close();
                refetchSummary();
                refetchIssues();
            }
        };

        eventSource.onerror = () => eventSource.close();
        return () => eventSource.close();
    }, [id, refetchSummary, refetchIssues]);

    const handleExplain = async (issueId: string) => {
        setIsExplaining(true);
        try {
            const res = await api.post(`/issues/${issueId}/explain`);
            setActiveIssue(res);
            refetchIssues();
        } finally {
            setIsExplaining(false);
        }
    };

    const isScanning = ['PENDING', 'CLONING', 'SCANNING', 'PROCESSING', 'AI_ANALYSIS'].includes(scanStatus);
    const showLoader = isScanning && (!issuesData || issuesData.issues?.length === 0);

    if (showLoader) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 max-w-xl mx-auto text-center">
                <div className="relative flex h-28 w-28 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-muted" />
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-foreground" style={{ animationDuration: '2s' }} />
                    <Shield className="h-10 w-10 text-foreground animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">AI security audit in progress</h2>
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {scanStatus.replace('_', ' ')}
                    </div>
                </div>
                <div className="w-full grid grid-cols-4 gap-3 rounded-xl border bg-card p-5 shadow-sm">
                    <StatCard label="Critical" value={liveData.counts?.critical || 0} color="#ef4444" />
                    <StatCard label="High" value={liveData.counts?.high || 0} color="#f97316" />
                    <StatCard label="Medium" value={liveData.counts?.medium || 0} color="#eab308" />
                    <StatCard label="Total" value={liveData.totalIssues || 0} color="currentColor" />
                </div>
                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-foreground/70" />
                </div>
                {liveData.totalIssues > 0 && (
                    <p className="text-sm text-muted-foreground">Found {liveData.totalIssues} vulnerabilities so far…</p>
                )}
            </div>
        );
    }

    if (scanStatus === 'FAILED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold">Scan Failed</h2>
                <p className="text-muted-foreground text-sm max-w-sm text-center">
                    {summary?.scan?.errorMsg || 'An unknown error occurred.'}
                </p>
                <Link to="/scans/new"><Button>Try again</Button></Link>
            </div>
        );
    }

    const scan = summary?.scan;
    const issues = issuesData?.issues || [];
    const severityData = (summary?.severityBreakdown || [])
        .map((s: any) => ({ name: s.severity, value: s.count }))
        .sort((a: any, b: any) => SEVERITY_ORDER.indexOf(a.name) - SEVERITY_ORDER.indexOf(b.name));

    const sortedIssues = [...issues].sort((a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );

    return (
        <div className="space-y-6 animate-slide-up pb-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="min-w-0">
                    <Link to="/scans/history" className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeft className="h-3.5 w-3.5" /> Scan history
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Scan Results</h1>
                    <p className="mt-1 text-sm text-muted-foreground truncate max-w-lg">
                        {scan?.inputRef} · {formatTime(scan?.duration || 0)} · {scan?.totalIssues || 0} issues
                    </p>
                </div>
                {/* Risk score + severity summary */}
                <div className="flex flex-shrink-0 items-center gap-3">
                    {['critical', 'high', 'medium'].map(s => {
                        const count = scan?.[`${s}Count`] || 0;
                        if (!count) return null;
                        return (
                            <div key={s} className="text-center">
                                <div className="text-xl font-black tabular-nums" style={{ color: SEVERITY_COLORS[s.toUpperCase()] }}>{count}</div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{s}</div>
                            </div>
                        );
                    })}
                    <div className="ml-2 rounded-xl border bg-card p-3 text-center min-w-[80px]">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Risk Score</p>
                        <p className="text-2xl font-black text-foreground">{scan?.riskScore ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Body: split layout */}
            {issues.length === 0 && !isScanning ? (
                <Card className="py-20 text-center">
                    <CardContent>
                        <Shield className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                        <h3 className="font-semibold text-foreground text-lg">No vulnerabilities found</h3>
                        <p className="text-muted-foreground text-sm mt-1">AI scan found no security issues in this codebase.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid lg:grid-cols-5 gap-4 items-start">
                    {/* Issues list — left */}
                    <div className="lg:col-span-2">
                        <Card className="sticky top-4">
                            <CardHeader className="py-3 px-4 border-b">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold">Findings ({issues.length})</CardTitle>
                                    {isScanning && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Live
                                        </div>
                                    )}
                                </div>
                                {/* Severity distribution mini chart */}
                                {severityData.length > 0 && (
                                    <div className="h-2 rounded-full overflow-hidden flex mt-2">
                                        {severityData.map((s: any) => (
                                            <div
                                                key={s.name}
                                                title={`${s.name}: ${s.value}`}
                                                className="h-full transition-all"
                                                style={{
                                                    width: `${(s.value / issues.length) * 100}%`,
                                                    backgroundColor: SEVERITY_COLORS[s.name] || '#ccc',
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-0 max-h-[calc(100vh-260px)] overflow-y-auto">
                                <div className="divide-y">
                                    {sortedIssues.map((issue: any) => (
                                        <button
                                            key={issue.id}
                                            onClick={() => { setActiveIssue(issue); setActiveTab('description'); }}
                                            className={`w-full text-left p-3 transition-all hover:bg-accent/60 ${activeIssue?.id === issue.id ? 'bg-accent border-l-[3px] border-l-foreground' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <SeverityBadge severity={issue.severity} />
                                                <div className="flex items-center gap-1">
                                                    {issue.aiProcessed && issue.aiExplanation && (
                                                        <Sparkles className="h-3 w-3 text-blue-400" />
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{issue.title}</p>
                                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                                                <FileCode2 className="h-2.5 w-2.5 flex-shrink-0" />
                                                <span className="truncate">{issue.filePath.split('/').slice(-2).join('/')}</span>
                                                <span className="flex-shrink-0">:{issue.lineStart}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detail panel — right */}
                    <div className="lg:col-span-3 space-y-4">
                        {!activeIssue ? (
                            <Card className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                                <CardContent>
                                    {severityData.length > 0 && (
                                        <div className="h-56 mb-6">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={severityData} innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                                        {severityData.map((entry: any, i: number) => (
                                                            <Cell key={i} fill={SEVERITY_COLORS[entry.name] || '#ccc'} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v: any, n: any) => [v, n]} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Select a finding to view details and AI remediation.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Issue header card */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <SeverityBadge severity={activeIssue.severity} />
                                                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded px-2 py-0.5">{activeIssue.category}</span>
                                                    {activeIssue.cweId && (
                                                        <span className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5">{activeIssue.cweId}</span>
                                                    )}
                                                    {activeIssue.owaspId && (
                                                        <span className="text-[10px] font-mono text-blue-500 border border-blue-500/30 bg-blue-500/5 rounded px-1.5 py-0.5">{activeIssue.owaspId}</span>
                                                    )}
                                                </div>
                                                <h2 className="text-base font-bold text-foreground leading-snug">{activeIssue.title}</h2>
                                                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <FileCode2 className="h-3 w-3" />
                                                    <span className="font-mono">{activeIssue.filePath}:{activeIssue.lineStart}</span>
                                                </div>
                                            </div>
                                            {!(activeIssue.aiProcessed && activeIssue.aiExplanation) && (
                                                <Button
                                                    onClick={() => handleExplain(activeIssue.id)}
                                                    disabled={isExplaining}
                                                    size="sm"
                                                    className="shrink-0 gap-1.5"
                                                >
                                                    {isExplaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                    Ask AI
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>

                                    {/* Tabs */}
                                    <div className="border-t border-border">
                                        <div className="flex">
                                            {([
                                                { key: 'description' as const, label: 'Description', icon: Bug },
                                                ...(activeIssue.aiProcessed && activeIssue.aiProofOfConcept
                                                    ? [{ key: 'poc' as const, label: 'Proof of Concept', icon: AlertTriangle }]
                                                    : []),
                                                ...(activeIssue.aiProcessed && activeIssue.aiFixCode
                                                    ? [{ key: 'fix' as const, label: 'Fix', icon: Sparkles }]
                                                    : []),
                                            ]).map(({ key, label, icon: Icon }) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setActiveTab(key)}
                                                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                                                        activeTab === key
                                                            ? 'border-foreground text-foreground'
                                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    <Icon className="h-3 w-3" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        <CardContent className="pt-4">
                                            {activeTab === 'description' && (
                                                <div className="space-y-4">
                                                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{activeIssue.description}</p>
                                                    {activeIssue.aiExplanation && (
                                                        <div className="rounded-lg bg-muted/40 border p-3 space-y-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Explanation</p>
                                                            <p className="text-sm leading-relaxed">{activeIssue.aiExplanation}</p>
                                                        </div>
                                                    )}
                                                    {activeIssue.aiImpact && (
                                                        <div className="rounded-lg bg-destructive/8 border border-destructive/20 p-3">
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Business Impact</p>
                                                            <p className="text-sm text-foreground">{activeIssue.aiImpact}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {activeTab === 'poc' && (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Attack Scenario</p>
                                                    <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-4">
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground">{activeIssue.aiProofOfConcept}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {activeTab === 'fix' && (
                                                <div className="space-y-4">
                                                    {activeIssue.aiRemediation && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Remediation Steps</p>
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeIssue.aiRemediation}</p>
                                                        </div>
                                                    )}
                                                    {activeIssue.aiFixCode && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Suggested Fix</p>
                                                            <div className="rounded-lg border overflow-hidden">
                                                                <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 border-b">
                                                                    <span className="text-[10px] font-mono text-muted-foreground">{langFromPath(activeIssue.filePath)}</span>
                                                                    <span className="text-[10px] text-emerald-500 font-semibold">✓ Fixed</span>
                                                                </div>
                                                                <div className="h-52">
                                                                    <Editor
                                                                        height="100%"
                                                                        language={langFromPath(activeIssue.filePath)}
                                                                        theme="vs-dark"
                                                                        value={activeIssue.aiFixCode}
                                                                        options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 12, lineNumbers: 'on' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </div>
                                </Card>

                                {/* Vulnerable code */}
                                {activeIssue.codeSnippet && (
                                    <Card>
                                        <CardHeader className="pb-2 pt-3 px-4 border-b">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vulnerable Code</CardTitle>
                                                <span className="text-[10px] font-mono text-muted-foreground">{activeIssue.filePath} · line {activeIssue.lineStart}</span>
                                            </div>
                                        </CardHeader>
                                        <div className="h-52">
                                            <Editor
                                                height="100%"
                                                language={langFromPath(activeIssue.filePath)}
                                                theme="vs-dark"
                                                value={activeIssue.codeSnippet}
                                                options={{
                                                    readOnly: true,
                                                    minimap: { enabled: false },
                                                    scrollBeyondLastLine: false,
                                                    fontSize: 12,
                                                    lineNumbers: 'on',
                                                    renderLineHighlight: 'line',
                                                }}
                                                onMount={(editor, monaco) => {
                                                    const lineCount = editor.getModel()?.getLineCount() || 1;
                                                    editor.deltaDecorations([], [{
                                                        range: new monaco.Range(1, 1, lineCount, 1),
                                                        options: {
                                                            isWholeLine: true,
                                                            className: 'vuln-line-highlight',
                                                            linesDecorationsClassName: 'vuln-line-decoration',
                                                        },
                                                    }]);
                                                }}
                                            />
                                        </div>
                                    </Card>
                                )}

                                {/* Solution / Remediation */}
                                <Card>
                                    <CardHeader className="pb-2 pt-3 px-4 border-b">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Solution Code</CardTitle>
                                            {activeIssue.aiProcessed && activeIssue.aiFixCode && (
                                                <span className="text-[10px] text-emerald-500 font-semibold">✓ AI Generated</span>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        {activeIssue.aiFixCode ? (
                                            <>
                                                {activeIssue.aiRemediation && (
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{activeIssue.aiRemediation}</p>
                                                )}
                                                <div className="rounded-lg border border-emerald-800/40 overflow-hidden">
                                                    <div className="flex items-center justify-between bg-emerald-950/40 px-3 py-1.5 border-b border-emerald-800/40">
                                                        <span className="text-[10px] font-mono text-emerald-400">{langFromPath(activeIssue.filePath)}</span>
                                                        <span className="text-[10px] text-emerald-400 font-semibold">fixed version</span>
                                                    </div>
                                                    <div className="h-52">
                                                        <Editor
                                                            height="100%"
                                                            language={langFromPath(activeIssue.filePath)}
                                                            theme="vs-dark"
                                                            value={activeIssue.aiFixCode}
                                                            options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 12, lineNumbers: 'on' }}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 py-4">
                                                <p className="text-xs text-muted-foreground text-center">
                                                    {activeIssue.aiProcessed
                                                        ? 'No fix code available for this issue.'
                                                        : 'Ask AI to generate a remediation code snippet for this vulnerability.'}
                                                </p>
                                                {!activeIssue.aiProcessed && (
                                                    <button
                                                        onClick={() => handleExplain(activeIssue.id)}
                                                        disabled={isExplaining}
                                                        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                                                    >
                                                        {isExplaining ? (
                                                            <>
                                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                                </svg>
                                                                Generating…
                                                            </>
                                                        ) : '✦ Ask AI for Solution'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
