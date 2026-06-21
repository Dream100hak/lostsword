"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import cards from "@/data/cards.json";
import chars from "@/data/chars.json";
import equips from "@/data/equip.json";
import pets from "@/data/pets.json";
import type { ItemType } from "@/lib/store";
import type { JobId } from "@/lib/jobs";
import { weaponMatchesCharacterJob } from "@/lib/jobs";

type IconProps = { className?: string };

function IconSave({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}

function IconApply({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 12 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function IconLoad({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function IconSword({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
    </svg>
  );
}

function IconLayers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </svg>
  );
}

function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconX({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/** 장비 프리셋 미리보기 — 무기·갑옷·투구·룬 4칸 썸네일 */
function EquipPresetThumbs({ preset }: { preset: EquipPreset }) {
  const cells: Array<{ label: string; item: LibraryItem | null }> = [
    { label: "무기", item: findEquipById(preset.weaponId) },
    { label: "갑옷", item: findEquipById(preset.armorId) },
    { label: "투구", item: findEquipById(preset.helmetId) },
    { label: "룬", item: findEquipById(preset.roonId) }
  ];
  return (
    <div className="mt-1 flex gap-1">
      {cells.map(({ label, item }) => (
        <div
          key={label}
          title={item ? `${label}: ${item.name}` : `${label} 없음`}
          className="h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-white/10 bg-black/40"
        >
          {item ? (
            <img src={toSafeAssetSrc(item.src)} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[9px] text-white/25">{label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** 택틱 조합 프리셋 미리보기 — 캐릭터 5칸 썸네일 + 펫 수 */
function LayoutPresetThumbs({ preset }: { preset: LayoutPreset }) {
  const charList = chars as unknown as LibraryItem[];
  const petN = preset.petIds.filter(Boolean).length;
  return (
    <div className="mt-1 flex items-center gap-1">
      {preset.slots.map((s, i) => {
        const c = findLibraryItemById(charList, s.charId);
        return (
          <div
            key={i}
            title={c ? `슬롯 ${i + 1}: ${c.name}` : `슬롯 ${i + 1} 비어 있음`}
            className="h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-white/10 bg-black/40"
          >
            {c ? (
              <img src={toSafeAssetSrc(c.src)} alt={c.name} className="h-full w-full object-cover object-top" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] text-white/25">{i + 1}</span>
            )}
          </div>
        );
      })}
      <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">펫 {petN}/3</span>
    </div>
  );
}

type LibraryItem = {
  id: string;
  name: string;
  src: string;
  /** 계정당 1개만 장착 가능 — 다른 캐릭터/슬롯에 걸려 있으면 목록에서 제외 */
  unique?: boolean;
  /**
   * 장비 선택 목록 정렬. 큰 값이 더 위(먼저)에 옵니다.
   * 생략 시 `id`에 있는 숫자와 동일하게 취급(기존 동작).
   */
  sortOrder?: number;
  /** 캐릭터 전용 — `knight` | `archer` | `mage` | `healer` (chars.json) */
  job?: JobId;
  /** 무기·룬 등 — 착용 가능 직업. 생략·빈 배열이면 전 직업 (equip.json) */
  jobs?: JobId[];
};

type EquipKind = "weapon" | "armor" | "helmet" | "roon";

/** 진영(레인) — front=전열(빨강), mid=중열(노랑), back=후열(파랑) */
type Lane = "front" | "mid" | "back";

const LANE_META: Record<Lane, { label: string; color: string; icon: string }> = {
  front: { label: "전열", color: "#ef4444", icon: "/assets/lane-front.png" },
  mid: { label: "중열", color: "#d97706", icon: "/assets/lane-mid.png" },
  back: { label: "후열", color: "#3b82f6", icon: "/assets/lane-back.png" }
};

/** 클릭 순환 순서: 전열 → 중열 → 후열 → 없음 */
const LANE_CYCLE: (Lane | null)[] = ["front", "mid", "back", null];

type CharSlot = {
  id: string;
  char: LibraryItem | null;
  card: LibraryItem | null;
  lane: Lane | null;
  equips: {
    weapon: LibraryItem | null;
    armor: LibraryItem | null;
    helmet: LibraryItem | null;
    roon: LibraryItem | null;
  };
};

/** 장비 4칸 조합 저장 (localStorage) */
type EquipPreset = {
  id: string;
  name: string;
  weaponId: string | null;
  armorId: string | null;
  helmetId: string | null;
  roonId: string | null;
};

const PRESETS_STORAGE_KEY = "lostsword-equip-presets-v1";

function loadEquipPresets(): EquipPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is EquipPreset =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as EquipPreset).id === "string" &&
        typeof (x as EquipPreset).name === "string"
    );
  } catch {
    return [];
  }
}

function persistEquipPresets(presets: EquipPreset[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* quota */
  }
}

/** 5슬롯 캐릭터·카드·장비 + 펫 3 + 노트 (택틱 조합 전체) */
type LayoutPreset = {
  id: string;
  name: string;
  slots: Array<{
    charId: string | null;
    cardId: string | null;
    lane?: Lane | null;
    weaponId: string | null;
    armorId: string | null;
    helmetId: string | null;
    roonId: string | null;
  }>;
  petIds: [string | null, string | null, string | null];
  note: string;
};

const LAYOUT_PRESETS_STORAGE_KEY = "lostsword-layout-presets-v1";

function loadLayoutPresets(): LayoutPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LAYOUT_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is LayoutPreset => {
      if (typeof x !== "object" || x === null) return false;
      const o = x as LayoutPreset;
      return (
        typeof o.id === "string" &&
        typeof o.name === "string" &&
        Array.isArray(o.slots) &&
        Array.isArray(o.petIds) &&
        o.petIds.length === 3 &&
        typeof o.note === "string"
      );
    });
  } catch {
    return [];
  }
}

function persistLayoutPresets(presets: LayoutPreset[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAYOUT_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* quota */
  }
}

function findEquipById(id: string | null | undefined): LibraryItem | null {
  if (!id) return null;
  const e = equips.find((x) => x.id === id);
  return e ? { ...(e as LibraryItem) } : null;
}

function findLibraryItemById(
  list: readonly LibraryItem[],
  id: string | null | undefined
): LibraryItem | null {
  if (!id) return null;
  const x = list.find((i) => i.id === id);
  return x ? { ...x } : null;
}

function formatPresetPreview(p: EquipPreset): string {
  const names = [
    findEquipById(p.weaponId)?.name,
    findEquipById(p.armorId)?.name,
    findEquipById(p.helmetId)?.name,
    findEquipById(p.roonId)?.name
  ].filter(Boolean) as string[];
  if (names.length === 0) return "장비 없음";
  return names.join(" · ");
}

function formatLayoutPreview(p: LayoutPreset): string {
  const filled = p.slots.filter(
    (s) =>
      s.charId ||
      s.cardId ||
      s.weaponId ||
      s.armorId ||
      s.helmetId ||
      s.roonId
  ).length;
  const petN = p.petIds.filter(Boolean).length;
  const firstLine = p.note.trim().split("\n")[0]?.slice(0, 36) ?? "";
  const noteHint = firstLine
    ? `노트: ${firstLine}${p.note.trim().length > 36 ? "…" : ""}`
    : "노트 없음";
  return `슬롯 채움 ${filled}/5 · 펫 ${petN}/3 · ${noteHint}`;
}

const EQUIP_KINDS: EquipKind[] = ["weapon", "armor", "helmet", "roon"];

/** 유니크 장비가 (현재 선택 칸이 아닌) 다른 곳에 장착 중이면 true */
function isUniqueEquipBlockedElsewhere(
  itemId: string,
  currentSlotIndex: number,
  currentKind: EquipKind,
  slots: CharSlot[]
): boolean {
  for (let si = 0; si < slots.length; si++) {
    for (const k of EQUIP_KINDS) {
      const eq = slots[si].equips[k];
      if (!eq || eq.id !== itemId) continue;
      if (si === currentSlotIndex && k === currentKind) continue;
      return true;
    }
  }
  return false;
}

function idNumericSuffix(id: string): number {
  return parseInt(id.match(/\d+/)?.[0] || "0", 10);
}

function listSortRank(item: LibraryItem): number {
  if (typeof item.sortOrder === "number" && !Number.isNaN(item.sortOrder)) {
    return item.sortOrder;
  }
  return idNumericSuffix(item.id);
}

/** 장비 목록: sortOrder 우선, 없으면 id 숫자. 큰 값이 먼저. */
function equipSortRank(item: LibraryItem): number {
  return listSortRank(item);
}

function getLaneIconSrc(label: "후열" | "중열" | "전열"): string {
  if (label === "후열") return "/assets/lane-back.png";
  if (label === "중열") return "/assets/lane-mid.png";
  return "/assets/lane-front.png";
}

function getEquipKind(src: string): EquipKind | "other" {
  if (src.includes("/weapon/")) return "weapon";
  if (src.includes("/armor/")) return "armor";
  if (src.includes("/helmet/")) return "helmet";
  if (src.includes("/roon/")) return "roon";
  return "other";
}

function toSafeAssetSrc(src: string): string {
  return encodeURI(src);
}

// 이미지 캐시
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete) {
      return Promise.resolve(cached);
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = toSafeAssetSrc(src);
  });
}

// roundRect 헬퍼 함수
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 캔버스 렌더링 컴포넌트
const PreviewCanvas = forwardRef<HTMLCanvasElement, {
  charSlots: CharSlot[];
  petFormationSlots: (LibraryItem | null)[];
  noteText: string;
  width?: number;
}>(({
  charSlots,
  petFormationSlots,
  noteText,
  width = 1280
}, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const renderTimeoutRef = useRef<number | null>(null);
  
  // ref 연결
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = internalRef.current;
      }
    }
  }, [ref]);

  // 필요한 모든 이미지 로드
  useEffect(() => {
    let cancelled = false;
    
    const loadAllImages = async () => {
      const imageSrcs = new Set<string>();
      
      charSlots.forEach((slot) => {
        if (slot.char) imageSrcs.add(slot.char.src);
        if (slot.card) imageSrcs.add(slot.card.src);
        Object.values(slot.equips).forEach((eq) => {
          if (eq) imageSrcs.add(eq.src);
        });
      });
      
      petFormationSlots.forEach((pet) => {
        if (pet) imageSrcs.add(pet.src);
      });
      
      imageSrcs.add(getLaneIconSrc("후열"));
      imageSrcs.add(getLaneIconSrc("중열"));
      imageSrcs.add(getLaneIconSrc("전열"));

      try {
        await Promise.all(Array.from(imageSrcs).map(loadImage));
        if (!cancelled) {
          setImagesLoaded(true);
        }
      } catch (err) {
        console.error("이미지 로드 실패:", err);
        if (!cancelled) {
          setImagesLoaded(true);
        }
      }
    };

    setImagesLoaded(false);
    loadAllImages();
    
    return () => {
      cancelled = true;
    };
  }, [charSlots, petFormationSlots]);

  // 캔버스 그리기 함수
  const drawCanvas = useCallback((targetHeight?: number) => {
    const canvas = internalRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = width;
    
    // 높이 계산
    const padding = 16;
    const slotPadding = 8;
    const slotWidth = (canvasWidth - padding * 2 - 16 * 4) / 5;
    const charImageHeight = Math.min(slotWidth * (4 / 3), 280);
    const cardImageHeight = Math.min(slotWidth * (8 / 5), 280);
    const equipGap = 6;
    const equipTotalWidthForSlot = slotWidth - slotPadding * 2;
    const equipCellSize = (equipTotalWidthForSlot - equipGap) / 2;
    const equipBlockHeight = 6 + equipCellSize + equipGap + equipCellSize + 6;
    const slotsHeight = charImageHeight + cardImageHeight + equipBlockHeight + 32;
    const bottomSectionHeight = 220;
    
    const calculatedHeight = padding + slotsHeight + 12 + bottomSectionHeight + padding;
    const canvasHeight = targetHeight || calculatedHeight;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    // 배경
    ctx.fillStyle = "#0b0b14";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let y = padding;

    // 캐릭터 슬롯 그리기
    for (let i = 0; i < 5; i++) {
      const slot = charSlots[i];
      const x = padding + i * (slotWidth + 16);

      // 슬롯 배경
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, slotWidth, slotsHeight, 4);
      ctx.fill();
      ctx.stroke();

      const slotX = x + slotPadding;
      let slotY = y + slotPadding;

      // 캐릭터 이미지
      if (slot.char) {
        const charImg = imageCache.get(slot.char.src);
        if (charImg && charImg.complete) {
          ctx.drawImage(charImg, slotX, slotY, slotWidth - slotPadding * 2, charImageHeight);
          
          const nameBgHeight = 40;
          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
          ctx.fillRect(slotX, slotY + charImageHeight - nameBgHeight, slotWidth - slotPadding * 2, nameBgHeight);
          
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 14px 'Noto Sans KR', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(slot.char.name, slotX + (slotWidth - slotPadding * 2) / 2, slotY + charImageHeight - nameBgHeight / 2);
        } else {
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(slotX, slotY, slotWidth - slotPadding * 2, charImageHeight);
          
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 14px 'Noto Sans KR', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(slot.char.name, slotX + (slotWidth - slotPadding * 2) / 2, slotY + charImageHeight / 2);
        }
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(slotX, slotY, slotWidth - slotPadding * 2, charImageHeight);
        ctx.setLineDash([]);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "400 14px 'Noto Sans KR', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("캐릭터 선택", slotX + (slotWidth - slotPadding * 2) / 2, slotY + charImageHeight / 2);
      }

      // 진영(레인) 색 띠 — 캐릭터 이미지 상단 (머리 위, 얼굴 안 가림)
      if (slot.char && slot.lane) {
        const meta = LANE_META[slot.lane];
        const barW = slotWidth - slotPadding * 2;
        const barH = 22;
        roundRect(ctx, slotX, slotY, barW, barH, 4);
        ctx.fillStyle = meta.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // 라벨은 가운데, 아이콘은 오른쪽 (펫 진영과 동일한 아이콘 사용)
        const laneIcon = imageCache.get(meta.icon);
        const hasIcon = !!(laneIcon && laneIcon.complete);
        const iconSize = 16;
        const iconRightPad = 6;
        const midY = slotY + barH / 2;
        ctx.font = "700 13px 'Noto Sans KR', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(meta.label, slotX + barW / 2, midY + 1);
        if (hasIcon) {
          ctx.drawImage(
            laneIcon,
            slotX + barW - iconRightPad - iconSize,
            midY - iconSize / 2,
            iconSize,
            iconSize
          );
        }
      }

      slotY += charImageHeight + 12;

      // 카드 이미지
      if (slot.card) {
        const cardImg = imageCache.get(slot.card.src);
        if (cardImg && cardImg.complete) {
          const cardWidth = slotWidth - slotPadding * 2;
          const cardHeight = cardImageHeight;
          ctx.drawImage(cardImg, slotX, slotY, cardWidth, cardHeight);
          
          const cardNameBgHeight = 32;
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(slotX, slotY + cardHeight - cardNameBgHeight, cardWidth, cardNameBgHeight);
          
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 14px 'Noto Sans KR', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(slot.card.name, slotX + cardWidth / 2, slotY + cardHeight - cardNameBgHeight / 2);
        } else {
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(slotX, slotY, slotWidth - slotPadding * 2, cardImageHeight);
          
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 14px 'Noto Sans KR', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(slot.card.name, slotX + (slotWidth - slotPadding * 2) / 2, slotY + cardImageHeight / 2);
        }
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(slotX, slotY, slotWidth - slotPadding * 2, cardImageHeight);
        ctx.setLineDash([]);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "400 12px 'Noto Sans KR', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("카드 선택", slotX + (slotWidth - slotPadding * 2) / 2, slotY + cardImageHeight / 2);
      }

      slotY += cardImageHeight + 12;

      // 장비 슬롯 (2x2 — 무기/갑옷 상단, 투구/룬 하단)
      const equipTotalWidth = slotWidth - slotPadding * 2;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      roundRect(ctx, slotX, slotY, equipTotalWidth, equipBlockHeight, 4);
      ctx.fill();
      
      const equipKinds: EquipKind[] = ["weapon", "armor", "helmet", "roon"];
      const equipLabels = { weapon: "W", armor: "A", helmet: "H", roon: "R" };
      
      for (let j = 0; j < 4; j++) {
        const kind = equipKinds[j];
        const col = j % 2;
        const row = Math.floor(j / 2);
        const equipX = slotX + 6 + col * (equipCellSize + equipGap);
        const equipY = slotY + 6 + row * (equipCellSize + equipGap);
        const equip = slot.equips[kind];
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        roundRect(ctx, equipX, equipY, equipCellSize, equipCellSize, 4);
        ctx.fill();
        ctx.stroke();
        
        if (equip) {
          const equipImg = imageCache.get(equip.src);
          if (equipImg && equipImg.complete) {
            ctx.drawImage(equipImg, equipX, equipY, equipCellSize, equipCellSize);
          }
          if (equip.unique) {
            ctx.strokeStyle = "rgba(167, 139, 250, 0.9)";
            ctx.lineWidth = 2.5;
            roundRect(
              ctx,
              equipX + 1,
              equipY + 1,
              equipCellSize - 2,
              equipCellSize - 2,
              3
            );
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.font = "400 12px 'Noto Sans KR', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(equipLabels[kind], equipX + equipCellSize / 2, equipY + equipCellSize / 2);
        }
      }
    }

    y += slotsHeight + 12;

    // 펫 진형 및 스킬 순서 영역
    const bottomSectionY = y;
    const petSectionWidth = (canvasWidth - padding * 2 - 12) * 0.55;
    const skillSectionWidth = (canvasWidth - padding * 2 - 12) * 0.45;

    // 펫 진형 영역
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, padding, bottomSectionY, petSectionWidth, bottomSectionHeight, 4);
    ctx.fill();
    ctx.stroke();

    const petBoxWidth = (petSectionWidth - 16 - 8) / 3;
    const petVerticalInset = 4;
    const petBoxY = bottomSectionY + petVerticalInset;
    const petBoxHeight = bottomSectionHeight - petVerticalInset * 2;

    const laneLabels: ("후열" | "중열" | "전열")[] = ["후열", "중열", "전열"];

    for (let i = 0; i < 3; i++) {
      const label = laneLabels[i];
      const petX = padding + 8 + i * (petBoxWidth + 4);
      const pet = petFormationSlots[i];

      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      roundRect(ctx, petX, petBoxY, petBoxWidth, petBoxHeight, 4);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(petX, petBoxY, petBoxWidth, petBoxHeight);

      // 진열 라벨(아이콘 + 전열/중열/후열) — 펫 아이콘 대비 밸런스
      const labelPadTop = 5;
      const iconSize = 24;
      const iconSpacing = 10;
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 17px 'Noto Sans KR', sans-serif";
      
      const textMetrics = ctx.measureText(label);
      const totalWidth = iconSize + iconSpacing + textMetrics.width;
      const startX = petX + (petBoxWidth - totalWidth) / 2;
      const labelY = petBoxY + labelPadTop + iconSize / 2;
      
      const iconImg = imageCache.get(getLaneIconSrc(label));
      if (iconImg && iconImg.complete) {
        ctx.drawImage(iconImg, startX, petBoxY + labelPadTop, iconSize, iconSize);
      }
      
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, startX + iconSize + iconSpacing, labelY);

      const labelRowBottom = labelPadTop + iconSize + 4;
      const imageSidePad = 22;
      const imageTopGap = 14;
      const imageBottomPad = 22;
      const availW = petBoxWidth - imageSidePad * 2;
      const availH = petBoxHeight - labelRowBottom - imageTopGap - imageBottomPad;
      // 펫 칸 안 정사각형 — 좌우·상하 여백 확보
      const petImageSize = Math.max(
        32,
        Math.floor(Math.min(availW, availH))
      );
      const petImageX = petX + (petBoxWidth - petImageSize) / 2;
      const petImageY =
        petBoxY + labelRowBottom + imageTopGap + (availH - petImageSize) / 2;

      if (pet) {
        const petImg = imageCache.get(pet.src);
        if (petImg && petImg.complete) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 1;
          ctx.strokeRect(petImageX, petImageY, petImageSize, petImageSize);
          ctx.drawImage(petImg, petImageX, petImageY, petImageSize, petImageSize);
        }
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(petImageX, petImageY, petImageSize, petImageSize);
        ctx.setLineDash([]);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "600 12px 'Noto Sans KR', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("빈칸", petImageX + petImageSize / 2, petImageY + petImageSize / 2);
      }
    }

    // 노트 영역
    const noteX = padding + petSectionWidth + 12;
    const noteSectionWidth = (canvasWidth - padding * 2 - 12) * 0.45;
    const notePadding = 12;
    const noteStartY = bottomSectionY + notePadding;
    const noteAreaWidth = noteSectionWidth - notePadding * 2;
    const noteAreaHeight = bottomSectionHeight - notePadding * 2;
    
    // 노트 영역 배경 그리기
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, noteX, bottomSectionY, noteSectionWidth, bottomSectionHeight, 4);
    ctx.fill();
    ctx.stroke();

    // 노트 텍스트 영역 클리어 (이전 텍스트 제거)
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(noteX + notePadding, noteStartY, noteAreaWidth, noteAreaHeight);

    // 노트 텍스트 그리기
    if (noteText && noteText.trim()) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "400 16px 'Noto Sans KR', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      const lineHeight = 24;
      const maxLines = Math.floor(noteAreaHeight / lineHeight);
      
      // 텍스트를 줄 단위로 분리
      const lines: string[] = [];
      // 줄바꿈 문자를 기준으로 먼저 문단 분리
      const paragraphs = noteText.split('\n');
      
      for (const paragraph of paragraphs) {
        if (lines.length >= maxLines) break;
        
        // 빈 문단은 빈 줄로 추가
        if (paragraph.trim().length === 0) {
          if (lines.length < maxLines) {
            lines.push("");
          }
          continue;
        }
        
        // 각 문단을 단어 단위로 처리
        const words = paragraph.trim().split(/\s+/).filter(word => word.length > 0);
        let currentLine = "";
        
        for (const word of words) {
          if (lines.length >= maxLines) break;
          
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > noteAreaWidth && currentLine) {
            // 현재 줄이 너무 길면 저장하고 새 줄 시작
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        // 문단의 마지막 줄 추가
        if (currentLine && lines.length < maxLines) {
          lines.push(currentLine);
        }
      }
      
      // 각 줄을 정확히 한 번만 그리기 (중복 방지)
      for (let idx = 0; idx < Math.min(lines.length, maxLines); idx++) {
        const line = lines[idx];
        // 빈 줄도 그리기 (줄바꿈 유지)
        ctx.fillText(line || "", noteX + notePadding, noteStartY + idx * lineHeight);
      }
    }
  }, [charSlots, petFormationSlots, noteText, width]);

  // 캔버스 렌더링
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    
    renderTimeoutRef.current = window.setTimeout(() => {
      drawCanvas();
    }, 0);
    
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [drawCanvas, imagesLoaded]);

  return (
    <canvas
      ref={internalRef}
      style={{
        display: "block",
        width: `${width}px`,
        maxWidth: "100%",
        height: "auto"
      }}
    />
  );
});

