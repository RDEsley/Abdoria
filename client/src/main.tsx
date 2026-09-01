import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './perf-mobile.css';
import App from './App.tsx';
import { initializeNativeRuntime } from '@/lib/platform/native-runtime';

async function bootstrap() {
  try {
    await initializeNativeRuntime();
  } catch (error) {
    console.error('Falha ao inicializar integrações nativas:', error);
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
