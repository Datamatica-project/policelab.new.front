"use client";

import { useState, useMemo } from "react";
import {
  Check,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Archive,
  BarChart2,
  Activity,
  Info,
  ExternalLink,
  X,
  Image,
} from "lucide-react";
import CompareScene from "./CompareScene";
import type { BBox } from "./ManualEditModal";

interface UploadedFile {
  id: number;
  name: string;
  sizeMB: number;
  seed: number;
}

interface CompressedFile extends UploadedFile {
  original: number;
  after: number;
  saved: number;
  rate: number;
}

interface Props {
  caseName: string;
  officer: string;
  files: UploadedFile[];
  manualBoxes: Record<number, BBox[]>;
}

const MOSAIC_BOX_STYLE: React.CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  backgroundColor: "#a87555",
  backgroundImage: [
    "repeating-linear-gradient(0deg,rgba(0,0,0,0.20) 0 1px,transparent 1px)",
    "repeating-linear-gradient(90deg,rgba(0,0,0,0.20) 0 1px,transparent 1px)",
    "linear-gradient(135deg,#c4926e 0%,#a87555 35%,#6b4530 70%,#8a6048 100%)",
  ].join(","),
  backgroundSize: "8px 8px, 8px 8px, 100% 100%",
  borderRadius: 2,
};

