"use client";

import { useEffect, useState } from "react";
import { GetVideoPlayUrl } from "@/lib/api";
import { useAuthedImage } from "./useAuthedImage";

export interface VideoSource {
  /** `<video src>` 에 넣을 URL. 아직 준비되지 않았으면 null */
  src: string | null;
  isLoading: boolean;
  isError: boolean;
  /**
   * 어떤 경로로 받았는지.
   *
   * - `stream`: presigned URL. 즉시 재생되고 구간 이동도 된다.
   * - `blob`: 전체를 내려받은 뒤 재생. 느리지만 NAS·암호화 파일에는 이 길뿐이다.
   *
   * 화면이 이 값을 보고 blob 일 때만 "불러오는 중" 안내를 띄울 수 있다.
   */
  mode: "stream" | "blob" | null;
}

/**
 * 영상을 재생 가능한 src 로 바꾼다. 가능하면 스트리밍, 아니면 blob.
 *
 * <p><b>왜 이 훅이 필요한가.</b> 원래는 영상도 {@link useAuthedImage} 를 그대로 썼다.
 * 그 훅은 인증이 필요한 URL 을 blob 으로 통째로 받아 object URL 을 만드는데, 이미지는
 * 수백 KB 라 문제가 없었지만 영상은 수백 MB 다. 158MB 짜리 블랙박스 영상이면 다 받을
 * 때까지 src 가 null 이라 화면에는 재생기 대신 대체 UI 만 보이고, 구간 이동도 되지
 * 않으며, 그 바이트가 전부 브라우저 메모리에 올라간다.
 *
 * <p>백엔드가 주는 presigned URL 은 서명이 쿼리스트링에 있어 인증 헤더가 필요 없다.
 * S3 가 Range 요청에 직접 응답하므로 브라우저가 필요한 구간만 받아 즉시 재생한다.
 *
 * <p>blob 경로를 지우지 않고 남겨 둔다. NAS 저장이나 봉투 암호화 파일은 presigned URL 로
 * 읽을 수 없어서, 그 경우엔 느리더라도 재생되는 편이 아무것도 안 나오는 것보다 낫다.
 *
 * @param fileId   파일 식별자. null 이면 아무것도 하지 않는다(모달이 닫혀 있을 때 등).
 * @param fallbackUrl 백엔드가 내려준 파일 URL. presigned 발급이 안 될 때 쓴다.
 */
export function useVideoSource(
  fileId: string | null | undefined,
  fallbackUrl: string | null | undefined,
): VideoSource {
  /**
   * 판정 결과. 어떤 파일의 결과인지 함께 들고 있어야 한다 — fileId 가 막 바뀐 프레임에서
   * 이전 파일의 URL 로 잠깐 재생되는 것을 막는다. (useAuthedImage 와 같은 방식이다.)
   */
  const [resolved, setResolved] = useState<{ fileId: string; url: string | false } | null>(null);

  useEffect(() => {
    if (!fileId) return;

    let cancelled = false;
    GetVideoPlayUrl(fileId)
      .then((info) => {
        if (cancelled) return;
        setResolved({ fileId, url: info.available && info.url ? info.url : false });
      })
      .catch(() => {
        // 구버전 백엔드에는 이 엔드포인트가 없다. 재생 자체를 막을 이유는 없으므로
        // 조용히 blob 경로로 물러선다.
        if (!cancelled) setResolved({ fileId, url: false });
      });

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  // 결과가 지금 파일의 것일 때만 인정한다.
  const streamUrl = resolved !== null && resolved.fileId === fileId ? resolved.url : null;

  // blob 경로는 presigned 가 불가능하다고 판정된 뒤에만 켠다. 조건 없이 켜면 두 경로가
  // 동시에 돌아 수백 MB 를 불필요하게 내려받는다.
  const blob = useAuthedImage(streamUrl === false ? fallbackUrl : null);

  if (typeof streamUrl === "string") {
    return { src: streamUrl, isLoading: false, isError: false, mode: "stream" };
  }
  if (streamUrl === false) {
    return { src: blob.src, isLoading: blob.isLoading, isError: blob.isError, mode: "blob" };
  }
  return { src: null, isLoading: Boolean(fileId), isError: false, mode: null };
}
