import { fetchJson } from './client';

export interface HealthResponse {
  status: string;
  database: 'connected' | 'disconnected';
  database_error?: string;
  timestamp: string;
}

export function getHealth(): Promise<HealthResponse> {
  return fetchJson('/health');
}

export interface InventorySummary {
  frozen_streak: number;
  stack_cap: number;
}

export function getInventory(): Promise<InventorySummary> {
  return fetchJson('/meta/inventory');
}