/* ── Preview Modal ── */
function PreviewModal({
  file,
  boxes,
  onClose,
}: {
  file: CompressedFile;
  boxes: BBox[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-[rgba(15,22,40,0.45)] flex items-center justify-center z-[200] p-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[12px] overflow-hidden w-full max-w-[820px] max-h-[calc(100vh-80px)] flex flex-col shadow-[0_24px_60px_rgba(15,22,40,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-[18px] border-b border-[#ebedf2]">
          <div>
            <h3 className="text-[16px] font-bold text-[#1f2330] m-0">{file.name}</h3>
            <p className="text-[12.5px] text-[#6b7388] mt-[2px]">
              {file.after.toFixed(2)} MB · 모자이크 처리 완료
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1f2330]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 p-6 bg-[#f5f6fa] flex items-center justify-center overflow-auto">
          <div className="w-full max-w-[720px] aspect-[4/3] bg-white rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(15,22,40,0.10)] relative">
            <CompareScene mosaic variant={file.seed} />
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
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function Step3Complete({ caseName, officer, files, manualBoxes }: Props) {
  const [carouselStart, setCarouselStart] = useState(0);
  const [previewFile, setPreviewFile] = useState<CompressedFile | null>(null);

  const compressed = useMemo<CompressedFile[]>(() =>
    files.map((f) => {
      const ratio = 0.30 + (f.seed % 5) * 0.05;
      const after = +(f.sizeMB * ratio).toFixed(2);
      const saved = +(f.sizeMB - after).toFixed(2);
      const rate = +((saved / f.sizeMB) * 100).toFixed(1);
      return { ...f, original: f.sizeMB, after, saved, rate };
    }),
    [files],
  );

  const totalOriginal = compressed.reduce((s, f) => s + f.original, 0);
  const totalAfter = compressed.reduce((s, f) => s + f.after, 0);
  const totalSaved = totalOriginal - totalAfter;
  const totalRate = totalOriginal > 0 ? (totalSaved / totalOriginal) * 100 : 0;

  const canNext = carouselStart + 3 < compressed.length;
  const canPrev = carouselStart > 0;

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Completion header */}
      <div className="flex justify-between items-start gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#e3f4ea] flex items-center justify-center text-[#1f9d55] shrink-0">
            <Check size={28} />
          </div>
          <div>
            <h2 className="text-[22px] font-extrabold text-[#1f2330] tracking-[-0.01em] mb-1">
              검수가 완료되었습니다.
            </h2>
            <p className="text-[13.5px] text-[#6b7388]">
              모자이크 처리 및 압축이 완료되어 사건 파일이 안전하게 저장되었습니다.
            </p>
          </div>
        </div>
        {/* Download button */}
        <div className="flex rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(15,22,40,0.08)] shrink-0">
          <button className="flex items-center gap-2 px-5 py-3 bg-[#1d2c4e] text-white text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors">
            <Download size={16} />
            결과 다운로드 (ZIP)
          </button>
          <button className="w-9 bg-[#1d2c4e] text-white border-l border-white/20 flex items-center justify-center hover:bg-[#2b3f6c] transition-colors">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Carousel — full width */}
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px] flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 whitespace-nowrap">
            <Image size={16} className="text-[#1d2c4e]" />
            최종 모자이크 결과 미리보기
          </h3>
          <span className="bg-[#f0f4fa] text-[#1d2c4e] text-[12px] font-bold px-[10px] py-[3px] rounded-full">
            총 {compressed.length}개
          </span>
        </div>

        <div className="relative overflow-hidden">
          {/* Track */}
          <div
            className="flex gap-3"
            style={{
              transform: `translateX(calc(-${carouselStart} * (100% + 12px) / 3))`,
              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform",
            }}
          >
            {compressed.map((f) => (
              <div
                key={f.id}
                className="flex flex-col border border-[#e6e8ef] rounded-[10px] p-[10px] bg-white"
                style={{ flex: "0 0 calc((100% - 24px) / 3)", minWidth: 0 }}
              >
                <div className="w-full aspect-[4/3] bg-[#f0f1f5] rounded-[6px] overflow-hidden mb-2">
                  <CompareScene mosaic variant={f.seed} />
                </div>
                <p className="text-[13px] font-semibold text-[#1f2330] truncate mb-1">
                  {f.name}
                </p>
                <p className="text-[12px] text-[#8a93a8] mb-2">{f.after.toFixed(2)} MB</p>
                <button
                  onClick={() => setPreviewFile(f)}
                  className="self-end inline-flex items-center gap-1 px-3 py-[6px] border border-[#d9deea] rounded-[6px] bg-white text-[#3a4055] text-[12px] font-semibold hover:bg-[#f3f4f8] hover:border-[#c5cbd9] transition-colors"
                >
                  미리보기
                  <ExternalLink size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Prev arrow */}
          {canPrev && (
            <button
              onClick={() => setCarouselStart((s) => Math.max(0, s - 1))}
              className="absolute w-10 h-10 bg-white border border-[#d9deea] rounded-full shadow-[0_4px_12px_rgba(15,22,40,0.12)] text-[#1d2c4e] flex items-center justify-center z-10 hover:bg-[#f7f8fb] transition-colors"
              style={{ top: "calc(50% - 35px)", left: -2, transform: "translateY(-50%)" }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Next arrow */}
          {canNext && (
            <button
              onClick={() => setCarouselStart((s) => Math.min(compressed.length - 3, s + 1))}
              className="absolute w-10 h-10 bg-white border border-[#d9deea] rounded-full shadow-[0_4px_12px_rgba(15,22,40,0.12)] text-[#1d2c4e] flex items-center justify-center z-10 hover:bg-[#f7f8fb] transition-colors"
              style={{ top: "calc(50% - 35px)", right: -2, transform: "translateY(-50%)" }}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Info row — 50:50 */}
      <div className="grid grid-cols-2 gap-[22px] items-stretch">
        {/* Case info */}
        <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px] flex flex-col">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 mb-4 whitespace-nowrap">
            <Archive size={16} className="text-[#1d2c4e]" />
            사건 정보
          </h3>
          <div
            className="grid flex-1"
            style={{ gridTemplateColumns: "1fr 1fr", columnGap: 32 }}
          >
            {[
              { k: "사건명", v: caseName },
              { k: "생성 날짜", v: "2026년 5월 22일" },
              { k: "사건 담당자", v: `${officer} 순경` },
              { k: "처리 완료", v: "2026.05.22 14:35" },
              { k: "파일 개수", v: `${compressed.length}개` },
              { k: "원본 용량", v: `${totalOriginal.toFixed(2)} MB` },
              { k: "압축 후", v: `${totalAfter.toFixed(2)} MB` },
            ].map(({ k, v }) => (
              <div
                key={k}
                className="grid py-[10px] border-b border-[#f0f1f5] text-[13.5px]"
                style={{ gridTemplateColumns: "90px 1fr" }}
              >
                <span className="text-[#6b7388] font-medium">{k}</span>
                <span className="text-[#1f2330] font-bold">{v}</span>
              </div>
            ))}
            <div
              className="grid py-[10px] text-[13.5px] col-span-2"
              style={{ gridTemplateColumns: "90px 1fr" }}
            >
              <span className="text-[#6b7388] font-medium">최종 상태</span>
              <span>
                <span className="inline-block bg-[#e3f4ea] text-[#1f7a47] font-bold text-[12px] px-2 py-[3px] rounded-[5px]">
                  저장 완료
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Compression summary */}
        <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px] flex flex-col">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 mb-4 whitespace-nowrap">
            <BarChart2 size={16} className="text-[#1d2c4e]" />
            압축 결과 요약
          </h3>
          <div className="grid grid-cols-2 border border-[#eef0f5] rounded-[8px] overflow-hidden flex-1">
            {[
              { label: "원본 총 용량", value: `${totalOriginal.toFixed(2)} MB`, green: false },
              { label: "압축 후 총 용량", value: `${totalAfter.toFixed(2)} MB`, green: false },
              { label: "절감 용량", value: `${totalSaved.toFixed(2)} MB`, green: false },
              { label: "절감률", value: `${totalRate.toFixed(1)}%`, green: true },
            ].map(({ label, value, green }, i) => (
              <div
                key={label}
                className="p-[16px_18px] flex flex-col justify-center"
                style={{
                  borderRight: i % 2 === 0 ? "1px solid #eef0f5" : undefined,
                  borderBottom: i < 2 ? "1px solid #eef0f5" : undefined,
                }}
              >
                <p className="text-[12.5px] text-[#6b7388] mb-[6px]">{label}</p>
                <p
                  className="text-[20px] font-extrabold tracking-[-0.01em]"
                  style={{ color: green ? "#1f9d55" : "#1f2330" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* File table */}
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 whitespace-nowrap">
            <Activity size={16} className="text-[#1d2c4e]" />
            파일별 압축 정보
          </h3>
          <span className="bg-[#f0f4fa] text-[#1d2c4e] text-[12px] font-bold px-[10px] py-[3px] rounded-full whitespace-nowrap">
            총 {compressed.length}개
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["파일명", "원본 용량", "압축 후 용량", "절감 용량", "절감률", "최종 상태", "미리보기"].map(
                (h, i) => (
                  <th
                    key={h}
                    className="text-left text-[12.5px] font-semibold text-[#6b7388] pb-3 border-b border-[#ebedf2]"
                    style={i === 6 ? { textAlign: "right" } : undefined}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {compressed.map((f) => (
              <tr key={f.id}>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] text-[#3a4055]">
                  <span className="inline-block w-[52px] h-[38px] rounded bg-[#f0f1f5] overflow-hidden align-middle mr-[14px]">
                    <CompareScene mosaic variant={f.seed} />
                  </span>
                  <span className="font-semibold text-[#1f2330] align-middle">{f.name}</span>
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] text-[#3a4055]">
                  {f.original.toFixed(2)} MB
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] text-[#3a4055]">
                  {f.after.toFixed(2)} MB
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] text-[#3a4055]">
                  {f.saved.toFixed(2)} MB
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] font-bold text-[#1f9d55]">
                  {f.rate.toFixed(1)}%
                </td>
                <td className="py-4 border-b border-[#f0f1f5]">
                  <span className="inline-block bg-[#e3f4ea] text-[#1f7a47] font-bold text-[12px] px-2 py-[3px] rounded-[5px]">
                    저장 완료
                  </span>
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-right">
                  <button
                    onClick={() => setPreviewFile(f)}
                    className="inline-flex items-center gap-[6px] px-[14px] py-[7px] border border-[#d9deea] rounded-[6px] bg-white text-[#3a4055] text-[12.5px] font-semibold hover:bg-[#f3f4f8] transition-colors"
                  >
                    미리보기
                    <ExternalLink size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Info banner */}
        <div className="mt-[18px] bg-[#f5f6fa] border border-[#e6e8ef] rounded-[10px] px-[18px] py-[14px] text-center text-[13px] text-[#3a4055] flex items-center justify-center gap-2">
          <Info size={14} className="text-[#1d2c4e] shrink-0" />
          <span>
            모든 파일이 안전하게 저장되었습니다. 필요 시 "결과 다운로드" 버튼을 통해 전체 파일을 압축하여 다운로드할 수 있습니다.
          </span>
        </div>
      </div>

      {/* Preview modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          boxes={manualBoxes[previewFile.id] ?? []}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
