import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ark-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 w-full rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 py-2',
          'text-sm text-ark-text-primary placeholder:text-ark-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-ark-primary focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Textarea({ className, label, error, id, ...props }: InputProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ark-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 py-2',
          'text-sm text-ark-text-primary placeholder:text-ark-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-ark-primary focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
          'transition-colors duration-150',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
