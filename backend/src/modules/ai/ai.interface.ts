export interface AiAnalysisResult {
    explanation: string;
    impact: string;
    remediation: string;
    fixCode: string;
}

export interface AiIssueInput {
    id: string;
    ruleId: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    filePath: string;
    lineStart: number;
    lineEnd: number;
    codeSnippet: string | null;
    cweId: string | null;
}

export interface AiScanFinding {
    ruleId: string;
    title: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    category: string;
    lineStart: number;
    lineEnd: number;
    codeSnippet: string;
    filePath?: string;
}

export interface AiProvider {
    name: string;
    analyze(issue: AiIssueInput): Promise<AiAnalysisResult>;
    scan(filePath: string, content: string): Promise<AiScanFinding[]>;
}

export function buildScanPrompt(filePath: string, content: string): string {
    return `### ROLE: HARDENED SENIOR SECURITY AUDITOR & SAST ENGINE
Your core directive is to perform an exhaustive, zero-trust security audit of the provided code. You are looking for CRITICAL and HIGH impact vulnerabilities that could lead to financial loss, data breaches, or complete system compromise.

### AUDIT SCOPE:
1. **OWASP Top 10 & SANS Top 25**: (e.g., SQLi, NoSQLi, XSS, SSRF, CSRF, IDOR/BOLO, Broken Auth, Insecure Deserialization).
2. **Cryptographic Failures**: Weak algorithms, hardcoded secrets, lack of salt, bypassable encryption.
3. **Business Logic Flaws**: Race conditions, unauthorized state transitions, price/amount manipulation.
4. **Input Validation & Sanitization**: Missing output encoding, improper regex, buffer overflows in low-level languages.
5. **Configuration & Environment**: Leaked credentials in comments, insecure default settings, dangerous API usage.
6. **Supply Chain**: Detection of malicious patterns or insecure dependency usage.

### FILE TO ANALYZE:
- **Path**: ${filePath}
---
${content}
---

### RESPONSE FORMAT (MUST BE VALID JSON):
Return a JSON object with a "findings" array. If no high-impact issues exist, return {"findings": []}.

Each finding MUST include:
- **ruleId**: Specific category (e.g., "SSRF-CVE-XXXX", "JWT-MISSING-SIGNATURE-VERIFICATION").
- **title**: Impact-focused title (e.g., "Full Account Takeover via IDOR").
- **description**: Deep technical analysis of exactly how a hacker would exploit this. Explain the "why".
- **severity**: [CRITICAL, HIGH, MEDIUM, LOW, INFO] -- Be honest but strict.
- **category**: [Security, Privacy, Best Practice]
- **lineStart**: 1-indexed start line of the vulnerable code.
- **lineEnd**: 1-indexed end line of the vulnerable code.
- **codeSnippet**: The exact snippet of code that is the root cause.

STRICT RULE: Do NOT report generic "improve comments" or "unused variable" warnings. Only report actionable security risks. Respond ONLY with the raw JSON object.`;
}

export function parseScanResponse(raw: string): AiScanFinding[] {
    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
    try {
        const parsed = JSON.parse(cleaned);
        const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];

        return rawFindings.map((f: any) => {
            const severity = String(f.severity || 'INFO').toUpperCase();
            const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'WARNING', 'INFO'];

            return {
                ruleId: String(f.ruleId || 'rule-id'),
                title: String(f.title || 'Security Finding'),
                description: String(f.description || ''),
                severity: (validSeverities.includes(severity) ? severity : 'INFO') as any,
                category: String(f.category || 'Security'),
                lineStart: Number(f.lineStart) || 1,
                lineEnd: Number(f.lineEnd) || 1,
                codeSnippet: String(f.codeSnippet || ''),
                filePath: f.filePath, // Will be mixed in by the caller
            };
        });
    } catch {
        return [];
    }
}

export function buildAnalysisPrompt(issue: AiIssueInput): string {
    return `You are an expert security engineer analyzing a SAST vulnerability finding.

## Finding Details
- **Rule ID**: ${issue.ruleId}
- **Title**: ${issue.title}
- **Severity**: ${issue.severity}
- **Category**: ${issue.category}
- **File**: ${issue.filePath}:${issue.lineStart}
${issue.cweId ? `- **CWE**: ${issue.cweId}` : ''}

## Description
${issue.description}

${issue.codeSnippet ? `## Vulnerable Code\n\`\`\`\n${issue.codeSnippet}\n\`\`\`` : ''}

Analyze this security vulnerability and respond with a valid JSON object in exactly this format:
{
  "explanation": "Clear, developer-friendly explanation of what this vulnerability is and why it's dangerous",
  "impact": "Specific business and technical impact if exploited",
  "remediation": "Step-by-step remediation guidance with best practices",
  "fixCode": "Corrected code snippet showing the fix (use the same language as the vulnerable code)"
}

Respond ONLY with the JSON object. No markdown, no explanation outside the JSON.`;
}

export function parseAiResponse(raw: string): AiAnalysisResult {
    // Strip markdown code fences if present
    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    const parsed = JSON.parse(cleaned);

    return {
        explanation: String(parsed.explanation || ''),
        impact: String(parsed.impact || ''),
        remediation: String(parsed.remediation || ''),
        fixCode: String(parsed.fixCode || ''),
    };
}
