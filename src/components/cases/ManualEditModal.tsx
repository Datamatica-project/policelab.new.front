"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Maximize2,
  RotateCcw,
  Undo2,
  Redo2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CompareScene from "./CompareScene";

export interface BBox {
  id: number;
  x: number;   // % of stage width
  y: number;   // % of stage height
  w: number;   // % of stage width
  h: number;   // % of stage height
  pxX: number;
  pxY: number;
  pxW: number;
  pxH: number;
}

interface DraftBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  file: { id: number; name: string; sizeMB: number; seed: number } | null;
  initialBoxes: BBox[];
  onClose: () => void;
  onApply: (boxes: BBox[]) => void;
}

const MOSAIC_BOX_STYLE: React.CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  backgroundColor: "#a87555",
  backgroundImage: [
    "repeating-linear-gradient(0deg, rgba(0,0,0,0.20) 0 1px, transparent 1px)",
    "repeating-linear-gradient(90deg, rgba(0,0,0,0.20) 0 1px, transparent 1px)",
    "linear-gradient(135deg, #c4926e 0%, #a87555 35%, #6b4530 70%, #8a6048 100%)",
  ].join(", "),
  backgroundSize: "8px 8px, 8px 8px, 100% 100%",
  borderRadius: 2,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
};

export default function ManualEditModal({ file, initialBoxes, onClose, onApply }: Props) {
  const [history, setHistory] = useState<BBox[][]>([initialBoxes]);
  const [hIndex, setHIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [draft, setDraft] = useState<DraftBox | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; rect: DOMRect } | null>(null);

  const boxes = history[hIndex] ?? [];

  const commitBoxes = (next: BBox[]) => {
    const trimmed = history.slice(0, hIndex + 1);
    const newHist = [...trimmed, next];
    setHistory(newHist);
    setHIndex(newHist.length - 1);
  };

  const undo = () => { if (hIndex > 0) setHIndex((i) => i - 1); };
  const redo = () => { if (hIndex < history.length - 1) setHIndex((i) => i + 1); };
  const reset = () => commitBoxes([]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragRef.current = { startX: x, startY: y, rect };
    setDraft({ x, y, w: 0, h: 0 });
    e.preventDefault();
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, rect } = dragRef.current;
    const cx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const cy = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDraft({
      x: Math.min(startX, cx),
      y: Math.min(startY, cy),
      w: Math.abs(cx - startX),
      h: Math.abs(cy - startY),
    });
  }, []);

  const onMouseUp = useCallback(() => {
    if (!dragRef.current || !draft) {
      dragRef.current = null;
      setDraft(null);
      return;
    }
    const { rect } = dragRef.current;
    if (draft.w >= 6 && draft.h >= 6) {
      const box: BBox = {
        id: Date.now(),
        x: (draft.x / rect.width) * 100,
        y: (draft.y / rect.height) * 100,
        w: (draft.w / rect.width) * 100,
        h: (draft.h / rect.height) * 100,
        pxX: Math.round(draft.x * (1024 / rect.width)),
        pxY: Math.round(draft.y * (1024 / rect.height)),
        pxW: Math.round(draft.w * (1024 / rect.width)),
        pxH: Math.round(draft.h * (1024 / rect.height)),
      };
      commitBoxes([...boxes, box]);
    }
    dragRef.current = null;
    setDraft(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, boxes, hIndex, history]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hIndex, history.length]);

  const lastBox = boxes[boxes.length - 1];
  const showBox = draft && draft.w > 0
    ? (() => {
        const r = stageRef.current?.getBoundingClientRect();
        if (!r) return null;
        return {
          pxX: Math.round(draft.x * (1024 / r.width)),
          pxY: Math.round(draft.y * (1024 / r.height)),
          pxW: Math.round(draft.w * (1024 / r.width)),
          pxH: Math.round(draft.h * (1024 / r.height)),
        };
      })()
    : lastBox ?? null;
  const showArea = showBox ? showBox.pxW * showBox.pxH : 0;

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,22,40,0.45)] flex items-center justify-center z-[200] p-10 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[12px] w-full max-w-[1080px] max-h-[calc(100vh-80px)] flex flex-col shadow-[0_24px_60px_rgba(15,22,40,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-7 pt-[22px] pb-4">
          <div>
            <h3 className="text-[19px] font-bold text-[#1f2330] tracking-[-0.01em] mb-1">
              수동 모자이크 편집
            </h3>
            <p className="text-[13.5px] text-[#6b7388]">
              누락된 영역을 드래그하여 선택하고 모자이크를 적용하세요.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-[10px]">
            {/* Zoom */}
            <div className="flex items-center border border-[#d9deea] rounded-[8px] overflow-hidden">
              <button
                className="w-8 h-9 text-[16px] font-semibold text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1d2c4e]"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
              >
                −
              </button>
              <span className="px-2 text-[13px] font-semibold text-[#1f2330] min-w-[52px] text-center">
                {zoom}%
              </span>
              <button
                className="w-8 h-9 text-[16px] font-semibold text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1d2c4e]"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
              >
                +
              </button>
            </div>
            <button className="w-9 h-9 border border-[#d9deea] rounded-[8px] text-[#6b7388] flex items-center justify-center hover:text-[#1d2c4e]">
              <Maximize2 size={16} />
            </button>
            <button
              className="w-8 h-8 rounded-[6px] text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1f2330]"
              onClick={onClose}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-7 pb-[18px] min-h-0"
          style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 22 }}
        >
          {/* Left: Stage */}
          <div className="flex flex-col">
            <p className="text-[13.5px] text-[#6b7388] mb-[10px]">
              <strong className="text-[#1f2330] font-bold mr-2">파일명</strong>
              {file?.name ?? "—"}
            </p>
            <div
              ref={stageRef}
              className="relative w-full bg-[#f0f1f5] rounded-[8px] overflow-hidden select-none cursor-crosshair"
              style={{ aspectRatio: "4/3" }}
              onMouseDown={onMouseDown}
            >
              <div
                className="w-full h-full"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
              >
                <CompareScene mosaic variant={file?.seed ?? 0} />
              </div>

              {/* Committed boxes */}
              {boxes.map((b) => (
                <div
                  key={b.id}
                  style={{
                    ...MOSAIC_BOX_STYLE,
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    width: `${b.w}%`,
                    height: `${b.h}%`,
                  }}
                />
              ))}

              {/* Draft box while dragging */}
              {draft && (draft.w > 0 || draft.h > 0) && (
                <div
                  style={{
                    position: "absolute",
                    left: draft.x,
                    top: draft.y,
                    width: draft.w,
                    height: draft.h,
                    border: "2px dashed #2b6cb0",
                    background: "rgba(43,108,176,0.10)",
                    borderRadius: 2,
                    pointerEvents: "none",
                  }}
                >
                  {[
                    { top: -5, left: -5 },
                    { top: -5, right: -5 },
                    { bottom: -5, left: -5 },
                    { bottom: -5, right: -5 },
                  ].map((pos, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute",
                        width: 8,
                        height: 8,
                        background: "#fff",
                        border: "1.5px solid #2b6cb0",
                        borderRadius: "50%",
                        ...pos,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Info panel */}
          <div>
            {/* Selection info */}
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[18px] mb-[14px]">
              <h4 className="text-[14px] font-bold text-[#1f2330] mb-[14px]">선택 영역 정보</h4>
              {[
                { k: "위치 (X, Y)", v: showBox ? `${showBox.pxX}, ${showBox.pxY}` : "—" },
                { k: "크기 (W × H)", v: showBox ? `${showBox.pxW} × ${showBox.pxH}` : "—" },
                { k: "면적", v: showBox ? `${showArea.toLocaleString()} px²` : "—" },
              ].map(({ k, v }) => (
                <div key={k} className="flex items-center justify-between mb-[10px] last:mb-0 text-[13px]">
                  <span className="text-[#6b7388]">{k}</span>
                  <span className="bg-[#f5f6fa] border border-[#e6e8ef] px-[10px] py-[5px] rounded-[6px] text-[#1f2330] font-semibold text-[12.5px] min-w-[80px] text-center">
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {/* Guide */}
            <div className="bg-[#f0f4fa] border border-[#d9e3f1] rounded-[10px] p-[16px] text-[12.5px] leading-[1.65] text-[#3a4055]">
              <div className="flex items-center gap-[6px] font-bold text-[#1f2330] text-[13px] mb-2">
                <Info size={13} className="text-[#1d2c4e]" />
                안내
              </div>
              드래그하여 영역을 선택하면 자동으로 모자이크가 적용됩니다. 필요 시 영역을 다시 선택하거나 초기화 후 재선택할 수 있습니다.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-[#ebedf2] bg-[#fafbfd] gap-3">
          <div className="flex gap-2">
            {[
              { label: "초기화", icon: <RotateCcw size={14} />, onClick: reset, disabled: boxes.length === 0 },
              { label: "뒤로가기", icon: <Undo2 size={14} />, onClick: undo, disabled: hIndex === 0 },
              { label: "앞으로가기", icon: <Redo2 size={14} />, onClick: redo, disabled: hIndex >= history.length - 1 },
            ].map(({ label, icon, onClick, disabled }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-[6px] px-4 py-[9px] border border-[#d9deea] rounded-[8px] bg-white text-[13px] font-semibold text-[#3a4055] transition-colors",
                  "hover:bg-[#f3f4f8] hover:border-[#c5cbd9] disabled:text-[#c5cbd9] disabled:cursor-not-allowed",
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => onApply(boxes)}
              className="px-6 py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors"
            >
              적용 후 닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
