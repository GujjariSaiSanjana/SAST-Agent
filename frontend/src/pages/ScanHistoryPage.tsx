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
        return <div className="animate-pulse">Loading scan history...</div>;
    }

    const scans = data?.scans || [];

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
                <p className="text-muted-foreground mt-1">Audit log of all security scans performed.</p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y border-b border-t mt-4">
                        {scans.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                                <p>No scans found.</p>
                            </div>
                        ) : (
                            scans.map((scan: any) => (
                                <Link to={`/scans/${scan.id}`} key={scan.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-primary/10 p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                                            <FolderGit2 className="h-5 w-5 text-primary" />
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
