'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, Volume2, FileText, Download } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface VoicePlayerProps {
  audioUrl?: string | null
  transcript?: string | null
  duration?: number | null
  status?: string
}

const BARS = 32

export function VoicePlayer({ audioUrl, transcript, duration, status }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showTranscript, setShowTranscript] = useState(false)
  const [speed, setSpeed] = useState(1)
  const audioRef = useRef<HTMLAudioElement>(null)

  const totalDuration = duration || 90

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setProgress((audio.currentTime / audio.duration) * 100)
    }
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) {
      // Demo mode without real audio
      setPlaying(p => !p)
      return
    }
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const restart = () => {
    const audio = audioRef.current
    if (audio) { audio.currentTime = 0 }
    setProgress(0)
    setCurrentTime(0)
    setPlaying(false)
  }

  const setPlaybackSpeed = (s: number) => {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    if (audioRef.current) {
      audioRef.current.currentTime = pct * audioRef.current.duration
    }
    setProgress(pct * 100)
  }

  const seekByKeyboard = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 5 // seconds per arrow key press
    const duration = audioRef.current?.duration || totalDuration
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min((audioRef.current?.currentTime || (progress / 100 * duration)) + step, duration)
      if (audioRef.current) audioRef.current.currentTime = next
      setProgress((next / duration) * 100)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max((audioRef.current?.currentTime || (progress / 100 * duration)) - step, 0)
      if (audioRef.current) audioRef.current.currentTime = next
      setProgress((next / duration) * 100)
    }
  }

  if (status === 'pending' || status === 'generating') {
    return (
      <div className="bg-ark-bg-tertiary border border-ark-border rounded-ark-lg p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-ark-primary-muted flex items-center justify-center">
            <Volume2 className="h-5 w-5 text-ark-primary pulse-soft" />
          </div>
          <div>
            <div className="text-sm font-medium text-ark-text-primary">Generating voice walkthrough...</div>
            <div className="text-xs text-ark-text-muted">AssemblyAI TTS processing — usually under 30s</div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'failed' || status === 'error') {
    return (
      <div className="bg-ark-bg-tertiary border border-red-700/30 rounded-ark-lg p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-900/30 flex items-center justify-center">
            <Volume2 className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-ark-text-primary">Voice walkthrough unavailable</div>
            <div className="text-xs text-ark-text-muted">TTS generation failed. Re-running the review will retry.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ark-bg-tertiary border border-ark-border rounded-ark-lg p-5 space-y-4">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Waveform + controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="h-11 w-11 rounded-full bg-ark-primary hover:bg-ark-primary-hover flex items-center justify-center flex-shrink-0 transition-colors shadow-ark-glow-primary"
          aria-label={playing ? 'Pause' : 'Play voice walkthrough'}
        >
          {playing
            ? <Pause className="h-5 w-5 text-white" />
            : <Play className="h-5 w-5 text-white ml-0.5" />
          }
        </button>

        <div className="flex-1 space-y-2">
          {/* Waveform bars */}
          <div className="flex items-center gap-0.5 h-10">
            {[...Array(BARS)].map((_, i) => {
              const barProgress = (i / BARS) * 100
              const isActive = barProgress <= progress
              const height = 20 + Math.sin(i * 0.8) * 15 + Math.cos(i * 0.3) * 10
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-full transition-colors',
                    isActive ? 'bg-ark-primary' : 'bg-ark-border',
                    playing && isActive && 'waveform-bar'
                  )}
                  style={{
                    height: `${height}px`,
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              )
            })}
          </div>

          {/* Seek bar */}
          <div
            className="h-1.5 bg-ark-border rounded-full cursor-pointer relative"
            onClick={seek}
            onKeyDown={seekByKeyboard}
            role="slider"
            tabIndex={0}
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${formatDuration(Math.round(currentTime))} of ${formatDuration(totalDuration)}`}
          >
            <div
              className="h-full bg-ark-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-ark-text-muted">
            <span>{formatDuration(Math.round(currentTime))}</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          onClick={restart}
          className="p-1.5 rounded-ark-sm hover:bg-ark-bg-secondary text-ark-text-muted hover:text-ark-text-secondary transition-colors"
          aria-label="Restart"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {[0.75, 1, 1.25, 1.5, 2].map(s => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={cn(
                'px-2 py-0.5 rounded text-xs transition-colors',
                speed === s
                  ? 'bg-ark-primary text-white'
                  : 'text-ark-text-muted hover:text-ark-text-secondary hover:bg-ark-bg-secondary'
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-ark-sm text-xs transition-colors',
            showTranscript
              ? 'bg-ark-primary-muted text-ark-primary'
              : 'text-ark-text-muted hover:bg-ark-bg-secondary hover:text-ark-text-secondary'
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Transcript
        </button>

        {audioUrl && (
          <a
            href={audioUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-ark-sm text-xs text-ark-text-muted hover:bg-ark-bg-secondary hover:text-ark-text-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        )}
      </div>

      {/* Transcript panel */}
      {showTranscript && transcript && (
        <div className="border-t border-ark-border pt-4">
          <div className="text-xs text-ark-text-muted mb-2 font-medium uppercase tracking-wider">Transcript</div>
          <div className="text-sm text-ark-text-secondary leading-relaxed bg-ark-bg-secondary rounded-ark-md p-4 max-h-40 overflow-y-auto">
            {transcript}
          </div>
        </div>
      )}
    </div>
  )
}
