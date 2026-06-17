export const DASHBOARD_LEVEL_XP_SECTION_ID = 'dashboard-level-xp';

export function scrollToDashboardLevelXp(): void {
  document.getElementById(DASHBOARD_LEVEL_XP_SECTION_ID)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
