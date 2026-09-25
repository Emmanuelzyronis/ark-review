import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-ark-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ark-primary disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-ark-primary hover:bg-ark-primary-hover text-white shadow-ark-sm',
    secondary: 'bg-ark-bg-secondary hover:bg-ark-bg-tertiary text-ark-text-primary border border-ark-border',
    ghost: 'hover:bg-ark-bg-secondary text-ark-text-secondary hover:text-ark-text-primary',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-ark-sm',
    accent: 'bg-ark-accent hover:bg-ark-accent-hover text-white shadow-ark-sm',
  }

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
