import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Blindagem local pra widgets decorativos (animações, embeds) que não podem
 * derrubar a tela inteira se algo der errado no render deles — cai pro
 * `fallback` (ou nada) em vez de estourar pro root e deixar a página em branco.
 */
export class MiniErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('MiniErrorBoundary capturou um erro:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
