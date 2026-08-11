import { describe, expect, it } from 'vitest';
import {
  AFK_SKILL_NODES,
  afkDefeatDurationMs,
  afkSearchReductionMs,
  getAfkSkillTotal,
  type AfkSkillBranch,
} from '../../shared/types/index.js';

const ALL_NODE_IDS = AFK_SKILL_NODES.map((node) => node.id);

describe('Árvore de habilidades AFK', () => {
  it('oferece progressão longa com pelo menos 53 passos e custo balanceado', () => {
    const totalCost = AFK_SKILL_NODES.reduce((total, node) => total + node.cost, 0);
    const branchCounts = AFK_SKILL_NODES.reduce(
      (counts, node) => {
        counts[node.branch] += 1;
        return counts;
      },
      {
        arco: 0,
        espada: 0,
        magia: 0,
        sobrevivencia: 0,
        fortuna: 0,
      } satisfies Record<AfkSkillBranch, number>,
    );

    expect(AFK_SKILL_NODES.length).toBeGreaterThanOrEqual(53);
    expect(totalCost).toBeGreaterThanOrEqual(180);
    expect(totalCost).toBeLessThanOrEqual(230);
    expect(branchCounts.arco).toBeGreaterThanOrEqual(10);
    expect(branchCounts.espada).toBeGreaterThanOrEqual(10);
    expect(branchCounts.magia).toBeGreaterThanOrEqual(10);
    expect(branchCounts.fortuna).toBeGreaterThanOrEqual(10);
    expect(branchCounts.sobrevivencia).toBeGreaterThanOrEqual(10);

    for (const node of AFK_SKILL_NODES) {
      expect(Number.isInteger(node.cost)).toBe(true);
      expect(node.cost).toBeGreaterThanOrEqual(1);
      expect(node.cost).toBeLessThanOrEqual(6);
      expect(node.value).toBeGreaterThan(0);
    }
  });

  it('mantém IDs únicos e pré-requisitos existentes dentro de cada caminho', () => {
    const nodesById = new Map(AFK_SKILL_NODES.map((node) => [node.id, node]));

    expect(nodesById.size).toBe(AFK_SKILL_NODES.length);
    expect(nodesById.get('core_instinct')?.requires).toEqual([]);

    for (const node of AFK_SKILL_NODES) {
      expect(new Set(node.requires).size).toBe(node.requires.length);
      expect(node.requires).not.toContain(node.id);

      for (const requirementId of node.requires) {
        const requirement = nodesById.get(requirementId);
        expect(
          requirement,
          `${node.id} depende de um nó inexistente: ${requirementId}`,
        ).toBeDefined();
        if (requirementId !== 'core_instinct') {
          expect(requirement?.branch).toBe(node.branch);
        }
      }
    }
  });

  it('não possui ciclos de dependência', () => {
    const nodesById = new Map(AFK_SKILL_NODES.map((node) => [node.id, node]));
    const completed = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string): void => {
      if (completed.has(nodeId)) return;
      expect(visiting.has(nodeId), `ciclo encontrado a partir de ${nodeId}`).toBe(false);
      visiting.add(nodeId);
      for (const requirementId of nodesById.get(nodeId)?.requires ?? []) visit(requirementId);
      visiting.delete(nodeId);
      completed.add(nodeId);
    };

    for (const node of AFK_SKILL_NODES) visit(node.id);
    expect(completed.size).toBe(AFK_SKILL_NODES.length);
  });

  it('mantém os ícones dentro do mapa e com espaçamento legível', () => {
    for (const node of AFK_SKILL_NODES) {
      expect(node.x).toBeGreaterThanOrEqual(3);
      expect(node.x).toBeLessThanOrEqual(97);
      expect(node.y).toBeGreaterThanOrEqual(3);
      expect(node.y).toBeLessThanOrEqual(97);
    }

    for (let index = 0; index < AFK_SKILL_NODES.length; index += 1) {
      const first = AFK_SKILL_NODES[index];
      for (let otherIndex = index + 1; otherIndex < AFK_SKILL_NODES.length; otherIndex += 1) {
        const second = AFK_SKILL_NODES[otherIndex];
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        expect(distance, `${first.id} e ${second.id} estão próximos demais`).toBeGreaterThanOrEqual(
          5,
        );
      }
    }
  });

  it('respeita os tetos úteis de procura e recuperação', () => {
    const searchReduction = getAfkSkillTotal(ALL_NODE_IDS, 'search_reduction_ms');
    const defeatReduction = getAfkSkillTotal(ALL_NODE_IDS, 'defeat_reduction_ms');

    expect(searchReduction).toBeLessThanOrEqual(2_500);
    expect(defeatReduction).toBeLessThanOrEqual(4_000);
    expect(afkSearchReductionMs(ALL_NODE_IDS)).toBe(searchReduction);
    expect(afkDefeatDurationMs(ALL_NODE_IDS)).toBe(10_000 - defeatReduction);
  });
});
