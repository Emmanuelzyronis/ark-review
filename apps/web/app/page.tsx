import Link from 'next/link'
import { Zap, Shield, Volume2, GitPullRequest, CheckCircle, ArrowRight, Star, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Volume2,
    title: 'Voice Walkthroughs',
    description: 'Claude generates a 60-90 second audio narration of every PR\'s architectural implications. No more reading through 50 text comments.',
    color: 'text-ark-accent',
    bg: 'bg-ark-accent-muted/30',
  },
  {
    icon: Shield,
    title: 'Architectural Analysis',
    description: 'Detects N+1 queries, missing error handling, exposed secrets, breaking interface changes, and dependency anti-patterns with cited evidence.',
    color: 'text-ark-primary',
    bg: 'bg-ark-primary-muted/50',
  },
  {
    icon: GitPullRequest,
    title: 'GitHub-Native',
    description: 'Install as a GitHub App. Every PR gets a structured review comment with severity scores in under 60 seconds. One-click approve or request changes.',
    color: 'text-green-400',
    bg: 'bg-green-900/20',
  },
]

const stats = [
  { value: '< 60s', label: 'Review turnaround' },
  { value: '5x', label: 'Faster than waiting for senior review' },
  { value: '100%', label: 'PRs reviewed automatically' },
]

const steps = [
  { step: '01', title: 'Install GitHub App', desc: 'Install on any repo. ArkReview indexes your codebase in under 5 minutes using pgvector semantic search.' },
  { step: '02', title: 'Open a PR', desc: 'Every pull request automatically triggers the LangGraph review pipeline.' },
  { step: '03', title: 'Get Voice Walkthrough', desc: 'Claude analyzes the diff with codebase context and AssemblyAI generates a voice narration in under 60 seconds.' },
  { step: '04', title: 'Approve or Request Changes', desc: 'One click from the ArkReview dashboard posts a structured GitHub review with the Claude summary.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ark-bg">
      {/* Nav */}
      <nav className="border-b border-ark-border bg-ark-bg/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-ark-sm bg-ark-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-ark-text-primary">ArkReview</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ark-accent-muted/40 border border-ark-accent/30 text-ark-accent text-xs font-medium mb-8">
          <Star className="h-3.5 w-3.5" />
          AMD Developer Hackathon: ACT III — 2026
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-ark-text-primary mb-6 leading-tight">
          Voice-driven AI code review that{' '}
          <span className="text-ark-accent">catches what Copilot creates</span>
        </h1>

        <p className="text-xl text-ark-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          PRs sit for 24-72 hours waiting for senior engineer attention.
          ArkReview delivers architectural walkthroughs — not just lint comments — in under 60 seconds.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/auth/register">
            <Button size="lg" className="gap-2">
              Install on GitHub
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="lg">
              View Demo Dashboard
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-ark-primary">{stat.value}</div>
              <div className="text-sm text-ark-text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem callout */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-ark-xl p-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-amber-300 mb-2">
                METR 2026: Developers are 19% slower with AI coding assistants
              </h2>
              <p className="text-amber-200/80 leading-relaxed">
                The bottleneck is <strong>review</strong>, not generation. Cursor crossed 500K active developers.
                Every team shipping AI-generated code at velocity needs a review layer that understands architecture.
                CodeRabbit posts shallow text comments — no tool offers voice-driven architectural walkthroughs.
                Until now.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-ark-text-primary mb-4">
          Everything your senior engineer would catch
        </h2>
        <p className="text-center text-ark-text-secondary mb-12 max-w-xl mx-auto">
          Built on LangGraph + Claude + pgvector. Runs on AMD AI Cloud.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 hover:border-ark-primary/50 transition-colors">
              <div className={`h-12 w-12 rounded-ark-lg ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-ark-text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-ark-text-secondary leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-ark-text-primary mb-12">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-ark-border z-0" style={{ left: 'calc(100% + 12px)', width: '24px' }} />
              )}
              <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 h-full">
                <div className="text-3xl font-bold text-ark-primary/30 mb-4">{s.step}</div>
                <h3 className="font-semibold text-ark-text-primary mb-2">{s.title}</h3>
                <p className="text-sm text-ark-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="bg-gradient-to-br from-ark-primary-muted to-ark-accent-muted/30 border border-ark-primary/30 rounded-ark-xl p-12">
          <Volume2 className="h-12 w-12 text-ark-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-ark-text-primary mb-4">
            Stop waiting 48 hours for a silent text comment
          </h2>
          <p className="text-ark-text-secondary mb-8 max-w-lg mx-auto">
            Get a voice walkthrough of every PR in under 60 seconds. Free during the hackathon.
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="gap-2">
              Get started — it's free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ark-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-ark-primary" />
            <span className="text-sm text-ark-text-muted">ArkReview — AMD Developer Hackathon 2026</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-ark-text-muted">
            <Link href="/auth/login" className="hover:text-ark-text-secondary transition-colors">Sign in</Link>
            <Link href="/dashboard" className="hover:text-ark-text-secondary transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
