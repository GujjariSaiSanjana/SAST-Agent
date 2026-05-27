import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { FolderGit2, AlertCircle, GitCompare, X, ArrowRight } from 'lucide-react';

function statusVariant(status: string) {
    if (status === 'COMPLETED') return 'default';
    if (status === 'FAILED') return 'destructive';
    return 'outline';
}

function RiskBar({ score }: { score: number }) {
    const max = 100;
    const pct = Math.min((score / max) * 100, 100);
    const color = score >= 50 ? 'bg-red-500' : score >= 20 ? 'bg-orange-500' : score >= 5 ? 'bg-yellow-500' : 'bg-emerald-500';
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums">{score}</span>
        </div>
    );
}

function ComparisonPanel({ scanA, scanB, onClose }: { scanA: any; scanB: any; onClose: () => void }) {
    const metrics = [
        { label: 'Risk Score', a: scanA.riskScore, b: scanB.riskScore },
        { label: 'Total Issues', a: scanA.totalIssues, b: scanB.totalIssues },
        { label: 'Critical', a: scanA.criticalCount, b: scanB.criticalCount },
        { label: 'High', a: scanA.highCount, b: scanB.highCount },
        { label: 'Medium', a: scanA.mediumCount, b: scanB.mediumCount },
        { label: 'Low', a: scanA.lowCount, b: scanB.lowCount },
    ];

    return (
        <Card className="border-2 border-foreground/10 shadow-elevated">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <GitCompare className="h-4 w-4" />
                        Scan Comparison
                    </CardTitle>
                    <button onClick={onClose} className="rounded p-1 hover:bg-muted">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground border-b">
                    <div className="p-3 border-r">
                        <p className="truncate">{scanA.project?.name || scanA.inputRef?.split('/').pop() || 'Scan A'}</p>
                        <p className="text-[10px] font-normal mt-0.5">{formatDate(scanA.createdAt)}</p>
                    </div>
                    <div className="p-3 text-center">Metric</div>
                    <div className="p-3 border-l text-right">
                        <p className="truncate">{scanB.project?.name || scanB.inputRef?.split('/').pop() || 'Scan B'}</p>
                        <p className="text-[10px] font-normal mt-0.5">{formatDate(scanB.createdAt)}</p>
                    </div>
                </div>
                {metrics.map(({ label, a, b }) => {
                    const diff = b - a;
                    const better = diff < 0;
                    const worse = diff > 0;
                    return (
                        <div key={label} className="grid grid-cols-3 border-b last:border-0 items-center text-sm">
                            <div className="p-3 border-r font-semibold text-foreground tabular-nums">{a}</div>
                            <div className="p-3 text-center">
                                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                                {diff !== 0 && (
                                    <div className={`text-[10px] font-bold mt-0.5 ${better ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {better ? '▼' : '▲'} {Math.abs(diff)}
                                    </div>
                                )}
                            </div>
                            <div className={`p-3 border-l text-right font-semibold tabular-nums ${worse ? 'text-red-500' : better ? 'text-emerald-500' : 'text-foreground'}`}>
                                {b}
                            </div>
                        </div>
                    );
                })}
                <div className="grid grid-cols-2 gap-2 p-3 border-t bg-muted/30">
                    <Link to={`/scans/${scanA.id}`}>
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                            View A <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                    <Link to={`/scans/${scanB.id}`}>
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                            View B <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ScanHistoryPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['scans'],
        queryFn: () => api.get('/scans?limit=50'),
    });

    const [compareMode, setCompareMode] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);

    const scans = (data as any)?.scans || [];
    const completedScans = scans.filter((s: any) => s.status === 'COMPLETED');

    const toggleSelect = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
        );
    };

    const scanA = completedScans.find((s: any) => s.id === selected[0]);
    const scanB = completedScans.find((s: any) => s.id === selected[1]);

    return (
        <div className="animate-slide-up space-y-8 pb-16">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-[-0.06em] text-foreground">Scan History</h1>
                    <p className="mt-1 text-muted-foreground">Audit log of all security scans performed.</p>
                </div>
                {completedScans.length >= 2 && (
                    <Button
                        variant={compareMode ? 'default' : 'outline'}
                        onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
                        className="gap-2 shrink-0"
                    >
                        <GitCompare className="h-4 w-4" />
                        {compareMode ? 'Exit Compare' : 'Compare Scans'}
                    </Button>
                )}
            </div>

            {compareMode && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Select <strong className="text-foreground">2 completed scans</strong> to compare.{' '}
                    {selected.length > 0 && <span className="text-foreground font-medium">{selected.length}/2 selected.</span>}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
                {/* Scan list */}
                <div className={compareMode && selected.length === 2 ? 'xl:col-span-2' : 'xl:col-span-3'}>
                    <Card className="overflow-hidden">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
                            ) : scans.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
                                    <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
                                    <p className="text-sm">No scans found.</p>
                                    <Link to="/scans/new" className="mt-3">
                                        <Button size="sm">Start your first scan</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {scans.map((scan: any) => {
                                        const isSelected = selected.includes(scan.id);
                                        const isCompleted = scan.status === 'COMPLETED';
                                        const canSelect = compareMode && isCompleted;

                                        return (
                                            <div
                                                key={scan.id}
                                                className={`flex items-center justify-between p-4 transition-colors ${
                                                    canSelect ? 'cursor-pointer hover:bg-accent/60' : ''
                                                } ${isSelected ? 'bg-foreground/5 border-l-4 border-l-foreground' : ''}`}
                                                onClick={canSelect ? () => toggleSelect(scan.id) : undefined}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {compareMode && isCompleted && (
                                                        <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${isSelected ? 'bg-foreground border-foreground' : 'border-muted-foreground'}`} />
                                                    )}
                                                    <div className={`rounded-lg border border-border bg-background p-2 flex-shrink-0 ${!compareMode || !isCompleted ? '' : ''}`}>
                                                        <FolderGit2 className="h-4 w-4 text-foreground" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-sm text-foreground">
                                                            {scan.project?.name || scan.inputRef?.split('/').pop() || 'Untitled'}
                                                            <span className="ml-2 text-xs font-normal text-muted-foreground">({scan.source})</span>
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(scan.createdAt)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    <Badge variant={statusVariant(scan.status)} className="text-[10px]">
                                                        {scan.status}
                                                    </Badge>
                                                    {isCompleted && (
                                                        <>
                                                            <RiskBar score={scan.riskScore} />
                                                            <div className="text-right hidden sm:block">
                                                                <p className="text-xs text-muted-foreground">Issues</p>
                                                                <p className="text-sm font-bold text-foreground">{scan.totalIssues}</p>
                                                            </div>
                                                        </>
                                                    )}
                                                    {!compareMode && (
                                                        <Link to={`/scans/${scan.id}`} onClick={e => e.stopPropagation()}>
                                                            <Button variant="ghost" size="sm" className="text-xs">
                                                                View
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Comparison panel */}
                {compareMode && selected.length === 2 && scanA && scanB && (
                    <div className="xl:col-span-1">
                        <ComparisonPanel scanA={scanA} scanB={scanB} onClose={() => setSelected([])} />
                    </div>
                )}
            </div>
        </div>
    );
}
