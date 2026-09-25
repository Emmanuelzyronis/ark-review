import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'

dotenv.config()

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_FOUNDRY_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_FOUNDRY_BASE_URL,
})

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

export interface ReviewIssue {
  type: string
  severity: 'Critical' | 'High' | 'Low' | 'Info'
  file_path: string
  line_start?: number
  line_end?: number
  description: string
  evidence?: string
  recommended_fix?: string
}

export interface CodeReviewResult {
  architectural_summary: string
  issues: ReviewIssue[]
  severity_score: number
  severity_label: 'Critical' | 'High' | 'Low' | 'Info'
  voice_script: string
}

export async function analyzeCodeDiff(
  diff: string,
  prTitle: string,
  prDescription: string,
  contextFiles: string,
  config: { strictness_level: string; focus_areas: string[] }
): Promise<CodeReviewResult> {
  const focusAreasText = config.focus_areas.join(', ')

  const prompt = `You are an expert senior software engineer performing a code review. Analyze this pull request diff carefully.

PR Title: ${prTitle}
PR Description: ${prDescription || 'No description provided'}

Strictness Level: ${config.strictness_level}
Focus Areas: ${focusAreasText}

Related codebase context:
${contextFiles || 'No context retrieved'}

Diff to review:
\`\`\`diff
${diff}
\`\`\`

Perform a thorough architectural code review. Detect:
1. N+1 query problems
2. Missing error handling
3. Security vulnerabilities (exposed secrets, SQL injection, XSS, auth gaps)
4. Breaking interface changes
5. Performance anti-patterns
6. Architectural debt

Respond with a JSON object in this exact structure:
{
  "architectural_summary": "2-3 sentence high-level summary of the PR changes and their architectural implications",
  "issues": [
    {
      "type": "n_plus_one|missing_error_handling|security|breaking_change|architecture|performance|style",
      "severity": "Critical|High|Low|Info",
      "file_path": "path/to/file.ts",
      "line_start": 42,
      "line_end": 45,
      "description": "Clear description of the issue",
      "evidence": "Exact code snippet showing the problem",
      "recommended_fix": "Specific actionable fix"
    }
  ],
  "severity_score": 75,
  "severity_label": "Critical|High|Low|Info",
  "voice_script": "A 60-90 second audio script narrating the architectural implications. Written as natural spoken language, mentioning specific files and issues. Start with the PR summary, cover the top 2-3 issues, and end with a recommendation."
}

severity_score is 0-100 (0=no issues, 100=critical show-stopper).
severity_label should match the highest severity issue found.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not extract JSON from Claude response')

  return JSON.parse(jsonMatch[0]) as CodeReviewResult
}

export async function generateVoiceScript(
  summary: string,
  issues: ReviewIssue[],
  prTitle: string
): Promise<string> {
  const topIssues = issues.slice(0, 3)
  const issueText = topIssues
    .map(i => `- ${i.severity} in ${i.file_path}: ${i.description}`)
    .join('\n')

  const prompt = `Generate a 60-90 second voice walkthrough script for a code review. Written as natural spoken language that will be converted to audio.

PR: ${prTitle}
Summary: ${summary}
Top Issues:
${issueText}

The script should:
1. Open with what this PR does (2-3 sentences)
2. Cover the most important issues with specific file names
3. End with a clear recommendation (approve / request changes)
4. Sound natural when read aloud - avoid bullet points or markdown
5. Be between 150-200 words

Return only the script text, no labels or formatting.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') return summary

  return content.text
}

export async function answerCodeQuestion(
  question: string,
  context: string,
  prDiff: string
): Promise<string> {
  const prompt = `You are ArkReview, an AI code review assistant. Answer this question about a pull request using the provided codebase context.

Question: ${question}

PR Diff context:
${prDiff.slice(0, 2000)}

Related codebase context:
${context.slice(0, 2000)}

Provide a concise, technically precise answer. Reference specific files and line numbers where relevant.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') return 'Unable to generate answer.'
  return content.text
}
