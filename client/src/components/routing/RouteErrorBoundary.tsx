import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';

type Props = {
  children: ReactNode;
  /** Chamado em "Tentar novamente" — tipicamente remount da rota. */
  onRetry?: () => void;
};

type State = { hasError: boolean };

/**
 * Boundary por rota lazy: nunca deixa tela branca infinita após falha de import/render.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Evolyn] Falha ao abrir rota', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="route-error-recovery" role="alert">
        <h2 className="route-error-recovery__title">Não foi possível abrir esta página.</h2>
        <p className="route-error-recovery__copy">
          O Evolyn encontrou um problema ao carregar esta área.
        </p>
        <div className="route-error-recovery__actions">
          <GameButton onClick={this.retry}>Tentar novamente</GameButton>
          <Link to="/" className="game-btn game-btn--ghost route-error-recovery__home">
            Ir para o início
          </Link>
        </div>
      </div>
    );
  }
}
