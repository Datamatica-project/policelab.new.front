"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  GetVideoDetections,
  RequestVideoManualCorrection,
  type VideoDetectionsDocument,
  type VideoDetectionsInfo,
  type VideoManualRegion,
} from "@/lib/api";

/**
 * 영상 수동 보정 편집기.
 *
 * <p>이미지의 ManualEditModal 과 조작감을 맞추되 <b>시간 축</b>이 하나 더 있다. 영상에서
 * 박스는 (x,y,w,h) 만으로 정해지지 않는다 — 같은 좌표라도 언제부터 언제까지 가릴지가
 * 다르기 때문이다.
 *
 * <p>화면에 보이는 것은 두 종류다.
 * <ul>
 *   <li><b>자동 검출</b>(빨강): 현재 프레임에서 모델이 찾은 것. 클릭하면 제외된다
 *       (원본에서 다시 블러하므로 과도하게 가려진 부분을 되살릴 수 있다).</li>
 *   <li><b>수동 구간</b>(파랑): 사용자가 그린 것. 적용 구간을 따로 가진다.</li>
 * </ul>
 *
 * <p>좌표는 언제나 <b>원본 픽셀</b>로 환산해서 보낸다. 표시 크기는 창·줌에 따라 달라지므로
 * 화면 좌표를 그대로 보내면 같은 박스가 기기마다 다른 곳을 가린다.
 */

interface ManualRegionDraft extends VideoManualRegion {
  id: number;
}

interface Props {
  fileId: string;
  fileName: string;
  /** 현재 저장된 비식별화 결과를 재생할 URL (blob URL 또는 인증된 URL) */
  videoUrl: string | null;
  onClose: () => void;
  onRequested: () => void;
}

/** 새로 그린 박스의 기본 적용 길이. 너무 짧으면 매번 늘려야 하고 길면 과하게 가려진다. */
const DEFAULT_REGION_SECONDS = 3;

