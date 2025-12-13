"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Toolbar } from "@/components/Toolbar";
import cards from "@/data/cards.json";
import chars from "@/data/chars.json";
import equips from "@/data/equip.json";
import pets from "@/data/pets.json";
import type { ItemType } from "@/lib/store";

type LibraryItem = {
  id: string;
  name: string;
  src: string;
};

type EquipKind = "weapon" | "armor" | "helmet" | "roon" | "other";

export default function Page() {
  const [picker, setPicker] = useState<ItemType | null>(null);
  const mode: "slots" = "slots";
  const [compactView, setCompactView] = useState(false);
  const [search, setSearch] = useState("");
  const [slotTarget, setSlotTarget] = useState<{
    type: "char" | "card" | "pet" | "equip";
    slotIndex: number;
    equipKind?: EquipKind;
  } | null>(null);
  const [skillOrders, setSkillOrders] = useState<
    { id: string; label: string; text: string }[]
  >([
    { id: "cycle-1", label: "1 cycle", text: "" },
    { id: "cycle-2", label: "2 cycle", text: "" },
    { id: "cycle-3", label: "3 cycle", text: "" }
  ]);
  const [formationSlots, setFormationSlots] = useState<
    (LibraryItem | null)[]
  >([null, null, null, null, null, null]); // 0-1 후열(파랑), 2-3 중열(주황), 4-5 전열(빨강)
  const [formationPick, setFormationPick] = useState<LibraryItem | null>(null);
  const [petFormationSlots, setPetFormationSlots] = useState<
    (LibraryItem | null)[]
  >([null, null, null]); // 후열/중열/전열 한 칸씩
  const [petFormationPick, setPetFormationPick] = useState<LibraryItem | null>(null);
  const initialCharSlots = useMemo(
    () =>
      Array.from({ length: 5 }, (_, idx) => ({
        id: `slot-${idx + 1}`,
        char: null as LibraryItem | null,
        card: null as LibraryItem | null,
        equips: {
          weapon: null as LibraryItem | null,
          armor: null as LibraryItem | null,
          helmet: null as LibraryItem | null,
          roon: null as LibraryItem | null
        }
      })),
    []
  );
  const [charSlots, setCharSlots] = useState(initialCharSlots);
  const [petSlots, setPetSlots] = useState<(LibraryItem | null)[]>([
    null,
    null,
    null
  ]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const libraries = useMemo<Record<ItemType, LibraryItem[]>>(
    () => ({
      card: cards,
      char: chars,
      pet: pets,
      equip: equips
    }),
    []
  );

  const equipWithType = useMemo(
    () =>
      equips.map((eq) => ({
        ...eq,
        kind: getEquipKind(eq.src)
      })),
    []
  );

  // 글로벌 Delete/Backspace 단축키는 비활성화해 입력 시 스크롤 점프를 방지합니다.
  useEffect(() => {}, []);

  const handleSave = async () => {
    if (!canvasRef.current) return;
    const node = canvasRef.current;
    const prev = {
      transform: node.style.transform,
      transformOrigin: node.style.transformOrigin,
      width: node.style.width,
      height: node.style.height,
      overflow: node.style.overflow
    };

    const w = node.scrollWidth;
    const h = node.scrollHeight;
    node.style.transform = "none";
    node.style.transformOrigin = "top left";
    node.style.width = `${w}px`;
    node.style.height = `${h}px`;
    node.style.overflow = "visible";

    const canvas = await html2canvas(node, {
      backgroundColor: null,
      useCORS: true,
      scale: 1,
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h
    });

    node.style.transform = prev.transform;
    node.style.transformOrigin = prev.transformOrigin;
    node.style.width = prev.width;
    node.style.height = prev.height;
    node.style.overflow = prev.overflow;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `lostsword-${Date.now()}.png`;
    link.click();
  };

  const handleAdd = (type: ItemType, src: string) => {
    setPicker(null);
  };

  const handleSelectToSlot = (item: LibraryItem) => {
    if (!slotTarget) return;
    if (slotTarget.type === "pet") {
      setPetSlots((prev) => {
        const next = [...prev];
        next[slotTarget.slotIndex] = item;
        return next;
      });
    } else if (slotTarget.type === "char") {
      setCharSlots((prev) => {
        const next = [...prev];
        next[slotTarget.slotIndex] = {
          ...next[slotTarget.slotIndex],
          char: item
        };
        return next;
      });
    } else if (slotTarget.type === "card") {
      setCharSlots((prev) => {
        const next = [...prev];
        next[slotTarget.slotIndex] = {
          ...next[slotTarget.slotIndex],
          card: item
        };
        return next;
      });
    } else if (slotTarget.type === "equip" && slotTarget.equipKind) {
      setCharSlots((prev) => {
        const next = [...prev];
        next[slotTarget.slotIndex] = {
          ...next[slotTarget.slotIndex],
          equips: {
            ...next[slotTarget.slotIndex].equips,
            [slotTarget.equipKind]: item
          }
        };
        return next;
      });
    }
    setSlotTarget(null);
    setPicker(null);
  };

  const renderSlotPickerList = () => {
    if (!picker || !slotTarget) return null;
    const currentId =
      slotTarget.type === "char"
        ? charSlots[slotTarget.slotIndex].char?.id
        : slotTarget.type === "card"
          ? charSlots[slotTarget.slotIndex].card?.id
          : slotTarget.type === "pet"
            ? petSlots[slotTarget.slotIndex]?.id
            : null;

    const usedCharIds = new Set(
      charSlots.map((c) => c.char?.id).filter(Boolean) as string[]
    );
    const usedCardIds = new Set(
      charSlots.map((c) => c.card?.id).filter(Boolean) as string[]
    );
    const usedPetIds = new Set(
      petSlots.map((p) => p?.id).filter(Boolean) as string[]
    );

    const filterAvailable = (list: LibraryItem[], type: ItemType) =>
      list.filter((item) => {
        if (type === "char") return !usedCharIds.has(item.id) || item.id === currentId;
        if (type === "card") return !usedCardIds.has(item.id) || item.id === currentId;
        if (type === "pet") return !usedPetIds.has(item.id) || item.id === currentId;
        return true;
      });

    let list: LibraryItem[] = [];
    if (slotTarget.type === "equip" && slotTarget.equipKind) {
      list = equipWithType
        .filter((eq) => eq.kind === slotTarget.equipKind || eq.kind === "other")
        .map(({ kind: _, ...rest }) => rest);
    } else {
      list = filterAvailable(libraries[picker], picker);
    }
    const query = search.trim().toLowerCase();
    const filtered = query
      ? list.filter((item) => item.name.toLowerCase().includes(query))
      : list;
    const isEquip = slotTarget.type === "equip";
    return (
      <div
        className={
          isEquip
            ? "max-h-[620px] space-y-3 overflow-y-auto pr-1 scrollbar-thin"
            : "max-h-[620px] space-y-2 overflow-y-auto pr-1 scrollbar-thin"
        }
      >
        {filtered.map((entry) => (
          <button
            key={entry.id}
            onClick={() => handleSelectToSlot(entry)}
            className={`group relative overflow-hidden rounded-lg border border-white/10 text-left transition hover:border-white/30 hover:shadow-lg hover:shadow-black/40 ${
              isEquip ? "flex items-center gap-3 bg-black/40 px-3 py-3" : "h-16 w-full bg-black/50"
            }`}
            style={
              isEquip
                ? {}
                : {
                    backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.4)), url(${entry.src})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }
            }
          >
            {isEquip ? (
              <>
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-black/40">
                  <img
                    src={entry.src}
                    alt={entry.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 text-sm font-semibold text-white">
                  <span className="truncate">{entry.name}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    EQUIP
                  </span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center gap-3 px-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-white/20 bg-black/40">
                  <img
                    src={entry.src}
                    alt={entry.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {entry.name}
                  </span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90">
                    {slotTarget.type}
                  </span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  useEffect(() => {
    setSearch("");
  }, [picker]);

  const resetSlot = (
    type: "char" | "card" | "pet" | "equip",
    idx: number,
    equipKind?: EquipKind
  ) => {
    if (type === "pet") {
      setPetSlots((prev) => {
        const next = [...prev];
        next[idx] = null;
        return next;
      });
    } else if (type === "char") {
      setCharSlots((prev) => {
        const next = [...prev];
        next[idx] = { ...initialCharSlots[idx] };
        return next;
      });
    } else if (type === "card") {
      setCharSlots((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], card: null };
        return next;
      });
    } else if (type === "equip" && equipKind) {
      setCharSlots((prev) => {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          equips: { ...next[idx].equips, [equipKind]: null }
        };
        return next;
      });
    }
  };

  const assignFormation = (index: number, item: LibraryItem | null) => {
    setFormationSlots((prev) => {
      const filled = prev.filter(Boolean).length;
      const laneCounts = [0, 0, 0]; // 후, 중, 전
      prev.forEach((slot, idx) => {
        if (!slot) return;
        const lane = idx <= 1 ? 0 : idx <= 3 ? 1 : 2;
        laneCounts[lane] += 1;
      });
      const targetLane = index <= 1 ? 0 : index <= 3 ? 1 : 2;

      if (item) {
        // 이미 같은 캐릭터가 다른 슬롯에 있다면 이동
        const existingIdx = prev.findIndex((s) => s?.id === item.id);
        const next = [...prev];
        if (existingIdx !== -1) {
          next[existingIdx] = null;
          if (existingIdx === index) return next; // 동일 슬롯 클릭 시 제거
          // 이동 시 차감
          const oldLane = existingIdx <= 1 ? 0 : existingIdx <= 3 ? 1 : 2;
          laneCounts[oldLane] -= 1;
        }

        if (!next[index] && filled >= 5) return prev; // 최대 5명
        if (!next[index] && laneCounts[targetLane] >= 2) return prev; // 각 열 2명 제한

        next[index] = item;
        return next;
      }

      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const assignPetFormation = (index: number, item: LibraryItem | null) => {
    setPetFormationSlots((prev) => {
      const next = [...prev];
      // 동일 펫 이동 처리
      const existingIdx = prev.findIndex((s) => s?.id === item?.id);
      if (existingIdx !== -1 && existingIdx !== index) {
        next[existingIdx] = null;
      }
      next[index] = item;
      return next;
    });
  };

  const updateSkillOrder = (
    id: string,
    field: "label" | "text",
    value: string
  ) => {
    setSkillOrders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addSkillOrder = () => {
    const nextNum = skillOrders.length + 1;
    setSkillOrders((prev) => [
      ...prev,
      { id: `cycle-${nextNum}-${Math.random().toString(36).slice(2, 6)}`, label: `${nextNum} cycle`, text: "" }
    ]);
  };

  const removeSkillOrder = (id: string) => {
    setSkillOrders((prev) => prev.filter((item) => item.id !== id));
  };

  const SlotGrid = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        {charSlots.map((slot, idx) => (
          <div
            key={slot.id}
            className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-lg shadow-black/40"
          >
            <div className="flex items-center justify-between">
              <button
                className="text-xs text-red-300 hover:text-red-200"
                onClick={() => resetSlot("char", idx)}
              >
                초기화
              </button>
            </div>
            <button
              onClick={() => {
                setPicker("char");
                setSlotTarget({ type: "char", slotIndex: idx });
              }}
              className="mt-2 aspect-[3/4] w-full max-h-36 overflow-hidden rounded-lg border border-dashed border-white/20 bg-black/30 text-sm text-white/60 transition hover:border-white/40"
            >
              {slot.char ? (
                <div className="relative h-full w-full">
                  <img
                    src={slot.char.src}
                    alt={slot.char.name}
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute inset-x-2 bottom-2 flex items-center justify-center rounded-lg border border-white/10 bg-black/80 px-2 py-1 shadow-lg shadow-black/40 backdrop-blur">
                    <span className="truncate text-sm font-semibold text-white drop-shadow">
                      {slot.char.name}
                    </span>
                  </div>
                </div>
              ) : (
                "캐릭터 선택"
              )}
            </button>

            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPicker("card");
                    setSlotTarget({ type: "card", slotIndex: idx });
                  }}
                  className="flex-1 rounded-md border border-white/15 bg-black/30 px-2 py-2 text-left text-xs text-white/80 hover:border-white/30"
                >
                  {slot.card ? (
                    <div className="relative w-full overflow-hidden rounded-md border border-white/10 bg-black/60 aspect-[5/8] max-h-56">
                      <img
                        src={slot.card.src}
                        alt={slot.card.name}
                        className="h-full w-full object-contain"
                      />
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-center rounded-md bg-black/85 px-2 py-1 shadow-lg shadow-black/40 backdrop-blur">
                        <span className="truncate text-[11px] font-semibold text-white drop-shadow">
                          {slot.card.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    "카드 선택"
                  )}
                </button>
                {slot.card && (
                  <button
                    className="text-xs text-white/50 hover:text-white"
                    onClick={() => resetSlot("card", idx)}
                  >
                    X
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-2">
              {(["weapon", "armor", "helmet", "roon"] as EquipKind[]).map(
                (kind) => (
                  <div key={kind} className="flex items-center gap-2">
                    <button
                    onClick={() => {
                      setPicker("equip");
                      setSlotTarget({
                        type: "equip",
                        slotIndex: idx,
                        equipKind: kind
                      });
                    }}
                    className="flex-1 rounded-md border border-white/15 bg-black/30 px-3 py-2.5 text-left text-xs text-white/80 hover:border-white/30"
                  >
                    {slot.equips[kind] ? (
                      <span className="flex items-center gap-2">
                        <img
                          src={slot.equips[kind]?.src}
                          alt={slot.equips[kind]?.name}
                          className="h-14 w-14 rounded object-cover"
                        />
                        <span className="line-clamp-2 text-sm font-semibold">
                          {slot.equips[kind]?.name}
                        </span>
                      </span>
                    ) : (
                      `${kind.toUpperCase()} 선택`
                    )}
                  </button>
                  {slot.equips[kind] && (
                    <button
                        className="text-xs text-white/50 hover:text-white"
                        onClick={() => resetSlot("equip", idx, kind)}
                      >
                        X
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-lg shadow-black/40">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-white/70">펫</span>
          <button
            className="text-xs text-red-300 hover:text-red-200"
            onClick={() => {
              setPetSlots([null, null, null]);
              setPetFormationSlots([null, null, null]);
              setPetFormationPick(null);
            }}
          >
            전체 초기화
          </button>
        </div>
        <div className="grid grid-cols-[260px_1fr] gap-3">
          <div className="grid grid-cols-3 gap-2">
            {petSlots.map((pet, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 rounded-lg border border-dashed border-white/20 bg-black/20 p-2"
              >
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>펫 {idx + 1}</span>
                  {pet && (
                    <button
                      className="text-white/50 hover:text-white"
                      onClick={() => resetSlot("pet", idx)}
                    >
                      X
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setPicker("pet");
                    setSlotTarget({ type: "pet", slotIndex: idx });
                  }}
                  className="flex h-20 items-center justify-center rounded-md border border-white/15 bg-white/5 px-2 text-xs text-white/80 transition hover:border-white/30"
                >
                  {pet ? (
                    <img
                      src={pet.src}
                      alt={pet.name}
                      className="h-14 w-14 rounded object-cover"
                    />
                  ) : (
                    <span className="text-white/60">펫 선택</span>
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                펫 진형
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-white/60 hover:text-white"
                  onClick={() => {
                    setPetFormationSlots([null, null, null]);
                    setPetFormationPick(null);
                  }}
                >
                  초기화
                </button>
              </div>
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              {petSlots
                .filter(Boolean)
                .map((p) => p as LibraryItem)
                .map((p) => {
                  const inFormation = petFormationSlots.some((s) => s?.id === p.id);
                  const picked = petFormationPick?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPetFormationPick(picked ? null : p)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border text-xs ${
                        picked
                          ? "border-purple-400 bg-purple-500/30"
                          : inFormation
                            ? "border-white/40 bg-white/10"
                            : "border-white/20 bg-white/5 hover:border-white/40"
                      }`}
                      title={p.name}
                    >
                      <img
                        src={p.src}
                        alt={p.name}
                        className="h-9 w-9 rounded object-cover"
                      />
                    </button>
                  );
                })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 items-start">
              {(["후열", "중열", "전열"] as const).map((label, idx) => {
                const colorStyle =
                  label === "후열"
                    ? "from-sky-600/70 via-sky-500/60 to-sky-600/70"
                    : label === "중열"
                      ? "from-amber-500/70 via-amber-400/60 to-amber-500/70"
                      : "from-rose-500/70 via-rose-400/60 to-rose-500/70";
                const current = petFormationSlots[idx];
                return (
                  <div
                    key={label}
                    className={`flex h-36 flex-col items-center justify-start gap-2 rounded-lg border border-white/10 bg-gradient-to-br ${colorStyle} p-2.5`}
                  >
                    <div className="text-xs font-semibold text-white">{label}</div>
                    <button
                      className={`flex h-20 w-20 items-center justify-center rounded-md border ${
                        current
                          ? "border-white/80 bg-black/50"
                          : "border-dashed border-white/50 bg-black/30"
                      }`}
                      onClick={() => {
                        if (current) {
                          assignPetFormation(idx, null);
                          return;
                        }
                        if (petFormationPick) {
                          assignPetFormation(idx, petFormationPick);
                        }
                      }}
                      title={current?.name ?? "빈칸"}
                      >
                        {current ? (
                          <img
                            src={current.src}
                            alt={current.name}
                            className="h-full w-full rounded object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-white/70">빈칸</span>
                        )}
                      </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-lg shadow-black/40"
          onKeyDownCapture={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              진형
            </span>
            <button
              className="text-xs text-white/50 hover:text-white"
              onClick={() => {
                setFormationSlots([null, null, null, null, null, null]);
                setFormationPick(null);
              }}
            >
              배치 초기화
            </button>
          </div>
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {(charSlots.map((s) => s.char).filter(Boolean) as LibraryItem[]).map(
                (c) => {
                  const inFormation = formationSlots.some((s) => s?.id === c.id);
                  const picked = formationPick?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setFormationPick(picked ? null : c)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border text-xs ${
                        picked
                          ? "border-purple-400 bg-purple-500/30"
                          : inFormation
                            ? "border-white/40 bg-white/10"
                            : "border-white/20 bg-white/5 hover:border-white/40"
                      }`}
                      title={c.name}
                    >
                      <img
                        src={c.src}
                        alt={c.name}
                        className="h-9 w-9 rounded object-cover"
                      />
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["후열", "중열", "전열"] as const).map((laneLabel, laneIdx) => {
              const baseIdx = laneIdx * 2;
              const laneSlots = [baseIdx, baseIdx + 1];
              const colorStyle =
                laneLabel === "후열"
                  ? "from-sky-600/70 via-sky-500/60 to-sky-600/70"
                  : laneLabel === "중열"
                    ? "from-amber-500/70 via-amber-400/60 to-amber-500/70"
                    : "from-rose-500/70 via-rose-400/60 to-rose-500/70";
              return (
                <div
                  key={laneLabel}
                  className={`flex h-64 flex-col items-center justify-start gap-3 rounded-lg border border-white/10 bg-gradient-to-br ${colorStyle} p-3`}
                >
                  <div className="text-xs font-semibold text-white">{laneLabel}</div>
                  {laneSlots.map((slotIdx) => {
                    const current = formationSlots[slotIdx];
                    return (
                      <button
                        key={slotIdx}
                        className={`flex h-20 w-20 items-center justify-center rounded-md border ${
                          current
                            ? "border-white/80 bg-black/50"
                            : "border-dashed border-white/50 bg-black/30"
                        }`}
                        onClick={() => {
                          if (current) {
                            assignFormation(slotIdx, null);
                            return;
                          }
                          if (formationPick) {
                            assignFormation(slotIdx, formationPick);
                          }
                        }}
                        title={current?.name ?? "빈칸"}
                      >
                        {current ? (
                          <img
                            src={current.src}
                            alt={current.name}
                            className="h-full w-full rounded object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-white/60">빈칸</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-lg shadow-black/40">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">스킬 순서</span>
            <div className="flex items-center gap-2">
              <button
                className="text-xs text-white/50 hover:text-white"
                onClick={() =>
                  setSkillOrders([
                    { id: "cycle-1", label: "1 cycle", text: "" },
                    { id: "cycle-2", label: "2 cycle", text: "" },
                    { id: "cycle-3", label: "3 cycle", text: "" }
                  ])
                }
              >
                초기화
              </button>
              <button
                className="rounded-md bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-500"
                onClick={addSkillOrder}
              >
                행 추가
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {skillOrders.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-white/10 bg-black/20 p-2"
              >
                <div className="mb-1 flex items-center gap-2">
                  <input
                    value={row.label}
                    onChange={(e) => updateSkillOrder(row.id, "label", e.target.value)}
                    onKeyDownCapture={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white focus:border-white/40 focus:outline-none"
                  />
                  <button
                    className="ml-auto text-xs text-white/50 hover:text-white"
                    onClick={() => removeSkillOrder(row.id)}
                  >
                    X
                  </button>
                </div>
                <input
                  value={row.text}
                  onChange={(e) => updateSkillOrder(row.id, "text", e.target.value)}
                  onKeyDownCapture={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
                  placeholder="예: 란 > 갤러 > 티아 > 비비안 > 에바 28"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            LostSword 아트 배치 에디터
          </h1>
          <button
            onClick={() => setCompactView((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              compactView
                ? "bg-purple-600 text-white"
                : "border border-white/20 bg-white/10 text-white/80 hover:border-white/40"
            }`}
          >
            {compactView ? "컴팩트 해제" : "컴팩트 보기"}
          </button>
        </div>
        <Toolbar onPick={(t) => setPicker(t)} onSave={handleSave} />
      </header>

      <section className="grid grid-cols-[1fr,320px] gap-6">
        <div
          ref={canvasRef}
          className={`h-[720px] overflow-y-auto rounded-2xl border border-white/10 bg-canvas p-4 shadow-2xl shadow-black/50 scrollbar-thin ${
            compactView ? "scale-[0.85] origin-top-left" : ""
          }`}
        >
          <SlotGrid />
        </div>

        <aside className="flex h-[720px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">라이브러리</h2>
            {picker && (
              <button
                onClick={() => {
                  setPicker(null);
                  setSlotTarget(null);
                }}
                className="text-sm text-white/60 transition hover:text-white"
              >
                닫기
              </button>
            )}
          </div>
          {!picker && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-black/20 text-center text-white/60">
              <p className="text-sm">카테고리를 선택하면 리스트가 나타납니다.</p>
              <p className="text-xs text-white/40">
                카드 / 캐릭터 / 펫 / 장비 버튼을 눌러보세요.
              </p>
            </div>
          )}

          {picker && (
            <div className="flex flex-col gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 검색"
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
              />
              {slotTarget ? (
                renderSlotPickerList()
              ) : (
                <div className="max-h-[620px] overflow-y-auto pr-1 scrollbar-thin">
                  {(() => {
                    const usedCharIds = new Set(
                      charSlots.map((c) => c.char?.id).filter(Boolean) as string[]
                    );
                    const usedCardIds = new Set(
                      charSlots.map((c) => c.card?.id).filter(Boolean) as string[]
                    );
                    const usedPetIds = new Set(
                      petSlots.map((p) => p?.id).filter(Boolean) as string[]
                    );
                    const filterAvailable = (list: LibraryItem[], type: ItemType) =>
                      list.filter((item) => {
                        if (type === "char") return !usedCharIds.has(item.id);
                        if (type === "card") return !usedCardIds.has(item.id);
                        if (type === "pet") return !usedPetIds.has(item.id);
                        return true;
                      });
                    const sourceList =
                      picker === "equip"
                        ? libraries.equip
                        : filterAvailable(libraries[picker], picker);
                    const query = search.trim().toLowerCase();
                    const filtered = query
                      ? sourceList.filter((item) =>
                          item.name.toLowerCase().includes(query)
                        )
                      : sourceList;
                    return (
                      <div className={picker === "equip" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2"}>
                        {filtered.map((entry) => (
                          <button
                            key={entry.id}
                            onClick={() =>
                              slotTarget ? handleSelectToSlot(entry) : handleAdd(picker, entry.src)
                            }
                            className={`group relative overflow-hidden rounded-lg border border-white/10 text-left transition hover:border-white/30 hover:shadow-lg hover:shadow-black/40 ${
                              picker === "equip" ? "aspect-[3/4] bg-black/40" : "h-16 w-full bg-black/50"
                            }`}
                            style={
                              picker === "equip"
                                ? {}
                                : {
                                    backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.4)), url(${entry.src})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center"
                                  }
                            }
                          >
                            {picker === "equip" ? (
                              <>
                                <img
                                  src={entry.src}
                                  alt={entry.name}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-1 text-[11px] font-medium text-white">
                                  <span className="truncate">{entry.name}</span>
                                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                    EQUIP
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center gap-3 px-3">
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-white/20 bg-black/40">
                                  <img
                                    src={entry.src}
                                    alt={entry.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-1 items-center justify-between gap-2">
                                  <span className="truncate text-sm font-semibold text-white">
                                    {entry.name}
                                  </span>
                                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90">
                                    {picker}
                                  </span>
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                        {filtered.length === 0 && (
                          <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center text-sm text-white/60">
                            결과가 없습니다.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function getEquipKind(src: string): EquipKind {
  if (src.includes("/weapon/")) return "weapon";
  if (src.includes("/armor/")) return "armor";
  if (src.includes("/helmet/")) return "helmet";
  if (src.includes("/roon/")) return "roon";
  return "other";
}
