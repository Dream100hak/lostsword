"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    img.src = src;
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
    const slotWidth = (canvasWidth - padding * 2 - 16 * 4) / 5;
    const charImageHeight = Math.min(slotWidth * (4 / 3), 280);
    const cardImageHeight = Math.min(slotWidth * (8 / 5), 280);
    const equipSize = 52;
    const slotsHeight = charImageHeight + cardImageHeight + equipSize + 32;
    const bottomSectionHeight = 180;
    
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
    const slotPadding = 8;
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

      // 장비 슬롯
      const equipGap = 6;
      const equipTotalWidth = slotWidth - slotPadding * 2;
      const equipItemWidth = (equipTotalWidth - equipGap * 3) / 4;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      roundRect(ctx, slotX, slotY, equipTotalWidth, equipSize + 12, 4);
      ctx.fill();
      
      const equipKinds: EquipKind[] = ["weapon", "armor", "helmet", "roon"];
      const equipLabels = { weapon: "W", armor: "A", helmet: "H", roon: "R" };
      
      for (let j = 0; j < 4; j++) {
        const kind = equipKinds[j];
        const equipX = slotX + j * (equipItemWidth + equipGap);
        const equip = slot.equips[kind];
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        roundRect(ctx, equipX, slotY + 6, equipItemWidth, equipSize, 4);
        ctx.fill();
        ctx.stroke();
        
        if (equip) {
          const equipImg = imageCache.get(equip.src);
          if (equipImg && equipImg.complete) {
            ctx.drawImage(equipImg, equipX, slotY + 6, equipItemWidth, equipSize);
          }
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.font = "400 10px 'Noto Sans KR', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(equipLabels[kind], equipX + equipItemWidth / 2, slotY + 6 + equipSize / 2);
        }
      }
    }

    y += slotsHeight + 12;

    // 펫 진형 및 스킬 순서 영역
    const bottomSectionY = y;
    const petSectionWidth = (canvasWidth - padding * 2 - 12) * 0.6;
    const skillSectionWidth = (canvasWidth - padding * 2 - 12) * 0.4;

    // 펫 진형 영역
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, padding, bottomSectionY, petSectionWidth, bottomSectionHeight, 4);
    ctx.fill();
    ctx.stroke();

    const petBoxWidth = (petSectionWidth - 16 - 8) / 3;
    const petBoxHeight = 144;
    const petBoxY = bottomSectionY + 8;

    const laneConfigs = [
      { label: "후열", color: "rgba(14, 165, 233, 0.7)" },
      { label: "중열", color: "rgba(245, 158, 11, 0.7)" },
      { label: "전열", color: "rgba(244, 63, 94, 0.7)" }
    ];

    for (let i = 0; i < 3; i++) {
      const config = laneConfigs[i];
      const petX = padding + 8 + i * (petBoxWidth + 4);
      const pet = petFormationSlots[i];

      const gradient = ctx.createLinearGradient(petX, petBoxY, petX + petBoxWidth, petBoxY + petBoxHeight);
      gradient.addColorStop(0, config.color);
      gradient.addColorStop(1, config.color);
      ctx.fillStyle = gradient;
      roundRect(ctx, petX, petBoxY, petBoxWidth, petBoxHeight, 4);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(petX, petBoxY, petBoxWidth, petBoxHeight);

      // 아이콘과 텍스트를 중앙에 배치
      const iconSize = 16;
      const iconSpacing = 8; // 간격 증가
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 12px 'Noto Sans KR', sans-serif";
      
      const textMetrics = ctx.measureText(config.label);
      const totalWidth = iconSize + iconSpacing + textMetrics.width;
      const startX = petX + (petBoxWidth - totalWidth) / 2;
      const labelY = petBoxY + 8 + iconSize / 2; // 아이콘 중앙 높이
      
      const iconImg = imageCache.get(getLaneIconSrc(config.label as "후열" | "중열" | "전열"));
      if (iconImg && iconImg.complete) {
        ctx.drawImage(iconImg, startX, petBoxY + 8, iconSize, iconSize);
      }
      
      // 텍스트를 아이콘 중앙 높이에 맞춰서 표시
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(config.label, startX + iconSize + iconSpacing, labelY);

      const petImageSize = 80;
      const petImageX = petX + (petBoxWidth - petImageSize) / 2;
      const petImageY = petBoxY + 36;

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
    const noteSectionWidth = (canvasWidth - padding * 2 - 12) * 0.4;
    const notePadding = 12;
    const noteStartY = bottomSectionY + 40;
    const noteAreaWidth = noteSectionWidth - notePadding * 2;
    const noteAreaHeight = bottomSectionHeight - 40 - notePadding;
    
    // 노트 영역 배경 그리기
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, noteX, bottomSectionY, noteSectionWidth, bottomSectionHeight, 4);
    ctx.fill();
    ctx.stroke();

    // 제목 그리기
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 14px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("노트", noteX + noteSectionWidth / 2, bottomSectionY + 20);

    // 노트 텍스트 영역 클리어 (이전 텍스트 제거)
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(noteX + notePadding, noteStartY, noteAreaWidth, noteAreaHeight);

    // 노트 텍스트 그리기
    if (noteText && noteText.trim()) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "400 14px 'Noto Sans KR', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      const lineHeight = 20;
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
      setCharSlots((prev) => {
        const next = [...prev];
        next[slotTarget.slotIndex] = {
          ...next[slotTarget.slotIndex],
          equips: {
            ...next[slotTarget.slotIndex].equips,
            [slotTarget.equipKind as EquipKind]: item
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
    
    const sorted = [...filtered].sort((a, b) => {
      const numA = parseInt(a.id.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.id.match(/\d+/)?.[0] || "0");
      return numB - numA;
    });
    
    const isEquip = slotTarget.type === "equip";
    return (
      <div
        className={
          isEquip
            ? "flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin grid grid-cols-2 md:grid-cols-3 gap-3"
            : "flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin grid grid-cols-2 md:grid-cols-3 gap-2"
        }
      >
        {sorted.map((entry) => (
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
    const width = 1280;
    const padding = 16;
    const slotWidth = (width - padding * 2 - 16 * 4) / 5; // gap 16px * 4
    const charImageHeight = Math.min(slotWidth * (4 / 3), 280);
    const cardImageHeight = Math.min(slotWidth * (8 / 5), 280);
    const equipSize = 52;
    const slotPadding = 8;
    const gap = 16;
    
    return {
      padding,
      slotWidth,
      charImageHeight,
      cardImageHeight,
      equipSize,
      slotPadding,
      gap
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            LostSword 아트 배치 에디터
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:border-white/40 hover:bg-white/20"
            >
              저장 (PNG)
            </button>
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
        </div>
      </header>

      <section className="flex justify-center relative">
        <div
          className={`relative rounded border border-white/10 bg-canvas p-4 shadow-2xl shadow-black/50 ${
            compactView ? "scale-[0.85] origin-top-left" : ""
          }`}
        >
          <PreviewCanvas
            ref={canvasRef}
            charSlots={charSlots}
            petFormationSlots={petFormationSlots}
            noteText={noteText}
            width={1280}
          />
          
          {/* 편집용 DOM UI - 클릭 가능한 오버레이 */}
          {/* 컨테이너의 p-4 (16px) 패딩을 고려하여 오버레이 배치 */}
          <div className="absolute pointer-events-none" style={{ 
            top: "16px",
            left: "16px", 
            right: "16px",
            bottom: "16px"
          }}>
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
                          height: `${canvasLayout.charImageHeight + canvasLayout.cardImageHeight + canvasLayout.equipSize + 32}px`
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
                          const equipGap = 6;
                          const equipTotalWidth = canvasLayout.slotWidth - canvasLayout.slotPadding * 2;
                          const equipItemWidth = (equipTotalWidth - equipGap * 3) / 4;
                          const slotX = canvasLayout.slotPadding;
                          const slotY = canvasLayout.slotPadding + canvasLayout.charImageHeight + 12 + canvasLayout.cardImageHeight + 12;
                          const equipX = slotX + equipIdx * (equipItemWidth + equipGap);
                          const equipY = slotY + 6;
                          
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
                                width: `${equipItemWidth}px`,
                                height: `${canvasLayout.equipSize}px`
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
                <div className="relative" style={{ width: "60%", height: "180px" }}>
                  {(["후열", "중열", "전열"] as const).map((label, idx) => {
                    const petSectionWidth = (1280 - canvasLayout.padding * 2 - 12) * 0.6;
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
                          top: "8px",
                          width: `${petBoxWidth}px`,
                          height: "144px"
                        }}
                      />
                    );
                  })}
                </div>
                {/* 노트 */}
                <div className="relative" style={{ width: "40%", height: "180px" }}>
                  {/* 제목 영역 - 캔버스에서 bottomSectionY + 20 (중앙)에 그려짐 */}
                  <div className="absolute top-0 left-0 right-0 pointer-events-none flex items-center justify-center" style={{ height: "40px" }}>
                    {/* 제목은 캔버스에서만 표시되므로 오버레이에서는 숨김 */}
                  </div>
                  {/* 텍스트 영역 - 캔버스에서 noteX + notePadding, noteStartY부터 시작 */}
                  <div className="absolute overflow-hidden" style={{ 
                    top: "40px", 
                    left: "12px", 
                    right: "12px", 
                    bottom: "12px"
                  }}>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder=""
                      className="w-full h-full resize-none border-0 bg-transparent text-transparent caret-white placeholder:text-transparent focus:outline-none"
                      style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "14px",
                        fontWeight: "400",
                        lineHeight: "20px",
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && (setPicker(null), setSlotTarget(null))}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-black/50"
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
                      ? libraries.equip
                      : filterAvailable(libraries[picker], picker);
                  const query = search.trim().toLowerCase();
                  const filtered = query
                    ? sourceList.filter((item) =>
                        item.name.toLowerCase().includes(query)
                      )
                    : sourceList;
                  const sorted = [...filtered].sort((a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || "0");
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || "0");
                    return numB - numA;
                  });
                  return (
                    <div className={picker === "equip" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2"}>
                      {sorted.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => handleSelectToSlot(entry)}
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
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
