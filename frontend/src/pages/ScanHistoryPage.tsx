import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { FolderGit2, AlertCircle } from 'lucide-react';

export default function ScanHistoryPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['scans'],
        queryFn: () => api.get('/scans?limit=50'),
    });

    if (isLoading) {
        return (
            <div className="animate-pulse text-sm font-medium text-muted-foreground">Loading scan history…</div>
        );
    }

    const scans = (data as any)?.scans || [];

    return (
        <div className="animate-slide-up space-y-12">
            <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-[-0.06em] text-foreground md:text-5xl md:leading-[1.1]">
                    Scan history
                </h1>
                <p className="text-lg leading-[1.4] text-muted-foreground">Audit log of all security scans performed.</p>
            </div>

            <Card className="overflow-hidden shadow-whisper">
                <CardContent className="p-0">
                    <div className="mt-0 divide-y border-y border-border">
                        {scans.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                                <p>No scans found.</p>
                            </div>
                        ) : (
                            scans.map((scan: any) => (
                                <Link
                                    to={`/scans/${scan.id}`}
                                    key={scan.id}
                                    className="group flex items-center justify-between p-5 transition-colors hover:bg-accent/80"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-xl border border-border bg-background p-2 transition-colors group-hover:border-foreground/15">
                                            <FolderGit2 className="h-5 w-5 text-foreground" aria-hidden />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{scan.project?.name || 'Unnamed Project'} <span className="text-muted-foreground font-normal text-sm ml-2">({scan.source})</span></p>
                                            <p className="text-xs text-muted-foreground mt-1">Started on {formatDate(scan.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Status</p>
                                            <Badge variant={scan.status === 'COMPLETED' ? 'default' : scan.status === 'FAILED' ? 'destructive' : 'outline'}>
                                                {scan.status}
                                            </Badge>
                                        </div>

                                        {scan.status === 'COMPLETED' && (
                                            <>
                                                <div className="text-right w-20">
                                                    <p className="text-sm text-muted-foreground">Risk</p>
                                                    <p className="font-bold text-lg leading-none">{scan.riskScore}</p>
                                                </div>
                                                <div className="text-right w-20">
                                                    <p className="text-sm text-muted-foreground">Findings</p>
                                                    <p className="font-bold text-lg leading-none">{scan.totalIssues}</p>
                                                </div>
                                            </>
                                        )}
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
