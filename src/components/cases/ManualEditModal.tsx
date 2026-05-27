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
import { toast } from "sonner";
import { PostMosaic } from "@/lib/api";
import type { Detection } from "@/lib/api";
import { saveMosaicFile, loadOriginalFiles } from "@/lib/caseSession";

export interface BBox {
  id: number;
  x: number;       // % of stage width
  y: number;       // % of stage height
  w: number;       // % of stage width
  h: number;       // % of stage height
  pxX: number;
  pxY: number;
  pxW: number;
  pxH: number;
  source?: "auto" | "manual";
}

interface DraftBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  file: { id: number; name: string; sizeMB: number; seed: number } | null;
  caseId: string;
  fileId: string;
  autoDetections: Detection[];
  initialBoxes: BBox[];
  onClose: () => void;
  onApply: (boxes: BBox[]) => void;
}

export default function ManualEditModal({
  file, caseId, fileId, autoDetections, initialBoxes, onClose, onApply,
}: Props) {
  const [history, setHistory] = useState<BBox[][]>([initialBoxes]);
  const [hIndex, setHIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [draft, setDraft] = useState<DraftBox | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [autoInitialized, setAutoInitialized] = useState(initialBoxes.length > 0);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; rect: DOMRect } | null>(null);

  const boxes = history[hIndex] ?? [];

  // 원본 이미지 IDB에서 로드
  useEffect(() => {
    if (!file?.id || !caseId) return;
    let objUrl: string | null = null;
    loadOriginalFiles(caseId, [file.id]).then((fileMap) => {
      const f = fileMap.get(file.id);
      if (f) {
        setOriginalFile(f);
        objUrl = URL.createObjectURL(f);
        setOriginalUrl(objUrl);
      }
    });
    return () => { if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [caseId, file?.id]);

  // 최초 진입 시 자동 탐지 박스를 초기 박스로 변환 (naturalSize 확보 후)
  useEffect(() => {
    if (autoInitialized || !naturalSize || autoDetections.length === 0) return;
    const autoBBoxes: BBox[] = autoDetections.map((d, i) => {
      const [x1, y1, x2, y2] = d.box_xyxy;
      return {
        id: -(i + 1),
        x: (x1 / naturalSize.w) * 100,
        y: (y1 / naturalSize.h) * 100,
        w: ((x2 - x1) / naturalSize.w) * 100,
        h: ((y2 - y1) / naturalSize.h) * 100,
        pxX: x1,
        pxY: y1,
        pxW: x2 - x1,
        pxH: y2 - y1,
        source: "auto" as const,
      };
    });
    setHistory([[...autoBBoxes]]);
    setHIndex(0);
    setAutoInitialized(true);
  }, [naturalSize, autoInitialized, autoDetections]);

  const commitBoxes = (next: BBox[]) => {
    const trimmed = history.slice(0, hIndex + 1);
    const newHist = [...trimmed, next];
    setHistory(newHist);
    setHIndex(newHist.length - 1);
  };

  const removeBox = (id: number) => commitBoxes(boxes.filter((b) => b.id !== id));
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
        source: "manual",
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

  const handleApply = async () => {
    if (boxes.length === 0) {
      onApply(boxes);
      return;
    }
    if (!fileId) { toast.error("파일 정보가 없습니다."); return; }
    if (!originalFile) { toast.error("원본 이미지를 불러올 수 없습니다."); return; }
    setIsApplying(true);
    try {
      const nw = naturalSize?.w ?? 1024;
      const nh = naturalSize?.h ?? 1024;
      const scaledBoxes: number[][] = boxes.map((b) => [
        Math.round((b.x / 100) * nw),
        Math.round((b.y / 100) * nh),
        Math.round((b.w / 100) * nw),
        Math.round((b.h / 100) * nh),
      ]);
      const resultBlob = await PostMosaic(originalFile, scaledBoxes);
      await saveMosaicFile(caseId, fileId, resultBlob);
      onApply(boxes);
    } catch {
      toast.error("모자이크 적용에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsApplying(false);
    }
  };

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
  const autoCount = boxes.filter((b) => b.source === "auto").length;
  const manualCount = boxes.filter((b) => b.source === "manual").length;

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
              원본 이미지 기준으로 모자이크 영역을 조정하세요. 박스를 클릭하면 삭제됩니다.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-[10px]">
            <div className="flex items-center border border-[#d9deea] rounded-[8px] overflow-hidden">
              <button
                className="w-8 h-9 text-[16px] font-semibold text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1d2c4e]"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
              >−</button>
              <span className="px-2 text-[13px] font-semibold text-[#1f2330] min-w-[52px] text-center">{zoom}%</span>
              <button
                className="w-8 h-9 text-[16px] font-semibold text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1d2c4e]"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
              >+</button>
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
              className="relative w-full bg-[#1a1a1a] rounded-[8px] overflow-hidden select-none cursor-crosshair"
              style={{ aspectRatio: naturalSize ? `${naturalSize.w}/${naturalSize.h}` : "4/3" }}
              onMouseDown={onMouseDown}
            >
              <div
                className="w-full h-full"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
              >
                {originalUrl ? (
                  <img
                    src={originalUrl}
                    alt={file?.name}
                    className="w-full h-full"
                    style={{ objectFit: "contain", pointerEvents: "none", userSelect: "none" }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#9aa1b3] text-[13px]">
                    원본 이미지 로드 중...
                  </div>
                )}
              </div>

              {/* Committed boxes — 클릭 시 삭제 */}
              {boxes.map((b) => {
                const isAuto = b.source === "auto";
                return (
                  <div
                    key={b.id}
                    onClick={(e) => { e.stopPropagation(); removeBox(b.id); }}
                    title="클릭하여 삭제"
                    style={{
                      position: "absolute",
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.w}%`,
                      height: `${b.h}%`,
                      border: `2px solid ${isAuto ? "#f59e0b" : "#3b82f6"}`,
                      backgroundColor: isAuto ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)",
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#fff",
                        background: isAuto ? "#f59e0b" : "#3b82f6",
                        padding: "1px 3px",
                        borderRadius: "0 0 0 3px",
                        lineHeight: 1.4,
                        userSelect: "none",
                      }}
                    >
                      {isAuto ? "AUTO" : "MAN"}
                    </span>
                  </div>
                );
              })}

              {/* Draft box while dragging */}
              {draft && (draft.w > 0 || draft.h > 0) && (
                <div
                  style={{
                    position: "absolute",
                    left: draft.x,
                    top: draft.y,
                    width: draft.w,
                    height: draft.h,
                    border: "2px dashed #3b82f6",
                    background: "rgba(59,130,246,0.10)",
                    borderRadius: 2,
                    pointerEvents: "none",
                  }}
                >
                  {[{ top: -5, left: -5 }, { top: -5, right: -5 }, { bottom: -5, left: -5 }, { bottom: -5, right: -5 }].map((pos, i) => (
                    <span key={i} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #3b82f6", borderRadius: "50%", ...pos }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Info panel */}
          <div className="flex flex-col gap-[14px]">
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[18px]">
              <h4 className="text-[14px] font-bold text-[#1f2330] mb-[14px]">영역 정보</h4>
              {[
                { k: "위치 (X, Y)", v: showBox ? `${showBox.pxX}, ${showBox.pxY}` : "—" },
                { k: "크기 (W × H)", v: showBox ? `${showBox.pxW} × ${showBox.pxH}` : "—" },
                { k: "면적", v: showBox ? `${showArea.toLocaleString()} px²` : "—" },
              ].map(({ k, v }) => (
                <div key={k} className="flex items-center justify-between mb-[10px] last:mb-0 text-[13px]">
                  <span className="text-[#6b7388]">{k}</span>
                  <span className="bg-[#f5f6fa] border border-[#e6e8ef] px-[10px] py-[5px] rounded-[6px] text-[#1f2330] font-semibold text-[12.5px] min-w-[80px] text-center">{v}</span>
                </div>
              ))}
            </div>

            {/* 박스 현황 */}
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[18px]">
              <h4 className="text-[14px] font-bold text-[#1f2330] mb-[12px]">박스 현황</h4>
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-[6px] text-[#6b7388]">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: "#f59e0b" }} />
                    자동 탐지
                  </span>
                  <span className="font-bold text-[#1f2330]">{autoCount}개</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-[6px] text-[#6b7388]">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: "#3b82f6" }} />
                    수동 추가
                  </span>
                  <span className="font-bold text-[#1f2330]">{manualCount}개</span>
                </div>
                <div className="flex items-center justify-between text-[13px] pt-[8px] border-t border-[#f0f1f5]">
                  <span className="text-[#6b7388]">합계</span>
                  <span className="font-bold text-[#1f2330]">{boxes.length}개</span>
                </div>
              </div>
            </div>

            <div className="bg-[#f0f4fa] border border-[#d9e3f1] rounded-[10px] p-[16px] text-[12.5px] leading-[1.65] text-[#3a4055]">
              <div className="flex items-center gap-[6px] font-bold text-[#1f2330] text-[13px] mb-2">
                <Info size={13} className="text-[#1d2c4e]" />
                안내
              </div>
              원본 이미지 위에 자동 탐지 박스가 표시됩니다. 박스를 <strong>클릭</strong>하면 삭제, <strong>드래그</strong>하면 새 박스를 추가합니다.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-[#ebedf2] bg-[#fafbfd] gap-3">
          <div className="flex gap-2">
            {[
              { label: "초기화", icon: <RotateCcw size={14} />, onClick: reset, disabled: boxes.length === 0 || isApplying },
              { label: "뒤로가기", icon: <Undo2 size={14} />, onClick: undo, disabled: hIndex === 0 || isApplying },
              { label: "앞으로가기", icon: <Redo2 size={14} />, onClick: redo, disabled: hIndex >= history.length - 1 || isApplying },
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
                {icon}{label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-6 py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors disabled:bg-[#4a5e8a] disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isApplying && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isApplying ? "처리 중..." : "적용 후 닫기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
