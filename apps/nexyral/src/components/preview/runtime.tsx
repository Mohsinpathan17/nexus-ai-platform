import * as React from 'react';
import { createRoot } from 'react-dom/client';

// This bundle runs only inside the opaque-origin, network-disabled preview frame.
const report = (state: string, message = '') => parent.postMessage({
  type: 'nexyral-preview', key: document.documentElement.dataset.channel, state, message,
}, '*');
window.addEventListener('error', event => report('error', event.message));
window.addEventListener('unhandledrejection', event => report('error', String(event.reason)));
export class PreviewBoundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error) { report('error', error.message); }
  render() { return this.state.error ? <main role="alert" style={{ padding: 32, fontFamily: 'system-ui' }}>This preview encountered an error. Return to the editor to fix it.</main> : this.props.children; }
}
export function Ready() {
  React.useEffect(() => report('ready'), []);
  return null;
}
const runtime = {
  react: { ...React, default: React, __esModule: true },
  mount(App: React.ComponentType) {
    if (typeof App !== 'function' && typeof App !== 'object') throw new Error('App.tsx must export a React component as default.');
    createRoot(document.getElementById('root')!).render(<PreviewBoundary><App /><Ready /></PreviewBoundary>);
  },
};
Object.assign(window, { NexyralRuntime: runtime });
