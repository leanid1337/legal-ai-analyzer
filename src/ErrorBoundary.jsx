import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
          <div className="max-w-lg rounded-2xl border border-red-900/50 bg-red-950/40 p-6">
            <h1 className="text-lg font-semibold text-red-200 mb-2">Ошибка при отрисовке</h1>
            <pre className="text-sm text-red-100/90 whitespace-pre-wrap break-words font-sans">
              {this.state.error?.message || String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
