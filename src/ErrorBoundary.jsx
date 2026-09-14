import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error, info) {
    // Display fallback UI
    this.setState({ error, info });
    // Also surface to console
    // eslint-disable-next-line no-console
    console.error('Uncaught error in React tree:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#b91c1c' }}>Application Error</h1>
          <p style={{ color: '#374151' }}>A runtime error occurred while rendering the app.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre>{String(this.state.error && this.state.error.stack)}</pre>
            <pre>{String(this.state.info && this.state.info.componentStack)}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
