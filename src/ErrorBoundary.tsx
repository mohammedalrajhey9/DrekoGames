import React from 'react'

type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: undefined }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    try { console.error('ErrorBoundary caught', error, info) } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#01050a', color: '#fff', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h2 style={{ margin: 0 }}>Dreko Launcher — Unexpected error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, color: '#ffdede' }}>{String(this.state.error)}</pre>
          <div style={{ marginTop: 12 }}>Check the DevTools console for details.</div>
        </div>
      )
    }

    return this.props.children as any
  }
}
