interface ToolbarProps {
  onPick: (type: "card" | "char" | "pet" | "equip") => void;
  onSave: () => void;
}

export function Toolbar({ onPick, onSave }: ToolbarProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 p-3 shadow-lg shadow-black/40 backdrop-blur">
      <button
        onClick={() => onPick("card")}
        className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        카드 추가
      </button>
      <button
        onClick={() => onPick("char")}
        className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        캐릭터 추가
      </button>
      <button
        onClick={() => onPick("pet")}
        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        펫 추가
      </button>
      <button
        onClick={() => onPick("equip")}
        className="rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        장비 추가
      </button>
      <div className="mx-4 h-8 w-px bg-white/20" />
      <button
        onClick={onSave}
        className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        저장하기 (PNG)
      </button>
    </div>
  );
}
