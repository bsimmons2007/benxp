import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Sentry } from '../lib/sentry'

interface Props {
  children:  ReactNode
  fallback?: ReactNode
  // Lighter in-page fallback for per-route boundaries
  inline?: boolean
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (!this.state.error) return this.props.children

    if (this.props.fallback) return this.props.fallback

    // Inline (per-route) fallback — stays inside the shell, doesn't crash the whole UI
    if (this.props.inline) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 28, marginBottom: 12 }}>⚠️</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            This page ran into a problem
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 260 }}>
            Your data is safe. Try going back or reloading the app.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: 'var(--surface-2)', color: 'var(--text-primary)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 8,
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    // Full-screen fallback for the root boundary
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', background: 'var(--surface-0)', textAlign: 'center',
      }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>💥</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Something went wrong
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 300 }}>
          If the problem persists, try clearing your browser cache or reinstalling the app.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--base-bg)',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    )
  }
}
