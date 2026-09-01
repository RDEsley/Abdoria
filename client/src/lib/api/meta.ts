import { fetchJson } from './client';

export interface HealthResponse {
  status: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export function getHealth(): Promise<HealthResponse> {
  return fetchJson('/health');
}
