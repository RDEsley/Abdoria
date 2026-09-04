import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('routines lifecycle UX guards', () => {
  it('não usa window.confirm ao arquivar rotina', () => {
    const editor = readSrc('client/src/features/activities/RoutineEditorSheet.tsx');
    const tab = readSrc('client/src/features/activities/RoutinesTab.tsx');
    expect(editor).not.toMatch(/window\.confirm/);
    expect(tab).not.toMatch(/window\.confirm/);
    expect(editor).toContain('Arquivando…');
    expect(tab).toContain('Rotina arquivada');
    expect(tab).toContain('Desfazer');
    expect(tab).toContain('repair-restore');
    expect(tab).toContain('Revisar e restaurar');
  });

  it('Runner bloqueia rotina quebrada sem lista vazia silenciosa', () => {
    const runner = readSrc('client/src/features/activities/RoutineRunner.tsx');
    expect(runner).toContain('resolveRoutineHealth');
    expect(runner).toContain('isRoutineFullyRunnable');
    expect(runner).toContain('Esta rotina precisa de atenção');
    expect(runner).toContain('Editar rotina');
    expect(runner).toContain('Arquivar rotina');
    expect(runner).not.toMatch(/Excluir/);
  });

  it('editor remove stale items e exige itens válidos', () => {
    const editor = readSrc('client/src/features/activities/RoutineEditorSheet.tsx');
    expect(editor).toContain('staleRemovedCount');
    expect(editor).toContain('selectedActivities.length > 0');
    expect(editor).toContain('ser substituída');
  });

  it('day service só trata rotinas runnable no guide e hasRoutines com vida', () => {
    const day = readSrc('server/src/services/day.ts');
    expect(day).toContain('resolveRoutineHealth');
    expect(day).toContain('runnableRoutines');
    expect(day).toContain('isRoutineFullyRunnable');
    expect(day).toContain('routineHasAvailableItems');
    expect(day).toContain('filterAvailableRoutineItems');
  });
});

describe('lazy route white-screen resilience', () => {
  it('App usa lazyWithRecovery + RouteErrorBoundary + fallback visível', () => {
    const app = readSrc('client/src/App.tsx');
    expect(app).toContain('lazyWithRecovery');
    expect(app).toContain('RouteErrorBoundary');
    expect(app).toContain('route-page-fallback');
    expect(app).not.toMatch(/className="route-fallback"/);
  });

  it('boundary e recovery helpers existem', () => {
    const boundary = readSrc('client/src/components/routing/RouteErrorBoundary.tsx');
    const lazy = readSrc('client/src/lib/lazy-with-recovery.ts');
    expect(boundary).toContain('Não foi possível abrir esta página.');
    expect(boundary).toContain('Tentar novamente');
    expect(boundary).toContain('Ir para o início');
    expect(lazy).toContain('shouldReloadForChunkError');
    expect(lazy).toContain('window.location.reload');
  });
});

describe('training loading + core plan polish', () => {
  it('distingue carga inicial vs refresh e remove copy de espera', () => {
    const page = readSrc('client/src/pages/TrainingPage.tsx');
    expect(page).toContain('holdInitialSkeleton');
    expect(page).toContain("runRecommendLoad('initial')");
    expect(page).toContain("runRecommendLoad('background')");
    expect(page).toContain('Não conseguimos montar seu treino agora.');
    expect(page).not.toContain('Aguardando recomendação de treino');
    expect(page).not.toContain('Ajustar Plano de Core');
    expect(page).toContain('Foco da sessão');
    expect(page).toContain("openAbPlan('custom')");
    expect(page).toContain("entryScreen=");
  });

  it('intensidade é lista vertical com variants próprias', () => {
    const css = readSrc('client/src/styles/product-polish.css');
    expect(css).toMatch(/\.builder-level-options\s*\{[^}]*flex-direction:\s*column/s);
    expect(css).toContain('.builder-level-switch--leve.is-active');
    expect(css).toContain('.builder-level-switch--evolyn.is-active');
    expect(css).toContain('.builder-level-switch--custom.is-active');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
  });

  it('wizard: monte-sua-semana, entry custom, 5 cards sem Modalidade', () => {
    const wizard = readSrc('client/src/components/training/AbTrainingProfileWizard.tsx');
    expect(wizard).toContain('monte-sua-semana.json');
    expect(wizard).toContain("entryScreen?: 'default' | 'custom'");
    expect(wizard).toContain('ab-plan-summary__grid--five');
    expect(wizard).not.toContain('Modalidade');
    expect(wizard).not.toMatch(/PersonStanding/);
  });
});
