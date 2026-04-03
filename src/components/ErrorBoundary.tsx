import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
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
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'inherit',
          color: 'var(--text)',
          backgroundColor: 'var(--bg)',
        }}
      >
        <h1 style={{ marginBottom: '0.5rem' }}>Something went wrong</h1>
        <pre
          style={{
            maxWidth: '600px',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--bad)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'var(--bg)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    )
  }
}