PreviewCanvas.displayName = "PreviewCanvas";

export default function Page() {
  const [picker, setPicker] = useState<ItemType | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [search, setSearch] = useState("");
  const [slotTarget, setSlotTarget] = useState<{
    type: "char" | "card" | "pet" | "equip";
    slotIndex: number;
    equipKind?: EquipKind;
  } | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [equipPresets, setEquipPresets] = useState<EquipPreset[]>([]);
  const [presetSaveSlotIndex, setPresetSaveSlotIndex] = useState(0);
  const [presetSaveName, setPresetSaveName] = useState("");
  const [presetApplySlotIndex, setPresetApplySlotIndex] = useState(0);
  const [layoutPresets, setLayoutPresets] = useState<LayoutPreset[]>([]);
  const [layoutPresetName, setLayoutPresetName] = useState("");
  /** 모바일에서 1280 고정 + scale 로 인한 가로 넘침 방지 — 뷰포트 너비에 맞춤 */
  const [canvasLayoutWidth, setCanvasLayoutWidth] = useState(1280);

  useEffect(() => {
    function updateCanvasLayoutWidth() {
      if (typeof window === "undefined") return;
      const vw = window.innerWidth;
      const mainPad = vw < 640 ? 24 : 48;
      const canvasPad = 32;
      const safety = 8;
      const next = Math.min(
        1280,
        Math.max(280, Math.floor(vw - mainPad - canvasPad - safety))
      );
      setCanvasLayoutWidth(next);
    }
    updateCanvasLayoutWidth();
    window.addEventListener("resize", updateCanvasLayoutWidth);
    return () => window.removeEventListener("resize", updateCanvasLayoutWidth);
  }, []);

  const initialCharSlots = useMemo(
    () =>
      Array.from({ length: 5 }, (_, idx) => ({
        id: `slot-${idx + 1}`,
        char: null as LibraryItem | null,
        card: null as LibraryItem | null,
        lane: null as Lane | null,
        equips: {
          weapon: null as LibraryItem | null,
          armor: null as LibraryItem | null,
          helmet: null as LibraryItem | null,
          roon: null as LibraryItem | null
        }
      })),
    []
  );
  
  const [charSlots, setCharSlots] = useState<CharSlot[]>(initialCharSlots);
  const [petFormationSlots, setPetFormationSlots] = useState<(LibraryItem | null)[]>([null, null, null]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const libraries = useMemo<Record<ItemType, LibraryItem[]>>(
    () => ({
      card: cards as LibraryItem[],
      char: chars as LibraryItem[],
      pet: pets as LibraryItem[],
      equip: equips as LibraryItem[]
    }),
    []
  );

  const equipWithType = useMemo(
    () =>
      (equips as LibraryItem[]).map((eq) => ({
        ...eq,
        kind: getEquipKind(eq.src)
      })),
    []
  );

  const uniqueEquipIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of equips) {
      const u = e as LibraryItem;
      if (u.unique) s.add(u.id);
    }
    return s;
  }, []);

  useEffect(() => {
    setEquipPresets(loadEquipPresets());
    setLayoutPresets(loadLayoutPresets());
  }, []);

  const applyEquipPreset = useCallback(
    (preset: EquipPreset, targetSlotIndex: number) => {
      const newEquips: CharSlot["equips"] = {
        weapon: findEquipById(preset.weaponId),
        armor: findEquipById(preset.armorId),
        helmet: findEquipById(preset.helmetId),
        roon: findEquipById(preset.roonId)
      };

      const claimedUniqueIds = new Set<string>();
      for (const k of EQUIP_KINDS) {
        const eq = newEquips[k];
        if (eq && uniqueEquipIds.has(eq.id)) claimedUniqueIds.add(eq.id);
      }

      setCharSlots((prev) => {
        const next = prev.map((s) => ({ ...s, equips: { ...s.equips } }));

        for (let si = 0; si < next.length; si++) {
          if (si === targetSlotIndex) continue;
          for (const k of EQUIP_KINDS) {
            const eq = next[si].equips[k];
            if (eq && claimedUniqueIds.has(eq.id)) {
              next[si].equips[k] = null;
            }
          }
        }

        next[targetSlotIndex] = {
          ...next[targetSlotIndex],
          equips: newEquips
        };
        return next;
      });
    },
    [uniqueEquipIds]
  );

  const handleSaveEquipPreset = () => {
    const name = presetSaveName.trim();
    if (!name) return;
    const slot = charSlots[presetSaveSlotIndex];
    const newPreset: EquipPreset = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      weaponId: slot.equips.weapon?.id ?? null,
      armorId: slot.equips.armor?.id ?? null,
      helmetId: slot.equips.helmet?.id ?? null,
      roonId: slot.equips.roon?.id ?? null
    };
    setEquipPresets((prev) => {
      const next = [...prev, newPreset];
      persistEquipPresets(next);
      return next;
    });
    setPresetSaveName("");
  };

  const handleDeleteEquipPreset = (id: string) => {
    setEquipPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistEquipPresets(next);
      return next;
    });
  };

  const applyLayoutPreset = useCallback((preset: LayoutPreset) => {
    const libChars = chars as LibraryItem[];
    const libCards = cards as LibraryItem[];
    const libPets = pets as LibraryItem[];

    const rawSlots = [...preset.slots];
    while (rawSlots.length < 5) {
      rawSlots.push({
        charId: null,
        cardId: null,
        lane: null,
        weaponId: null,
        armorId: null,
        helmetId: null,
        roonId: null
      });
    }
    if (rawSlots.length > 5) rawSlots.length = 5;

    const nextSlots: CharSlot[] = rawSlots.map((s, idx) => ({
      id: `slot-${idx + 1}`,
      char: findLibraryItemById(libChars, s.charId),
      card: findLibraryItemById(libCards, s.cardId),
      lane: s.lane ?? null,
      equips: {
        weapon: findEquipById(s.weaponId),
        armor: findEquipById(s.armorId),
        helmet: findEquipById(s.helmetId),
        roon: findEquipById(s.roonId)
      }
    }));

    setCharSlots(nextSlots);
    setPetFormationSlots([
      findLibraryItemById(libPets, preset.petIds[0]),
      findLibraryItemById(libPets, preset.petIds[1]),
      findLibraryItemById(libPets, preset.petIds[2])
    ]);
    setNoteText(preset.note);
  }, []);

  const handleSaveLayoutPreset = () => {
    const name = layoutPresetName.trim();
    if (!name) return;
    const slots = charSlots.map((slot) => ({
      charId: slot.char?.id ?? null,
      cardId: slot.card?.id ?? null,
      lane: slot.lane ?? null,
      weaponId: slot.equips.weapon?.id ?? null,
      armorId: slot.equips.armor?.id ?? null,
      helmetId: slot.equips.helmet?.id ?? null,
      roonId: slot.equips.roon?.id ?? null
    }));
    const petIds: [string | null, string | null, string | null] = [
      petFormationSlots[0]?.id ?? null,
      petFormationSlots[1]?.id ?? null,
      petFormationSlots[2]?.id ?? null
    ];
    const newPreset: LayoutPreset = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `layout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      slots,
      petIds,
      note: noteText
    };
    setLayoutPresets((prev) => {
      const next = [...prev, newPreset];
      persistLayoutPresets(next);
      return next;
    });
    setLayoutPresetName("");
  };

  const handleDeleteLayoutPreset = (id: string) => {
    setLayoutPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistLayoutPresets(next);
      return next;
    });
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setIsComposing(false);
    const t = e.currentTarget;
    const field = t.getAttribute("data-ime-field");
    if (field === "search") setSearch(t.value);
    if (field === "note") setNoteText(t.value);
  };

  const handleChangeUnlessComposing = (
    cb: (value: string) => void,
    value: string
  ) => {
    if (!isComposing) cb(value);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `lostsword-${Date.now()}.png`;
    link.click();
  };

  const handleSelectToSlot = (item: LibraryItem) => {
    if (!slotTarget) return;
    if (slotTarget.type === "pet") {
      assignPetFormation(slotTarget.slotIndex, item);
      setSlotTarget(null);
      setPicker(null);
      return;
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
      const kind = slotTarget.equipKind as EquipKind;
      const slotIdx = slotTarget.slotIndex;
      const charJob = charSlots[slotIdx].char?.job;
      if (!weaponMatchesCharacterJob(item, charJob ?? null)) {
        return;
      }
      const isUnique = uniqueEquipIds.has(item.id);
      setCharSlots((prev) =>
        prev.map((slot, idx) => {
          if (idx === slotIdx) {
            return {
              ...slot,
              equips: { ...slot.equips, [kind]: item }
            };
          }
          if (!isUnique) return slot;
          const equips = { ...slot.equips };
          let changed = false;
          for (const k of EQUIP_KINDS) {
            if (equips[k]?.id === item.id) {
              equips[k] = null;
              changed = true;
            }
          }
          return changed ? { ...slot, equips } : slot;
        })
      );
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
            ? petFormationSlots[slotTarget.slotIndex]?.id
            : null;

    const usedCharIds = new Set(
      charSlots.map((c) => c.char?.id).filter(Boolean) as string[]
    );
    const usedCardIds = new Set(
      charSlots.map((c) => c.card?.id).filter(Boolean) as string[]
    );
    const usedPetIds = new Set(
      petFormationSlots.map((p) => p?.id).filter(Boolean) as string[]
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
      const pickKind = slotTarget.equipKind;
      const pickSlot = slotTarget.slotIndex;
      const charJobForEquip = charSlots[pickSlot].char?.job;
      list = equipWithType
        .filter((eq) => eq.kind === pickKind || eq.kind === "other")
        .filter((eq) =>
          weaponMatchesCharacterJob(eq as LibraryItem, charJobForEquip ?? null)
        )
        .filter((eq) => {
          if (!uniqueEquipIds.has(eq.id)) return true;
          return !isUniqueEquipBlockedElsewhere(eq.id, pickSlot, pickKind, charSlots);
        })
        .map(({ kind: _, ...rest }) => rest);
    } else {
      list = filterAvailable(libraries[picker], picker);
    }
    const query = search.trim().toLowerCase();
    const filtered = query
      ? list.filter((item) => item.name.toLowerCase().includes(query))
      : list;

    const isEquip = slotTarget.type === "equip";
    const sorted = [...filtered].sort((a, b) => {
      if (isEquip) {
        return equipSortRank(b) - equipSortRank(a);
      }
      return listSortRank(b) - listSortRank(a);
    });
    return (
      <div
        className={
          isEquip
            ? "grid min-h-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3"
            : "grid min-h-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3"
        }
      >
        {sorted.map((entry) => (
          <button
            key={entry.id}
            onClick={() => handleSelectToSlot(entry)}
            className={`group relative overflow-hidden rounded-lg text-left transition hover:shadow-lg hover:shadow-black/40 ${
              isEquip && uniqueEquipIds.has(entry.id)
                ? "border-2 border-violet-400/75 shadow-[0_0_18px_rgba(139,92,246,0.22)] hover:border-violet-300 hover:shadow-violet-500/15"
                : "border border-white/10 hover:border-white/30"
            } ${
              isEquip ? "flex items-center gap-3 bg-black/40 px-3 py-3" : "h-20 w-full bg-black/50"
            }`}
            style={
              isEquip
                ? {}
                : {
                    backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.4)), url("${toSafeAssetSrc(entry.src)}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 30%"
                  }
            }
          >
            {isEquip ? (
              <>
                <div
                  className={`flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/40 ${
                    uniqueEquipIds.has(entry.id)
                      ? "border-2 border-violet-400/55"
                      : "border border-white/15"
                  }`}
                >
                  <img
                    src={toSafeAssetSrc(entry.src)}
                    alt={entry.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 text-sm font-semibold text-white">
                  <span className="truncate">{entry.name}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {uniqueEquipIds.has(entry.id) && (
                      <span className="rounded-full bg-amber-500/35 px-2 py-0.5 text-[10px] font-medium text-amber-100">
                        유니크
                      </span>
                    )}
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      EQUIP
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center gap-3 px-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/20 bg-black/40">
                  <img
                    src={toSafeAssetSrc(entry.src)}
                    alt={entry.name}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span
                    className="text-sm font-semibold leading-4 text-white"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word"
                    }}
                  >
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
        {sorted.length === 0 && (
          <div className="col-span-full rounded-lg border border-white/10 bg-black/30 p-3 text-center text-sm text-white/60">
            결과가 없습니다.
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    setSearch("");
  }, [picker]);

  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPicker(null);
        setSlotTarget(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker]);

  useEffect(() => {
    if (!showPresets) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPresets(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPresets]);

  const assignPetFormation = (index: number, item: LibraryItem | null) => {
    setPetFormationSlots((prev) => {
      const next = [...prev];
      const existingIdx = prev.findIndex((s) => s?.id === item?.id);
      if (existingIdx !== -1 && existingIdx !== index) {
        next[existingIdx] = null;
      }
      next[index] = item;
      return next;
    });
  };

  const clearCharSlot = (slotIndex: number) =>
    setCharSlots((prev) =>
      prev.map((s, i) => (i === slotIndex ? { ...s, char: null, lane: null } : s))
    );

  const cycleCharLane = (slotIndex: number) =>
    setCharSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIndex) return s;
        const cur = s.lane ?? null;
        const next = LANE_CYCLE[(LANE_CYCLE.indexOf(cur) + 1) % LANE_CYCLE.length];
        return { ...s, lane: next };
      })
    );

  const clearCardSlot = (slotIndex: number) =>
    setCharSlots((prev) =>
      prev.map((s, i) => (i === slotIndex ? { ...s, card: null } : s))
    );

  const clearEquipSlot = (slotIndex: number, kind: EquipKind) =>
    setCharSlots((prev) =>
      prev.map((s, i) =>
        i === slotIndex ? { ...s, equips: { ...s.equips, [kind]: null } } : s
      )
    );


  // 캔버스 레이아웃 계산값 (오버레이 버튼 위치와 정확히 맞추기 위해)
  const canvasLayout = useMemo(() => {
    const width = canvasLayoutWidth;
    const padding = 16;
    const slotPadding = 8;
    const slotWidth = (width - padding * 2 - 16 * 4) / 5; // gap 16px * 4
    const charImageHeight = Math.min(slotWidth * (4 / 3), 280);
    const cardImageHeight = Math.min(slotWidth * (8 / 5), 280);
    const equipGap = 6;
    const equipTotalWidth = slotWidth - slotPadding * 2;
    const equipCellSize = (equipTotalWidth - equipGap) / 2;
    const equipBlockHeight = 6 + equipCellSize + equipGap + equipCellSize + 6;
    const gap = 16;
    const bottomSectionHeight = 220;
    const petVerticalInset = 4;
    const petBoxHeight = bottomSectionHeight - petVerticalInset * 2;
    
    return {
      layoutWidth: width,
      padding,
      slotWidth,
      charImageHeight,
      cardImageHeight,
      equipCellSize,
      equipBlockHeight,
      equipGap,
      slotPadding,
      gap,
      bottomSectionHeight,
      petVerticalInset,
      petBoxHeight
    };
  }, [canvasLayoutWidth]);

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              LostSword 택틱 배치
            </h1>
            <p className="text-xs text-white/50">
              캐릭터·카드·장비를 배치하고 PNG 이미지로 내보내세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresets(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/20"
            >
              <IconLayers className="h-3.5 w-3.5" />
              프리셋
            </button>
            <button
              onClick={() => setCompactView((v) => !v)}
              className="hidden rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white md:inline-flex"
              aria-pressed={compactView}
            >
              {compactView ? "넓게 보기" : "좁게 보기"}
            </button>
            <button
              onClick={handleSave}
              className="rounded-full border border-emerald-400/40 bg-emerald-500/90 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
            >
              저장 (PNG)
            </button>         
          </div>
        </div>
      </header>

      {showPresets && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-2 sm:items-center sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setShowPresets(false)}
        >
          <div
            className="flex h-[min(92dvh,60rem)] max-h-[min(92dvh,60rem)] w-full max-w-4xl flex-col rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <IconLayers className="text-violet-300" />
                프리셋 관리
              </h2>
              <button
                onClick={() => setShowPresets(false)}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="닫기"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm text-white/90 scrollbar-thin">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2 font-semibold text-white">
          <IconSword className="text-emerald-300" />
          <span>장비 프리셋</span>
        </div>
        <p className="mb-3 text-xs text-white/55">
          자주 쓰는 무기·갑옷·투구·룬 조합을 저장해 두었다가 슬롯에 한 번에 적용할 수 있습니다. 브라우저에 저장됩니다.
        </p>
        <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-white/50">저장</span>
            <span className="text-[11px] text-white/60">가져올 슬롯</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="저장할 장비를 가져올 캐릭터 슬롯">
              {[0, 1, 2, 3, 4].map((i) => {
                const slotChar = charSlots[i].char;
                const selected = presetSaveSlotIndex === i;
                return (
                  <button
                    key={`preset-save-slot-${i}`}
                    type="button"
                    onClick={() => setPresetSaveSlotIndex(i)}
                    title={slotChar ? `슬롯 ${i + 1} · ${slotChar.name}` : `슬롯 ${i + 1} (비어 있음)`}
                    className={`relative h-12 w-12 overflow-hidden rounded-lg border transition ${
                      selected
                        ? "border-emerald-400 ring-2 ring-emerald-400/60"
                        : "border-white/15 hover:border-white/30"
                    }`}
                    aria-pressed={selected}
                  >
                    {slotChar ? (
                      <img
                        src={toSafeAssetSrc(slotChar.src)}
                        alt={slotChar.name}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-black/40 text-sm font-semibold text-white/40">
                        {i + 1}
                      </span>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 rounded-tl-md px-1 text-[10px] font-bold leading-tight ${
                        selected ? "bg-emerald-500 text-white" : "bg-black/70 text-white/80"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5 text-[11px] text-white/60">
            <span>프리셋 이름</span>
            <input
              value={presetSaveName}
              onChange={(e) => setPresetSaveName(e.target.value)}
              placeholder="예: 주력 딜 세트"
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white placeholder:text-white/35"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveEquipPreset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/30 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600/45 sm:shrink-0"
          >
            <IconSave />
            현재 장비로 저장
          </button>
        </div>
        <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs text-white/50">적용할 캐릭터 슬롯</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="프리셋을 넣을 캐릭터 슬롯">
            {[0, 1, 2, 3, 4].map((i) => {
              const slotChar = charSlots[i].char;
              const selected = presetApplySlotIndex === i;
              return (
                <button
                  key={`preset-apply-slot-${i}`}
                  type="button"
                  onClick={() => setPresetApplySlotIndex(i)}
                  title={slotChar ? `슬롯 ${i + 1} · ${slotChar.name}` : `슬롯 ${i + 1} (비어 있음)`}
                  className={`relative h-12 w-12 overflow-hidden rounded-lg border transition ${
                    selected
                      ? "border-sky-400 ring-2 ring-sky-400/60"
                      : "border-white/15 hover:border-white/30"
                  }`}
                  aria-pressed={selected}
                >
                  {slotChar ? (
                    <img
                      src={toSafeAssetSrc(slotChar.src)}
                      alt={slotChar.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-black/40 text-sm font-semibold text-white/40">
                      {i + 1}
                    </span>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 rounded-tl-md px-1 text-[10px] font-bold leading-tight ${
                      selected ? "bg-sky-500 text-white" : "bg-black/70 text-white/80"
                    }`}
                  >
                    {i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {equipPresets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-4 text-center text-xs text-white/45">
            저장된 프리셋이 없습니다. 위에서 슬롯을 고르고 이름을 입력한 뒤 저장하세요.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {equipPresets.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1" title={formatPresetPreview(p)}>
                  <div className="font-medium text-white">{p.name}</div>
                  <EquipPresetThumbs preset={p} />
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyEquipPreset(p, presetApplySlotIndex)}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-600/25 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-600/40"
                  >
                    <IconApply />
                    적용
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEquipPreset(p.id)}
                    aria-label="삭제"
                    className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white/70 hover:bg-red-500/20 hover:text-white"
                  >
                    <IconTrash />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
          </div>
          <div className="min-w-0 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="mb-3 flex items-center gap-2 font-semibold text-white">
              <IconLayers className="text-violet-300" />
              <span>택틱 조합 (전체 배치) 프리셋</span>
            </div>
            <p className="mb-3 text-xs text-white/55">
              캔버스에 올려 둔 5슬롯(캐릭터·카드·장비), 펫 3칸, 오른쪽 노트까지 한 번에 저장·복원합니다. PNG
              저장과 별개로, 편집 상태만 브라우저에 보관됩니다.
            </p>
            <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-white/10 pb-4">
              <label className="flex min-w-[12rem] flex-1 flex-col gap-0.5 text-[11px] text-white/60">
                <span>프리셋 이름</span>
                <input
                  value={layoutPresetName}
                  onChange={(e) => setLayoutPresetName(e.target.value)}
                  placeholder="예: 시즌 레이드 최종안"
                  className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white placeholder:text-white/35"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveLayoutPreset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/30 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600/45"
              >
                <IconSave />
                현재 화면 전체 저장
              </button>
            </div>
            {layoutPresets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-4 text-center text-xs text-white/45">
                저장된 전체 배치가 없습니다. 캔버스를 맞춘 뒤 이름을 넣고 저장하세요.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {layoutPresets.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1" title={formatLayoutPreview(p)}>
                      <div className="font-medium text-white">{p.name}</div>
                      <LayoutPresetThumbs preset={p} />
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyLayoutPreset(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-600/25 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-600/40"
                      >
                        <IconLoad />
                        불러오기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLayoutPreset(p.id)}
                        aria-label="삭제"
                        className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white/70 hover:bg-red-500/20 hover:text-white"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
            </div>
          </div>
        </div>
      )}

      <section className="relative flex w-full justify-center overflow-x-auto">
        <div
          className={`relative max-w-full rounded border border-white/10 bg-canvas p-2 shadow-2xl shadow-black/50 origin-top-left sm:p-4 ${
            compactView
              ? "scale-100 md:scale-[0.85]"
              : "scale-100 md:scale-[1.1]"
          }`}
        >
          <PreviewCanvas
            ref={canvasRef}
            charSlots={charSlots}
            petFormationSlots={petFormationSlots}
            noteText={noteText}
            width={canvasLayoutWidth}
          />
          
          {/* 편집용 DOM UI - 클릭 가능한 오버레이 */}
          {/* 컨테이너의 p-4 (16px) 패딩을 고려하여 오버레이 배치 */}
          <div className="pointer-events-none absolute inset-2 sm:inset-4">
            <div className="w-full h-full pointer-events-auto flex flex-col" style={{ 
              paddingLeft: `${canvasLayout.padding}px`, 
              paddingTop: `${canvasLayout.padding}px`,
              paddingRight: `${canvasLayout.padding}px`
            }}>
              {/* 캐릭터 슬롯 오버레이 */}
              <div className="flex-shrink-0" style={{ marginBottom: "12px" }}>
                <div className="flex" style={{ gap: `${canvasLayout.gap}px` }}>
                  {charSlots.map((slot, idx) => {
                    // 캔버스에서: x = padding + i * (slotWidth + 16)
                    // 오버레이에서도 동일한 계산 사용
                    const slotX = idx * (canvasLayout.slotWidth + canvasLayout.gap);
                    return (
                      <div
                        key={slot.id}
                        className="relative"
                        style={{
                          width: `${canvasLayout.slotWidth}px`,
                          height: `${canvasLayout.charImageHeight + canvasLayout.cardImageHeight + canvasLayout.equipBlockHeight + 32}px`
                        }}
                      >
                        {/* 캐릭터 칸 */}
                        <div
                          className="group absolute"
                          style={{
                            left: `${canvasLayout.slotPadding}px`,
                            top: `${canvasLayout.slotPadding}px`,
                            width: `${canvasLayout.slotWidth - canvasLayout.slotPadding * 2}px`,
                            height: `${canvasLayout.charImageHeight}px`
                          }}
                        >
                          <button
                            onClick={() => {
                              setPicker("char");
                              setSlotTarget({ type: "char", slotIndex: idx });
                            }}
                            className="h-full w-full rounded border border-transparent hover:border-white/30 transition cursor-pointer"
                          >
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                              <IconPlus className="text-white/90" />
                            </span>
                          </button>
                          {slot.char && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cycleCharLane(idx);
                              }}
                              title="진영 변경 (전열 → 중열 → 후열 → 없음)"
                              aria-label="진영 변경"
                              className={`absolute inset-x-0 top-0 z-10 flex items-center justify-center rounded-t text-[11px] font-bold transition ${
                                slot.lane ? "text-white" : "text-white/85 opacity-0 group-hover:opacity-100"
                              }`}
                              style={{
                                height: "22px",
                                backgroundColor: slot.lane
                                  ? LANE_META[slot.lane].color
                                  : "rgba(0, 0, 0, 0.55)"
                              }}
                            >
                              {slot.lane ? (
                                <>
                                  {LANE_META[slot.lane].label}
                                  <img
                                    src={toSafeAssetSrc(LANE_META[slot.lane].icon)}
                                    alt=""
                                    className="absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                                  />
                                </>
                              ) : (
                                "진영 +"
                              )}
                            </button>
                          )}
                          {slot.char && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearCharSlot(idx);
                              }}
                              title="캐릭터 비우기"
                              aria-label="캐릭터 비우기"
                              className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                            >
                              <IconX className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {/* 카드 칸 */}
                        <div
                          className="group absolute"
                          style={{
                            left: `${canvasLayout.slotPadding}px`,
                            top: `${canvasLayout.slotPadding + canvasLayout.charImageHeight + 12}px`,
                            width: `${canvasLayout.slotWidth - canvasLayout.slotPadding * 2}px`,
                            height: `${canvasLayout.cardImageHeight}px`
                          }}
                        >
                          <button
                            onClick={() => {
                              setPicker("card");
                              setSlotTarget({ type: "card", slotIndex: idx });
                            }}
                            className="h-full w-full rounded border border-transparent hover:border-white/30 transition cursor-pointer"
                          >
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                              <IconPlus className="text-white/90" />
                            </span>
                          </button>
                          {slot.card && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearCardSlot(idx);
                              }}
                              title="카드 비우기"
                              aria-label="카드 비우기"
                              className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                            >
                              <IconX className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {/* 장비 버튼들 */}
                        {(["weapon", "armor", "helmet", "roon"] as EquipKind[]).map((kind, equipIdx) => {
                          const col = equipIdx % 2;
                          const row = Math.floor(equipIdx / 2);
                          const baseY =
                            canvasLayout.slotPadding +
                            canvasLayout.charImageHeight +
                            12 +
                            canvasLayout.cardImageHeight +
                            12;
                          const equipX =
                            canvasLayout.slotPadding + 6 + col * (canvasLayout.equipCellSize + canvasLayout.equipGap);
                          const equipY = baseY + 6 + row * (canvasLayout.equipCellSize + canvasLayout.equipGap);
                          
                          return (
                            <div
                              key={kind}
                              className="group absolute"
                              style={{
                                left: `${equipX}px`,
                                top: `${equipY}px`,
                                width: `${canvasLayout.equipCellSize}px`,
                                height: `${canvasLayout.equipCellSize}px`
                              }}
                            >
                              <button
                                onClick={() => {
                                  setPicker("equip");
                                  setSlotTarget({ type: "equip", slotIndex: idx, equipKind: kind });
                                }}
                                className="h-full w-full rounded border border-transparent hover:border-white/30 transition cursor-pointer"
                              >
                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                                  <IconPlus className="h-4 w-4 text-white/90" />
                                </span>
                              </button>
                              {slot.equips[kind] && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearEquipSlot(idx, kind);
                                  }}
                                  title="장비 비우기"
                                  aria-label="장비 비우기"
                                  className="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                                >
                                  <IconX className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 펫 진형 및 노트 오버레이 */}
              <div className="flex-shrink-0 flex" style={{ gap: "12px", marginTop: "12px" }}>
                {/* 펫 진형 */}
                <div
                  className="relative"
                  style={{ width: "55%", height: `${canvasLayout.bottomSectionHeight}px` }}
                >
                  {(["후열", "중열", "전열"] as const).map((label, idx) => {
                    const petSectionWidth =
                      (canvasLayout.layoutWidth - canvasLayout.padding * 2 - 12) * 0.55;
                    const petBoxWidth = (petSectionWidth - 16 - 8) / 3;
                    const petX = 8 + idx * (petBoxWidth + 4);
                    return (
                      <button
                        key={label}
                        title={petFormationSlots[idx] ? `${label} 펫 비우기` : `${label} 펫 선택`}
                        onClick={() => {
                          if (petFormationSlots[idx]) {
                            assignPetFormation(idx, null);
                          } else {
                            setPicker("pet");
                            setSlotTarget({ type: "pet", slotIndex: idx });
                          }
                        }}
                        className="group absolute rounded border border-transparent hover:border-white/30 transition cursor-pointer"
                        style={{
                          left: `${petX}px`,
                          top: `${canvasLayout.petVerticalInset}px`,
                          width: `${petBoxWidth}px`,
                          height: `${canvasLayout.petBoxHeight}px`
                        }}
                      >
                        <span
                          className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded opacity-0 transition group-hover:opacity-100 ${
                            petFormationSlots[idx] ? "group-hover:bg-red-900/40" : "group-hover:bg-black/35"
                          }`}
                        >
                          {petFormationSlots[idx] ? (
                            <IconX className="text-white/90" />
                          ) : (
                            <IconPlus className="text-white/90" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* 노트 */}
                <div
                  className="relative"
                  style={{ width: "45%", height: `${canvasLayout.bottomSectionHeight}px` }}
                >
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      top: "12px",
                      left: "12px",
                      right: "12px",
                      bottom: "12px"
                    }}
                  >
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder=""
                      className="w-full h-full resize-none border-0 bg-transparent text-transparent caret-white placeholder:text-transparent focus:outline-none"
                      style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "16px",
                        fontWeight: "400",
                        lineHeight: "24px",
                        padding: "0px",
                        margin: "0px",
                        border: "none",
                        outline: "none",
                        boxSizing: "border-box",
                        verticalAlign: "top",
                        textAlign: "left",
                        overflow: "hidden",
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 선택 모달 */}
      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-2 sm:items-center sm:p-4"
          onClick={(e) => e.target === e.currentTarget && (setPicker(null), setSlotTarget(null))}
        >
          <div
            className="flex h-[min(92dvh,68rem)] max-h-[min(92dvh,68rem)] w-full max-w-6xl flex-col gap-3 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-2xl shadow-black/50 sm:rounded-2xl sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {slotTarget?.type === "equip" && slotTarget.equipKind
                  ? { weapon: "무기 선택", armor: "갑옷 선택", helmet: "투구 선택", roon: "룬 선택" }[slotTarget.equipKind]
                  : { char: "캐릭터 선택", card: "카드 선택", pet: "펫 선택", equip: "장비 선택" }[picker]}
              </h2>
              <button
                onClick={() => {
                  setPicker(null);
                  setSlotTarget(null);
                }}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="닫기"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              className="w-full flex-shrink-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {renderSlotPickerList()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


