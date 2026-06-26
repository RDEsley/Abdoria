interface Props {
  showClouds?: boolean;
  showSparkles?: boolean;
}

const TREE_SLOTS = [
  { left: '4%', scale: 1.02, variant: 0 },
  { left: '14%', scale: 1.2, variant: 1 },
  { left: '26%', scale: 0.9, variant: 2 },
  { left: '38%', scale: 1.14, variant: 0 },
  { left: '52%', scale: 0.96, variant: 1 },
  { left: '64%', scale: 1.26, variant: 2 },
  { left: '76%', scale: 1.08, variant: 0 },
  { left: '88%', scale: 0.84, variant: 1 },
] as const;

export function AfkSkyCycle({ showClouds = true, showSparkles = false }: Props) {
  return (
    <div className="game-afk-sky-cycle" aria-hidden>
      <div className="game-afk-sky-cycle__gradient" />
      <div className="game-afk-sky-cycle__stars" />
      <div className="game-afk-sky-cycle__sun" />
      <div className="game-afk-sky-cycle__moon" />
      {showClouds && (
        <>
          <div className="game-afk-sky-cycle__cloud game-afk-sky-cycle__cloud--1" />
          <div className="game-afk-sky-cycle__cloud game-afk-sky-cycle__cloud--2" />
          <div className="game-afk-sky-cycle__cloud game-afk-sky-cycle__cloud--3" />
        </>
      )}

      <div className="game-afk-sky-cycle__backdrop" aria-hidden>
        <div className="game-afk-sky-cycle__mountain game-afk-sky-cycle__mountain--1" />
        <div className="game-afk-sky-cycle__mountain game-afk-sky-cycle__mountain--2" />
        <div className="game-afk-sky-cycle__mountain game-afk-sky-cycle__mountain--3" />
        <div className="game-afk-sky-cycle__mountain game-afk-sky-cycle__mountain--4" />
      </div>

      <div className="game-afk-sky-cycle__tree-row">
        {TREE_SLOTS.map((tree, index) => (
          <div
            key={`${tree.left}-${index}`}
            className={`game-afk-sky-cycle__tree game-afk-sky-cycle__tree--v${tree.variant}`}
            style={{
              left: tree.left,
              transform: `scale(${tree.scale})`,
            }}
          >
            <span className="game-afk-sky-cycle__tree-crown" />
            <span className="game-afk-sky-cycle__tree-trunk" />
          </div>
        ))}
      </div>

      <div className="game-afk-sky-cycle__ground">
        <div className="game-afk-sky-cycle__grass-edge" />
        <div className="game-afk-sky-cycle__grass-tufts" aria-hidden />
        <div className="game-afk-sky-cycle__dirt-layer" />
        <div className="game-afk-sky-cycle__dirt-stones" aria-hidden />
      </div>

      {showSparkles && (
        <>
          <span className="game-afk-scene__sparkle game-afk-scene__sparkle--1" />
          <span className="game-afk-scene__sparkle game-afk-scene__sparkle--2" />
          <span className="game-afk-scene__sparkle game-afk-scene__sparkle--3" />
        </>
      )}
    </div>
  );
}
