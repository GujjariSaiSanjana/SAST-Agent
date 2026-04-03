import { BearerFinding } from './bearer.service';
import { Prisma, Severity } from '@prisma/client';

function mapSeverity(raw: string): Severity {
    const s = raw.toLowerCase();
    switch (s) {
        case 'critical': return 'CRITICAL';
        case 'high': return 'HIGH';
        case 'medium': return 'MEDIUM';
        case 'low': return 'LOW';
        case 'warning':
        case 'warnings': return 'WARNING';
        default: return 'LOW';
    }
}

function inferCategory(finding: BearerFinding): string {
    if (finding.category_groups?.length) {
        return finding.category_groups[0];
    }
    const ruleId = finding.rule_id || finding.rule?.id || '';
    if (ruleId.includes('sql')) return 'SQL Injection';
    if (ruleId.includes('xss')) return 'Cross-Site Scripting';
    if (ruleId.includes('path')) return 'Path Traversal';
    if (ruleId.includes('crypto')) return 'Cryptography';
    if (ruleId.includes('secret') || ruleId.includes('key')) return 'Sensitive Data Exposure';
    if (ruleId.includes('auth')) return 'Authentication';
    if (ruleId.includes('injection')) return 'Injection';
    return 'General';
}

function extractCwe(finding: BearerFinding): string | undefined {
    const cwes = finding.rule?.cwe_ids;
    if (cwes?.length) return cwes[0];
    return undefined;
}

export interface ParsedIssue {
    ruleId: string;
    title: string;
    description: string;
    severity: Severity;
    category: string;
    filePath: string;
    lineStart: number;
    lineEnd: number;
    codeSnippet: string | null;
    cweId: string | null;
    cvssScore: number | null;
    rawData: Prisma.InputJsonValue;
}

export interface SeverityCounts {
    critical: number;
    high: number;
    medium: number;
    low: number;
    warning: number;
}

export interface ParsedScanResult {
    issues: ParsedIssue[];
    counts: SeverityCounts;
    riskScore: number;
}

export function parseFindings(findings: BearerFinding[]): ParsedScanResult {
    const issues: ParsedIssue[] = findings.map((f) => {
        const severity = mapSeverity(f.severity || 'low');
        const ruleId = f.rule_id || f.rule?.id || 'unknown';

        return {
            ruleId,
            title: f.title || f.rule?.name || ruleId,
            description: f.description || f.rule?.description || 'No description available.',
            severity,
            category: inferCategory(f),
            filePath: f.filename || f.full_filename || 'unknown',
            lineStart: f.line_number || 0,
            lineEnd: f.line_number || 0,
            codeSnippet: f.snippet || f.code_extract || null,
            cweId: extractCwe(f) || null,
            cvssScore: null,
            rawData: f as unknown as Prisma.InputJsonValue,
        };
    });

    const counts: SeverityCounts = {
        critical: issues.filter((i) => i.severity === 'CRITICAL').length,
        high: issues.filter((i) => i.severity === 'HIGH').length,
        medium: issues.filter((i) => i.severity === 'MEDIUM').length,
        low: issues.filter((i) => i.severity === 'LOW').length,
        warning: issues.filter((i) => i.severity === 'WARNING').length,
    };

    // Risk formula: critical*10 + high*5 + medium*2 + low*1
    const riskScore =
        counts.critical * 10 +
        counts.high * 5 +
        counts.medium * 2 +
        counts.low * 1;

    return { issues, counts, riskScore };
}
