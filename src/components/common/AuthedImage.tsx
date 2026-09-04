"use client";

import type { ImgHTMLAttributes, ReactNode } from "react";
import { useAuthedImage } from "@/hooks/useAuthedImage";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** 백엔드가 내려준 파일 URL. NAS 저장 파일이면 인증 요청으로 받아온다. */
  src: string | null | undefined;
  /** src 가 없거나 불러오지 못했을 때 대신 그릴 내용 */
  fallback?: ReactNode;
}

/**
 * 인증이 필요한 파일 URL 도 안전하게 그리는 <img> 대체 컴포넌트.
 *
 * 목록·캐러셀처럼 map 안에서 그리는 자리에서는 훅을 직접 쓸 수 없으므로
 * 이 컴포넌트를 쓴다. 동작 근거는 {@link useAuthedImage} 참고.
 */
export default function AuthedImage({ src, fallback = null, alt = "", ...imgProps }: Props) {
  const { src: resolved, isError } = useAuthedImage(src);

  if (!resolved || isError) return <>{fallback}</>;

  return <img src={resolved} alt={alt} {...imgProps} />;
}
