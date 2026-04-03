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

export interface AiProvider {
    name: string;
    analyze(issue: AiIssueInput): Promise<AiAnalysisResult>;
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
