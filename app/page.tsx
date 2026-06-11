"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import cards from "@/data/cards.json";
import chars from "@/data/chars.json";
import equips from "@/data/equip.json";
import pets from "@/data/pets.json";
import type { ItemType } from "@/lib/store";
import type { JobId } from "@/lib/jobs";
import { weaponMatchesCharacterJob } from "@/lib/jobs";

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

type CharSlot = {
  id: string;
  char: LibraryItem | null;
  card: LibraryItem | null;
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
      </div>
    );
  };

  useEffect(() => {
    setSearch("");
  }, [picker]);

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
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            LostSword 택틱 배치
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:border-white/40 hover:bg-white/20"
            >
              저장 (PNG)
            </button>         
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90 shadow-inner shadow-black/20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="min-w-0">
        <div className="mb-3 font-semibold text-white">장비 프리셋</div>
        <p className="mb-3 text-xs text-white/55">
          자주 쓰는 무기·갑옷·투구·룬 조합을 저장해 두었다가 슬롯에 한 번에 적용할 수 있습니다. 브라우저에 저장됩니다.
        </p>
        <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-white/50">저장</span>
            <span className="text-[11px] text-white/60">가져올 슬롯</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="저장할 장비를 가져올 캐릭터 슬롯">
              {[0, 1, 2, 3, 4].map((i) => (
                <button
                  key={`preset-save-slot-${i}`}
                  type="button"
                  onClick={() => setPresetSaveSlotIndex(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                    presetSaveSlotIndex === i
                      ? "border-emerald-400/80 bg-emerald-600/45 text-white shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]"
                      : "border-white/15 bg-black/40 text-white/75 hover:border-white/30 hover:bg-white/10"
                  }`}
                  aria-pressed={presetSaveSlotIndex === i}
                >
                  {i + 1}
                </button>
              ))}
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
            className="rounded-lg border border-emerald-500/40 bg-emerald-600/30 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600/45 sm:shrink-0"
          >
            현재 장비로 저장
          </button>
        </div>
        <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs text-white/50">적용할 캐릭터 슬롯</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="프리셋을 넣을 캐릭터 슬롯">
            {[0, 1, 2, 3, 4].map((i) => (
              <button
                key={`preset-apply-slot-${i}`}
                type="button"
                onClick={() => setPresetApplySlotIndex(i)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                  presetApplySlotIndex === i
                    ? "border-sky-400/80 bg-sky-600/45 text-white shadow-[inset_0_0_0_1px_rgba(56,189,248,0.45)]"
                    : "border-white/15 bg-black/40 text-white/75 hover:border-white/30 hover:bg-white/10"
                }`}
                aria-pressed={presetApplySlotIndex === i}
              >
                {i + 1}
              </button>
            ))}
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
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">{p.name}</div>
                  <div className="truncate text-xs text-white/50" title={formatPresetPreview(p)}>
                    {formatPresetPreview(p)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyEquipPreset(p, presetApplySlotIndex)}
                    className="rounded-lg border border-sky-500/40 bg-sky-600/25 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-600/40"
                  >
                    적용
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEquipPreset(p.id)}
                    className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-red-500/20 hover:text-white"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
          </div>
          <div className="min-w-0 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="mb-3 font-semibold text-white">택틱 조합 (전체 배치) 프리셋</div>
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
                className="rounded-lg border border-violet-500/40 bg-violet-600/30 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600/45"
              >
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
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white">{p.name}</div>
                      <div
                        className="truncate text-xs text-white/50"
                        title={formatLayoutPreview(p)}
                      >
                        {formatLayoutPreview(p)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyLayoutPreset(p)}
                        className="rounded-lg border border-violet-500/40 bg-violet-600/25 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-600/40"
                      >
                        불러오기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLayoutPreset(p.id)}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-red-500/20 hover:text-white"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

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
                        {/* 캐릭터 버튼 */}
                        <button
                          onClick={() => {
                            setPicker("char");
                            setSlotTarget({ type: "char", slotIndex: idx });
                          }}
                          className="absolute rounded border border-transparent hover:border-white/30 hover:bg-white/5 transition cursor-pointer"
                          style={{
                            left: `${canvasLayout.slotPadding}px`,
                            top: `${canvasLayout.slotPadding}px`,
                            width: `${canvasLayout.slotWidth - canvasLayout.slotPadding * 2}px`,
                            height: `${canvasLayout.charImageHeight}px`
                          }}
                        />
                        {/* 카드 버튼 */}
                        <button
                          onClick={() => {
                            setPicker("card");
                            setSlotTarget({ type: "card", slotIndex: idx });
                          }}
                          className="absolute rounded border border-transparent hover:border-white/30 hover:bg-white/5 transition cursor-pointer"
                          style={{
                            left: `${canvasLayout.slotPadding}px`,
                            top: `${canvasLayout.slotPadding + canvasLayout.charImageHeight + 12}px`,
                            width: `${canvasLayout.slotWidth - canvasLayout.slotPadding * 2}px`,
                            height: `${canvasLayout.cardImageHeight}px`
                          }}
                        />
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
                            <button
                              key={kind}
                              onClick={() => {
                                setPicker("equip");
                                setSlotTarget({ type: "equip", slotIndex: idx, equipKind: kind });
                              }}
                              className="absolute rounded border border-transparent hover:border-white/30 hover:bg-white/5 transition cursor-pointer"
                              style={{
                                left: `${equipX}px`,
                                top: `${equipY}px`,
                                width: `${canvasLayout.equipCellSize}px`,
                                height: `${canvasLayout.equipCellSize}px`
                              }}
                            />
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
                        onClick={() => {
                          if (petFormationSlots[idx]) {
                            assignPetFormation(idx, null);
                          } else {
                            setPicker("pet");
                            setSlotTarget({ type: "pet", slotIndex: idx });
                          }
                        }}
                        className="absolute rounded border border-transparent hover:border-white/30 hover:bg-white/5 transition cursor-pointer"
                        style={{
                          left: `${petX}px`,
                          top: `${canvasLayout.petVerticalInset}px`,
                          width: `${petBoxWidth}px`,
                          height: `${canvasLayout.petBoxHeight}px`
                        }}
                      />
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
              {slotTarget ? (
                renderSlotPickerList()
              ) : (
                (() => {
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
                      if (type === "char") return !usedCharIds.has(item.id);
                      if (type === "card") return !usedCardIds.has(item.id);
                      if (type === "pet") return !usedPetIds.has(item.id);
                      return true;
                    });
                  const sourceList =
                    picker === "equip"
                      ? libraries.equip.filter((item) => {
                          if (!uniqueEquipIds.has(item.id)) return true;
                          for (const slot of charSlots) {
                            for (const k of EQUIP_KINDS) {
                              if (slot.equips[k]?.id === item.id) return false;
                            }
                          }
                          return true;
                        })
                      : filterAvailable(libraries[picker], picker);
                  const query = search.trim().toLowerCase();
                  const filtered = query
                    ? sourceList.filter((item) =>
                        item.name.toLowerCase().includes(query)
                      )
                    : sourceList;
                  const sorted = [...filtered].sort((a, b) => {
                    if (picker === "equip") {
                      return equipSortRank(b) - equipSortRank(a);
                    }
                    return listSortRank(b) - listSortRank(a);
                  });
                  return (
                    <div
                      className={
                        picker === "equip"
                          ? "grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3"
                          : "flex flex-col gap-2"
                      }
                    >
                      {sorted.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => handleSelectToSlot(entry)}
                          className={`group relative overflow-hidden rounded-lg text-left transition hover:shadow-lg hover:shadow-black/40 ${
                            picker === "equip" && uniqueEquipIds.has(entry.id)
                              ? "border-2 border-violet-400/75 shadow-[0_0_18px_rgba(139,92,246,0.22)] hover:border-violet-300 hover:shadow-violet-500/15"
                              : "border border-white/10 hover:border-white/30"
                          } ${picker === "equip" ? "aspect-[3/4] bg-black/40" : "h-20 w-full bg-black/50"}`}
                          style={
                            picker === "equip"
                              ? {}
                              : {
                                  backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.4)), url("${toSafeAssetSrc(entry.src)}")`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center 30%"
                                }
                          }
                        >
                          {picker === "equip" ? (
                            <>
                              <img
                                src={toSafeAssetSrc(entry.src)}
                                alt={entry.name}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-1 text-[11px] font-medium text-white">
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
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


