/** Skeleton inicial do Construtor: preserva a hierarquia visual enquanto os presets chegam. */
export function BuilderSkeleton() {
  return (
    <div
      className="builder-page flex animate-pulse flex-col gap-5 pb-44"
      aria-label="Carregando missão"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded-full bg-emerald-100" />
          <div className="h-8 w-52 rounded-xl bg-stone-200" />
        </div>
        <div className="flex gap-2">
          <i className="h-11 w-11 rounded-xl bg-stone-200" />
          <i className="h-11 w-11 rounded-xl bg-stone-200" />
        </div>
      </div>
      <div className="h-12 rounded-2xl bg-stone-200" />
      <div className="h-48 rounded-[1.75rem] border border-emerald-100 bg-white/80 p-4 shadow-sm">
        <div className="h-4 w-28 rounded-full bg-emerald-100" />
        <div className="mt-4 h-7 w-3/4 rounded-lg bg-stone-200" />
        <div className="mt-3 h-3 w-full rounded-full bg-stone-100" />
        <div className="mt-2 h-3 w-4/5 rounded-full bg-stone-100" />
      </div>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="flex h-24 items-center gap-3 rounded-2xl border border-stone-100 bg-white/80 p-3"
        >
          <i className="h-16 w-16 rounded-xl bg-emerald-50" />
          <span className="flex-1 space-y-2">
            <i className="block h-4 w-2/3 rounded bg-stone-200" />
            <i className="block h-3 w-1/2 rounded bg-stone-100" />
          </span>
        </div>
      ))}
    </div>
  );
}
