"use client";

import { useEffect, useState } from "react";
import { ApiClient, toFileApiPath } from "@/lib/api";

export interface AuthedImage {
  /** <img src> 에 넣을 URL. 아직 준비되지 않았거나 실패하면 null */
  src: string | null;
  isLoading: boolean;
  isError: boolean;
}

/** 특정 경로에 대한 내려받기 결과. path 를 함께 들고 있어야 이전 URL 의 결과를 재사용하지 않는다. */
interface FetchedImage {
  path: string;
  src: string | null;
  isError: boolean;
}

/**
 * 인증이 필요한 파일 URL 을 blob 으로 받아 화면에 바로 쓸 수 있는 object URL 로 바꾼다.
 *
 * <img src="/api/files/{id}"> 처럼 직접 넣으면 브라우저가 만드는 요청에는 Axios 인터셉터가
 * 붙여 주는 Authorization 헤더가 실리지 않는다. 액세스 토큰은 쿠키가 아니라 인메모리
 * 스토어에 있어 자동으로 따라가지도 않으므로, 게이트웨이의 Jwt 필터가 401 로 막고
 * 이미지가 깨진다. S3 저장 파일은 서명이 쿼리스트링에 담긴 presigned URL 이라 문제가
 * 없었지만, NAS 저장 파일은 백엔드 API 주소가 그대로 내려오기 때문에 반드시 이 훅을 거쳐야 한다.
 *
 * presigned URL·blob:·data: 처럼 인증이 필요 없는 URL 은 내려받지 않고 그대로 통과시킨다.
 *
 * @param url 백엔드가 내려준 파일 URL (`file.url`, `file.thumbnail` 등)
 * @returns 화면에 바로 넣을 수 있는 src 와 로딩/실패 상태
 */
export function useAuthedImage(url: string | null | undefined): AuthedImage {
  // 인증이 필요 없는 URL 이면 apiPath 가 null 이 되고, 내려받지 않고 그대로 쓴다.
  const apiPath = toFileApiPath(url);
  const passthroughSrc = url && !apiPath ? url : null;

  const [fetched, setFetched] = useState<FetchedImage | null>(null);

  useEffect(() => {
    if (!apiPath) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    ApiClient.get(apiPath, {
      responseType: "blob",
      // 미리보기 요청임을 알려 Content-Disposition 을 inline 으로 받고,
      // 감사 로그에도 다운로드가 아닌 열람으로 기록되게 한다.
      params: { disposition: "inline" },
    })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data as Blob);
        setFetched({ path: apiPath, src: objectUrl, isError: false });
      })
      .catch(() => {
        if (cancelled) return;
        setFetched({ path: apiPath, src: null, isError: true });
      });

    return () => {
      // url 이 바뀌거나 언마운트되면 이전 blob 을 즉시 반환한다.
      // 목록 화면은 카드마다 이 훅을 쓰므로 회수하지 않으면 메모리가 계속 늘어난다.
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [apiPath]);

  // 결과가 현재 경로의 것일 때만 인정한다. url 이 막 바뀐 프레임에서 이전 이미지가
  // 잠깐 보이거나, 이미 revoke 된 object URL 을 그리는 것을 막는다.
  const settled = fetched !== null && fetched.path === apiPath;

  return {
    src: passthroughSrc ?? (settled ? fetched.src : null),
    isLoading: apiPath !== null && !settled,
    isError: settled && fetched.isError,
  };
}