export default function VideoManualEditModal({
  fileId,
  fileName,
  videoUrl,
  onClose,
  onRequested,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; rect: DOMRect } | null>(null);

  const [info, setInfo] = useState<VideoDetectionsInfo | null>(null);
  const [doc, setDoc] = useState<VideoDetectionsDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [regions, setRegions] = useState<ManualRegionDraft[]>([]);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── 검출 기록 로드 ──────────────────────────────────────────────────────────
  //
  // 처리 중에 열렸다면 끝날 때까지 다시 조회한다. 한 번만 받고 말면 처리가 끝난 뒤에도
  // "처리 중입니다"가 화면에 남아, 사용자는 닫았다 다시 열기 전까지 영영 막힌다.
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    GetVideoDetections(fileId)
      .then((detInfo) => {
        if (cancelled) return;
        setInfo(detInfo);
        if (detInfo.document) setDoc(detInfo.document);

        // 이미 적용돼 있는 보정을 그대로 되살린다. 이걸 하지 않으면 두 번째 보정에서
        // 편집기가 빈 상태로 열리고, 사용자가 새 구간 하나만 그려 적용하는 순간
        // 이전 구간이 조용히 사라진다.
        const applied = detInfo.appliedCorrection;
        if (applied) {
          setRegions(applied.regions.map((r, i) => ({ ...r, id: -(i + 1) })));
          setExcluded(new Set(applied.excludedIds));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "검출 기록을 불러오지 못했습니다",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, reload]);

  // 처리가 끝나면 스스로 멈춘다. 영구적인 차단 사유(보존 만료 등)는 다시 물어도 같으므로
  // processing 일 때만 돈다.
  useEffect(() => {
    if (!info?.processing) return;
    const timer = setTimeout(() => setReload((n) => n + 1), 4000);
    return () => clearTimeout(timer);
  }, [info, reload]);

  /**
   * 이미 로드된 영상의 길이를 따로 읽어 온다.
   *
   * <p>부모가 넘겨주는 것은 이미 내려받아 둔 blob URL 이라, 이 element 가 마운트되는
   * 시점에 대개 메타데이터가 이미 준비돼 있다. 그러면 `loadedmetadata` 는 이미 지나가
   * 다시 발생하지 않고, 이벤트에만 기대면 길이가 0 으로 남아 스크러버가 죽는다.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.readyState >= 1 && Number.isFinite(v.duration)) {
      setDuration(v.duration);
    }
  }, [videoUrl]);

  const frameRate = doc?.frame_rate ?? 30;
  const natural = useMemo(
    () => (doc ? { w: doc.width, h: doc.height } : null),
    [doc],
  );

  /**
   * 현재 시각에 해당하는 자동 검출.
   *
   * <p>프레임 인덱스로 정확히 찾는다. 시간으로 근사하면 재생 위치와 박스가 한 프레임씩
   * 어긋나 보여서, 사용자가 "박스가 얼굴을 안 따라간다"고 느낀다.
   */
  const frameIndex = Math.round(currentTime * frameRate);
  const autoBoxes = useMemo(() => {
    if (!doc) return [];
    const entry = doc.frames.find(([index]) => index === frameIndex);
    return entry ? entry[1] : [];
  }, [doc, frameIndex]);

  /** 현재 시각에 걸쳐 있는 수동 구간만 보여 준다. */
  const activeRegions = useMemo(() => {
    const ms = currentTime * 1000;
    return regions.filter((r) => ms >= r.startMs && ms <= r.endMs);
  }, [regions, currentTime]);

  // ── 박스 그리기 ─────────────────────────────────────────────────────────────
  const toStagePercent = useCallback((clientX: number, clientY: number, rect: DOMRect) => ({
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  }), []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!stageRef.current || !natural) return;
    const rect = stageRef.current.getBoundingClientRect();
    const start = toStagePercent(e.clientX, e.clientY, rect);
    dragRef.current = { x: start.x, y: start.y, rect };
    setDraft({ x: start.x, y: start.y, w: 0, h: 0 });
  };

  useEffect(() => {
    if (!draft) return;

    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = toStagePercent(e.clientX, e.clientY, drag.rect);
      setDraft({
        x: Math.min(drag.x, p.x),
        y: Math.min(drag.y, p.y),
        w: Math.abs(p.x - drag.x),
        h: Math.abs(p.y - drag.y),
      });
    };

    const onUp = () => {
      const current = draft;
      dragRef.current = null;
      setDraft(null);
      // 클릭에 가까운 미세 드래그는 박스로 치지 않는다 — 자동 검출을 지우려다
      // 실수로 만든 1픽셀짜리 구간이 쌓이면 목록만 지저분해진다.
      if (!current || current.w < 1.5 || current.h < 1.5 || !natural) return;

      const startMs = Math.round(currentTime * 1000);
      const endMs = Math.round(Math.min(duration, currentTime + DEFAULT_REGION_SECONDS) * 1000);
      setRegions((prev) => [
        ...prev,
        {
          id: Date.now(),
          x: Math.round((current.x / 100) * natural.w),
          y: Math.round((current.y / 100) * natural.h),
          w: Math.round((current.w / 100) * natural.w),
          h: Math.round((current.h / 100) * natural.h),
          startMs,
          endMs: Math.max(endMs, startMs + 100),
        },
      ]);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draft, currentTime, duration, natural, toStagePercent]);

  const toggleExcluded = (id: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateRegionTime = (id: number, key: "startMs" | "endMs", seconds: number) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: Math.round(seconds * 1000) } : r)),
    );
  };

  const removeRegion = (id: number) =>
    setRegions((prev) => prev.filter((r) => r.id !== id));

  const apply = async () => {
    if (excluded.size === 0 && regions.length === 0) {
      // 이미 보정이 적용된 파일에서 전부 지운 것은 "보정 해제"라는 유효한 의사다.
      // 다만 자동 검출만 남은 상태로 되돌리는 것이므로 확인을 위해 문구를 나눈다.
      if (info?.appliedCorrection) {
        toast.error("모두 지우면 되돌릴 내용이 없습니다. 구간을 하나 이상 남기거나 취소하세요");
      } else {
        toast.error("변경한 내용이 없습니다");
      }
      return;
    }
    setSubmitting(true);
    try {
      // 서버 계약에는 id 가 없다 — 화면에서 목록을 다루기 위한 로컬 키일 뿐이다.
      await RequestVideoManualCorrection(
        fileId,
        regions.map((r) => ({
          x: r.x, y: r.y, w: r.w, h: r.h, startMs: r.startMs, endMs: r.endMs,
        })),
        Array.from(excluded),
      );
      toast.success("수동 보정을 시작했습니다. 완료까지 몇 분 걸립니다");
      onRequested();
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? "보정 요청에 실패했습니다";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const blocked = info && !info.correctable ? info.unavailableReason : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-lg bg-white">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-[#1f2330]">{fileName}</h2>
            <p className="text-xs text-gray-500">
              자동 검출을 클릭하면 제외되고, 드래그하면 가릴 구간을 추가합니다
            </p>
          </div>
          <button onClick={onClose} className="px-2 text-xl text-gray-400 hover:text-gray-700">
            ×
          </button>
        </header>

        {info?.appliedCorrection && (
          <div className="border-b bg-blue-50 px-5 py-2 text-sm text-blue-800">
            이전 보정({new Date(info.appliedCorrection.appliedAt).toLocaleString("ko-KR")})을 불러왔습니다 ·
            구간 {info.appliedCorrection.regions.length}개, 제외 {info.appliedCorrection.excludedIds.length}개
            <span className="ml-1 text-blue-600">
              — 여기서 지우면 다음 적용 때 그 구간은 가려지지 않습니다
            </span>
          </div>
        )}
        {blocked && (
          <div className="border-b bg-amber-50 px-5 py-2 text-sm text-amber-800">{blocked}</div>
        )}
        {loadError && (
          <div className="border-b bg-red-50 px-5 py-2 text-sm text-red-700">{loadError}</div>
        )}
        {info && !info.available && !loadError && (
          <div className="border-b bg-gray-50 px-5 py-2 text-sm text-gray-600">
            {info.unavailableReason ?? "검출 기록이 없어 자동 검출을 표시할 수 없습니다"}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5 lg:flex-row">
          {/* 재생 + 박스 오버레이 */}
          <div className="flex-1">
            <div
              ref={stageRef}
              onMouseDown={onMouseDown}
              className="relative w-full select-none bg-black"
              style={{ cursor: "crosshair", aspectRatio: natural ? `${natural.w} / ${natural.h}` : "16 / 9" }}
            >
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="absolute inset-0 h-full w-full"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onSeeked={(e) => setCurrentTime(e.currentTarget.currentTime)}
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">
                  영상을 불러오는 중…
                </div>
              )}

              {/* 자동 검출 — 클릭해서 제외/복구 */}
              {natural && autoBoxes.map((box) => {
                const [id, cls, conf, x1, y1, x2, y2] = box;
                const off = excluded.has(id);
                return (
                  <button
                    key={id}
                    title={`${cls} ${(conf * 100).toFixed(0)}% — 클릭하면 ${off ? "다시 가림" : "가리지 않음"}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => toggleExcluded(id)}
                    className="absolute"
                    style={{
                      left: `${(x1 / natural.w) * 100}%`,
                      top: `${(y1 / natural.h) * 100}%`,
                      width: `${((x2 - x1) / natural.w) * 100}%`,
                      height: `${((y2 - y1) / natural.h) * 100}%`,
                      border: off ? "2px dashed #9ca3af" : "2px solid #ef4444",
                      background: off ? "transparent" : "rgba(239,68,68,0.15)",
                    }}
                  />
                );
              })}

              {/* 수동 구간 */}
              {natural && activeRegions.map((r) => (
                <div
                  key={r.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${(r.x / natural.w) * 100}%`,
                    top: `${(r.y / natural.h) * 100}%`,
                    width: `${(r.w / natural.w) * 100}%`,
                    height: `${(r.h / natural.h) * 100}%`,
                    border: "2px solid #2563eb",
                    background: "rgba(37,99,235,0.2)",
                  }}
                />
              ))}

              {/* 그리는 중 */}
              {draft && (
                <div
                  className="absolute pointer-events-none border-2 border-dashed border-blue-400"
                  style={{
                    left: `${draft.x}%`,
                    top: `${draft.y}%`,
                    width: `${draft.w}%`,
                    height: `${draft.h}%`,
                  }}
                />
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (v.paused) v.play();
                  else v.pause();
                }}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                재생/일시정지
              </button>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={1 / (frameRate || 30)}
                value={currentTime}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = t;
                  setCurrentTime(t);
                }}
                className="flex-1"
              />
              <span className="tabular-nums">
                {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* 사이드 패널 */}
          <aside className="w-full shrink-0 lg:w-[320px]">
            <div className="mb-3 rounded border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">현재 프레임 자동 검출</span>
                <span className="font-semibold">{autoBoxes.length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">제외한 검출</span>
                <span className="font-semibold text-gray-700">{excluded.size}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">추가한 구간</span>
                <span className="font-semibold text-blue-600">{regions.length}개</span>
              </div>
            </div>

            <div className="max-h-[320px] overflow-auto rounded border">
              {regions.length === 0 ? (
                <p className="p-3 text-xs text-gray-400">
                  화면을 드래그하면 가릴 구간이 추가됩니다
                </p>
              ) : (
                regions.map((r, i) => (
                  <div key={r.id} className="border-b p-3 text-xs last:border-b-0">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">구간 {i + 1}</span>
                      <button
                        onClick={() => removeRegion(r.id)}
                        className="text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mb-1 text-gray-500">
                      {r.w}×{r.h}px @ ({r.x}, {r.y})
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" step="0.1" min={0} max={duration}
                        value={(r.startMs / 1000).toFixed(1)}
                        onChange={(e) => updateRegionTime(r.id, "startMs", Number(e.target.value))}
                        className="w-16 rounded border px-1 py-0.5"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="number" step="0.1" min={0} max={duration}
                        value={(r.endMs / 1000).toFixed(1)}
                        onChange={(e) => updateRegionTime(r.id, "endMs", Number(e.target.value))}
                        className="w-16 rounded border px-1 py-0.5"
                      />
                      <span className="text-gray-400">초</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-between border-t px-5 py-3">
          <p className="text-xs text-gray-500">
            보정은 <b>원본에서 다시</b> 비식별화합니다. 완료까지 몇 분 걸립니다
            {info?.retainUntil && ` · 원본 보존 ${new Date(info.retainUntil).toLocaleDateString("ko-KR")}까지`}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
              취소
            </button>
            <button
              onClick={apply}
              disabled={submitting || Boolean(blocked)}
              className="rounded bg-[#1f2a52] px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {submitting ? "요청 중…" : "보정 적용"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
