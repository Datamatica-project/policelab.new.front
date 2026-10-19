# PoliceLab Frontend (`policelab.new.front`)

> 폴리스랩 3.0 — 지능형 교통사고 현장 데이터 처리 및 스마트 분석 시스템의 웹 프론트엔드

경찰 사건 현장의 이미지·영상을 **사건(Case) 단위로 등록·관리**하는 대시보드입니다. 사건을 만들고 파일을 올리면 백엔드가 얼굴·번호판을 자동 비식별화하고, 사용자는 그 결과를 원본과 비교해 검수한 뒤 필요한 영역을 **수동 모자이크**로 보정해 저장합니다. 영상은 비동기로 처리되므로 처리 상태를 폴링해 보여 주고, 완료되면 스트리밍으로 재생합니다.

이 리포는 **프론트엔드 애플리케이션 코드만** 담고 있습니다. 시스템 전체 아키텍처, 백엔드 서비스, Gateway 라우팅, k3s·ArgoCD 배포는 GitOps 리포 [**policelab.projects**](https://github.com/Datamatica-project/policelab.projects) 의 README를 참고하세요.

---

## 목차

- [기술 스택](#기술-스택)
- [화면 구성](#화면-구성)
- [주요 기능](#주요-기능)
- [인증 처리](#인증-처리)
- [API 연동](#api-연동)
- [환경 변수](#환경-변수)
- [로컬 개발](#로컬-개발)
- [배포 (Vercel)](#배포-vercel)
- [디렉터리 구조](#디렉터리-구조)
- [브랜치 전략](#브랜치-전략)
- [주의사항](#주의사항)

---

## 기술 스택

| 분류 | 사용 기술 | 버전 |
|------|-----------|------|
| 프레임워크 | Next.js (App Router) | 16.2.6 |
| UI 런타임 | React / React DOM | 19.2.4 |
| 언어 | TypeScript (`strict`) | ^5 |
| 스타일 | Tailwind CSS (`@tailwindcss/postcss`), `tw-animate-css` | ^4 |
| UI 컴포넌트 | shadcn (`base-nova` 스타일) + `@base-ui/react` 프리미티브, `lucide-react` 아이콘 | shadcn ^4.7.0 / base-ui ^1.5.0 |
| 상태 관리 | Zustand (`persist` 미들웨어) | ^5.0.13 |
| HTTP | axios | ^1.16.1 |
| 차트 | Recharts | ^3.8.1 |
| 알림 | sonner (Toast) | ^2.0.7 |
| 압축 다운로드 | JSZip | ^3.10.1 |
| 폰트 | `next/font/google` — Noto Sans KR | — |
| Lint | ESLint 9 + `eslint-config-next` (core-web-vitals, typescript) | 16.2.6 |

> `konva` / `react-konva`, `react-hook-form`, `babel-plugin-react-compiler` 는 `package.json` 에 선언되어 있지만 현재 소스에서 사용하지 않습니다. 수동 모자이크 편집기는 Konva가 아니라 DOM 오버레이 + 마우스 이벤트로 구현되어 있습니다.

---

## 화면 구성

App Router의 Route Group으로 인증 전/후 화면을 나눕니다. `(main)` 그룹은 공통 레이아웃(좌측 `Sidebar` + `Footer`)을 사용합니다.

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `src/app/page.tsx` | 서버 `redirect` 로 `/dashboard` 이동 |
| `/login` | `src/app/(auth)/login/page.tsx` | 로그인, 아이디 저장 |
| `/signup` | `src/app/(auth)/signup/page.tsx` | 회원가입 (프로필: 소속·부서·계급·역할) |
| `/dashboard` | `src/app/(main)/dashboard/page.tsx` | 사건·업로드 통계, 차트, 최근 사건 |
| `/cases` | `src/app/(main)/cases/page.tsx` | 사건 목록 (서버 측 검색·필터·정렬·페이지네이션) |
| `/cases/new` | `src/app/(main)/cases/new/page.tsx` | 새 사건 생성 4단계 마법사 (정보 → 업로드 → 검수 → 완료) |
| `/cases/[id]` | `src/app/(main)/cases/[id]/page.tsx` | 사건 상세 — 파일 목록, 미리보기, 다운로드, 상태 변경 |

---

## 주요 기능

### 대시보드
- 상태 카드: 진행중 사건 / 종료된 사건 / 오늘 업로드 / 공유받은 사건
- **최근 7일 파일 업로드 추이** (막대 차트), **카테고리 분포** (파이 차트) — `GET /api/files/dashboard`
- 최근 사건 10건 목록, 새 사건 바로가기

### 사건 목록 (`/cases`)
- 범위 탭: 전체 / 내 사건 / 공유받은 사건 (`typeShare=ALL|OWNED|SHARED`)
- 검색(제목·담당자·전체), 상태 필터(진행중·사건종료), 정렬(최신·오래된·제목)을 **모두 서버로 전달** — 받아 온 페이지만 화면에서 거르면 다른 페이지의 결과가 누락되기 때문
- 검색어 입력은 `useDebouncedCallback` 으로 디바운스
- 서버 페이지 응답(`{content, page:{...}}` 또는 최상위 `totalPages` 형태)을 `normalizeCasePage` 로 한 형태로 정규화
- 사건 카드 메뉴: 수정(`CaseEditModal`), 공유(`CaseShareModal`), 삭제(확인 다이얼로그)

### 새 사건 생성 (`/cases/new`, 4단계)

| 단계 | 내용 |
|------|------|
| 1. 사건 정보 | 사건번호(디바운스 중복 확인 `GET /api/cases/exists`), 사건명, 설명, 담당자(등록 사용자 중 선택 — `AssigneePicker`) |
| 2. 파일 업로드 | 이미지·영상 다중 선택(`image/*,video/*`), 파일별 카테고리(증거 자료·현장 사진·기타)·태그·설명·보관 정책(표준=S3 / 내부=NAS), 일괄 적용 |
| 3. 처리 및 결과 | 자동 비식별화 결과 검수 — 이미지는 원본/결과 **드래그 비교 슬라이더**와 검출 요약(얼굴·번호판 개수, 최대 신뢰도), 영상은 처리 진행률·결과 재생·검출 요약. 이미지/영상 수동 보정 편집기 진입 |
| 4. 완료 | 수동 모자이크 결과를 교체 저장하고 **용량 변화**(원본 대비 증감, 부호 포함)를 표시, 결과물 + `metadata.json` 을 ZIP으로 다운로드 |

- 2→3단계 진입 시 `POST /api/cases` 로 사건을 먼저 만들고 파일을 업로드합니다.
- 3·4단계 진행 상태는 **새로고침에 대비해 저장**됩니다 (`src/lib/caseSession.ts`).
  - 사건 정보·파일 메타·검수 박스 → `sessionStorage` (`new-case-draft`)
  - 원본 파일·수동 모자이크 결과 Blob → **IndexedDB** (`policelab-uploads` / `original-files`)

### 파일 업로드 — S3 Presigned 직접 업로드

보관 정책에 따라 업로드 경로가 나뉩니다.

| 보관 정책 | 경로 | 구현 |
|-----------|------|------|
| 표준 (S3) | 브라우저 → **S3 직접 PUT** | `src/lib/directUpload.ts` |
| 내부 (NAS) | 브라우저 → Gateway → File Service (multipart) | `PostFiles` (`POST /api/files/upload`) |

S3 직접 업로드 흐름:

```
POST /api/files/upload/init   (배치 1회, 파일별 presigned PUT URL 예약)
        │
        ▼
PUT <presigned uploadUrl>     (파일별, 기본 동시 4개, 업로드 진행률 표시)
        │
        ▼
POST /api/files/upload/{fileId}/complete   (파일별 — 서버가 비식별화·저장 마무리)
```

- S3 PUT은 **bare axios** 로 보냅니다. `ApiClient` 가 붙이는 `Authorization` 헤더·`baseURL` 이 섞이면 서명 불일치로 거부됩니다.
- `Content-Type` 은 `init` 에 보낸 값과 같아야 합니다 (presigned 서명에 포함됨).
- 결과는 요청 순서가 아니라 task `id` 로 대응시킵니다 (PUT 완료 순서가 뒤섞일 수 있음).

### 수동 모자이크 · 교체 저장
- **이미지** (`ManualEditModal`): 드래그로 영역 지정, 실행 취소/다시 실행, 자동 검출 박스 함께 표시. 좌표는 화면 % → 원본 픽셀로 환산해 `POST /proxy-mosaic/blur_boxes` (User Blur Service) 로 보내고, 결과 Blob을 IndexedDB에 보관합니다.
- 4단계에서 교체 대상(영상·처리 중 파일 제외)을 저장합니다. S3 파일은 `src/lib/directReplace.ts` (`/api/files/replace/init` → S3 PUT → `/api/files/replace/{fileId}/complete`), NAS 파일은 `POST /api/files/replace` multipart.
- **영상** (`VideoManualEditModal`): 시간 축이 있는 보정 편집기. 자동 검출(빨강)은 클릭해 제외, 수동 구간(파랑)은 `x,y,w,h` + `startMs~endMs` 로 지정합니다. 검출 기록은 `GET /api/files/{id}/detections`, 적용은 `POST /api/files/{id}/anonymize/manual` (202 접수 후 처리 상태 폴링). 보정은 누적이 아니라 원본에서 다시 그리는 방식이라, 편집기는 **현재 적용된 보정(`appliedCorrection`)으로 시작**합니다.

### 영상 처리 상태 · 재생
- 처리 상태 값은 백엔드 `FileProcessingStatus` 와 1:1 대응합니다 (`src/lib/fileStatus.ts`).

  | 상태 | 의미 | 화면 처리 |
  |------|------|-----------|
  | `UPLOADED` / `COMPRESSED` / `REPLACED` | 처리 완료 | 열람 가능 |
  | `ANONYMIZING` | 영상 비식별화 진행 중 | "비식별화 중" 배지 + 진행률, 열람·다운로드 차단 |
  | `PENDING_UPLOAD` | presigned 자리만 예약됨 | "업로드 대기" 배지 |
  | `ANONYMIZATION_FAILED` | 비식별화 최종 실패(격리) | "비식별화 실패" 배지, 열람 차단 |

- `useFileProcessingPoll`: 처리 중인 파일만 `GET /api/files/{id}/detail` 로 **5초 주기** 폴링합니다. 백그라운드 탭에서는 건너뛰고, 연속 5회 실패하면 해당 파일 폴링을 멈춥니다. 마운트 시 1회는 전체 파일을 조회해 갱신된 크기·URL을 반영합니다.
- `useVideoSource`: `GET /api/files/{id}/play-url` 로 presigned URL을 받아 **즉시 스트리밍 재생**(Range 요청, 구간 이동 가능)합니다. NAS 저장·봉투 암호화 등으로 presigned가 불가하면 인증 요청으로 전체를 받아 Blob URL로 재생합니다.

### 사건 상세 (`/cases/[id]`)
- 파일 목록(페이지당 12개), 파일명 검색, 정렬(최신·오래된·제목)
- 이미지·영상 미리보기, 개별 다운로드, **선택 파일 ZIP 일괄 다운로드** (처리 중·격리 파일은 자동 제외)
- 상태 전환 드롭다운: 진행중 ↔ 사건종료 (`PATCH /api/cases/{id}/status`, 종료 시 확인 다이얼로그). 종료된 사건은 수정·파일 추가가 서버에서 막힙니다.

### 사건 공유
- `CaseShareModal` 에서 등록 사용자(`GET /api/auth/users`)를 골라 `POST /api/cases/{id}/shares` 로 공유합니다. 공유받은 사건은 목록의 "공유받은 사건" 탭과 대시보드 카드에 집계됩니다.

### 공통
- 인증이 필요한 파일 URL(NAS 저장 파일 등)은 `<img src>` 로 직접 넣으면 `Authorization` 헤더가 실리지 않아 401이 납니다. `useAuthedImage` / `AuthedImage` 가 `ApiClient` 로 Blob을 받아 Object URL로 바꾸고, 언마운트 시 `revokeObjectURL` 합니다. presigned URL·`blob:`·`data:` 는 그대로 통과합니다.
- 백엔드가 내려준 절대 URL(`SERVER_DOWNLOAD_URL + /api/files/{id}`)은 `toFileApiPath` 로 `/api/files/...` 상대 경로로 바꿔 다시 `ApiClient` 로 보냅니다 (Mixed Content·프록시 우회 방지).
- 서버 오류 메시지는 `getApiErrorMessage` 로 꺼내 그대로 토스트에 표시합니다 (File Service `{code, message}`, Auth Service `{resultCode, errorCode, message, data}` 모두 `message` 사용).

---

## 인증 처리

| 항목 | 구현 |
|------|------|
| Access Token | 로그인 응답의 `accessToken` 을 **Zustand 스토어 메모리에만** 보관 (`authStore`). `persist` 의 `partialize` 로 `email` 만 `localStorage`(`auth-storage`)에 저장하고 토큰은 저장하지 않음 |
| Refresh Token | 백엔드가 설정하는 HttpOnly 쿠키 `refreshToken`. `ApiClient` 는 `withCredentials: true` |
| 요청 헤더 | `ApiClient`·`MosaicApi` 요청 인터셉터가 `Authorization: Bearer <token>` 부착 |
| 토큰 재발급 | 응답 인터셉터가 401을 받으면 `GET /api/auth/refresh` 후 원 요청을 1회 재시도. 동시에 여러 요청이 401을 받아도 **재발급은 한 번만** 나가도록 진행 중인 Promise를 공유 (`refreshInFlight`). `/auth/login`·`/auth/refresh` 자체의 401은 재시도하지 않음 |
| 세션 만료 | 재발급 실패 시 스토어를 비우고 `/login` 으로 이동 |
| 라우트 보호 | `src/middleware.ts` 가 렌더링 전에 `refreshToken` 쿠키 존재 여부만 확인. 보호 경로(`/dashboard`, `/cases` 등)에 쿠키가 없으면 `/login`, 쿠키가 있는 상태로 `/login` 접근 시 `/dashboard` 로 리다이렉트 |
| 새로고침 | 메모리 토큰이 사라지므로 첫 API 호출이 401 → refresh 로 자동 복구 |
| 로그인 직후 | 라우터 캐시에 남은 리다이렉트를 피하려고 `router.replace` 대신 `window.location.replace("/dashboard")` 로 하드 내비게이션 |
| 로그아웃 | `POST /api/auth/logout` 후 스토어 초기화. 서버 호출이 실패해도 브라우저 세션은 종료 |

> 미들웨어가 `refreshToken` 쿠키를 읽으려면 쿠키가 **프론트엔드 오리진**에 설정되어야 합니다. 그래서 운영에서는 API를 다른 도메인으로 직접 부르지 않고, 아래의 rewrites 프록시로 같은 오리진처럼 호출합니다.

---

## API 연동

### 클라이언트

`src/lib/api.ts` 에 axios 인스턴스 두 개와 모든 API 함수가 모여 있습니다.

| 인스턴스 | `baseURL` | 용도 |
|----------|-----------|------|
| `ApiClient` | `NEXT_PUBLIC_API_URL` | Gateway를 거치는 모든 API (`/api/auth`, `/api/cases`, `/api/files`) |
| `MosaicApi` | `NEXT_PUBLIC_MOSAIC_API_URL` | 수동 모자이크 `POST /blur_boxes` (User Blur Service) |

### Rewrites 프록시

`next.config.ts` (그리고 Vercel용으로 동일 내용의 `vercel.json`)에 다음 rewrites가 정의되어 있습니다.

| 프론트 경로 | 프록시 대상 | 비고 |
|-------------|-------------|------|
| `/api/:path*` | `<운영 Gateway 주소>/api/:path*` | Gateway가 서비스별로 라우팅 |
| `/proxy-mosaic/:path*` | `<운영 Gateway 주소>/api/mosaic/:path*` | Gateway가 `/api/mosaic` 접두어를 제거해 User Blur Service로 전달 |

- `NEXT_PUBLIC_API_URL` 이 **비어 있으면** `ApiClient` 가 상대 경로(`/api/...`)로 요청하므로 rewrites를 타고, 쿠키도 프론트 오리진에 붙습니다.
- `MosaicApi` 는 `NEXT_PUBLIC_MOSAIC_API_URL` 에 `/proxy-mosaic` 를 주면 `/proxy-mosaic/blur_boxes` → Gateway `/api/mosaic/blur_boxes` 로 흐릅니다. Mosaic 요청에도 JWT가 붙으므로 Gateway 인증을 통과합니다.
- S3 presigned URL(업로드 PUT, 영상 재생)은 프록시를 거치지 않고 브라우저가 S3와 직접 통신합니다.

### 로컬 백엔드(`http://localhost:8000`)에 붙이기

**방법 A — rewrites 대상 변경 (권장)**

`next.config.ts` 의 두 `destination` 에서 운영 Gateway 주소를 `http://localhost:8000` 으로 바꾸고, `NEXT_PUBLIC_API_URL` 은 비워 둡니다.

```ts
// next.config.ts (로컬 전용 — 커밋하지 마세요)
{ source: "/api/:path*",          destination: "http://localhost:8000/api/:path*" },
{ source: "/proxy-mosaic/:path*", destination: "http://localhost:8000/api/mosaic/:path*" },
```

```bash
# .env.local
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_MOSAIC_API_URL=/proxy-mosaic
```

**방법 B — 절대 주소로 직접 호출**

`.env.local` 에 Gateway 절대 주소(`http://localhost:8000`, Mosaic은 `http://localhost:8000/api/mosaic`)를 넣으면 rewrites를 거치지 않고 브라우저가 Gateway를 직접 호출합니다. 이 경우 Gateway의 `CORS_ALLOWED_ORIGINS` 에 `http://localhost:3000` 이 포함되어 있어야 합니다. (`docker-compose-video-test.yml` 의 `new_front` 컨테이너가 이 방식을 기본값으로 씁니다.)

> `NEXT_PUBLIC_*` 값은 **빌드(또는 dev 서버 기동) 시점에 번들에 박힙니다.** 값을 바꾼 뒤에는 dev 서버를 재시작하거나 다시 빌드해야 합니다.

### 사용 API 요약

| 영역 | 엔드포인트 |
|------|------------|
| 인증 | `POST /api/auth/login`, `POST /api/auth/join`, `GET /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/users` |
| 사건 | `GET/POST /api/cases`, `GET/PUT/DELETE /api/cases/{id}`, `PATCH /api/cases/{id}/status`, `GET /api/cases/exists`, `POST /api/cases/{id}/shares` |
| 업로드 | `POST /api/files/upload`, `POST /api/files/upload/init`, `POST /api/files/upload/{id}/complete` |
| 교체 | `POST /api/files/replace`, `POST /api/files/replace/init`, `POST /api/files/replace/{id}/complete` |
| 파일 | `GET /api/files/{id}` (`?disposition=inline` 미리보기), `GET /api/files/{id}/detail`, `GET /api/files/{id}/play-url`, `GET /api/files/{id}/detections`, `POST /api/files/{id}/anonymize/manual`, `GET /api/files/dashboard` |
| 모자이크 | `POST /blur_boxes` (`MosaicApi`, multipart: `file` + `boxes`) |

---

## 환경 변수

`.env*` 파일은 `.gitignore` 대상입니다. 로컬에서는 `.env.local` 에, 운영에서는 Vercel 프로젝트 환경 변수에 설정합니다.

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | `ApiClient` 의 `baseURL`. 비우면 상대 경로로 요청해 `/api/*` rewrites를 탐 |
| `NEXT_PUBLIC_MOSAIC_API_URL` | `MosaicApi` 의 `baseURL`. rewrites를 쓸 때는 `/proxy-mosaic`, 직접 호출 시 Gateway의 `/api/mosaic` 주소 |

두 변수 모두 `NEXT_PUBLIC_` 접두어라 브라우저 번들에 노출됩니다. 비밀 값은 넣지 마세요.

---

## 로컬 개발

### 사전 요구사항

- Node.js **20.9 이상** (Next.js 16 요구사항, Docker 이미지는 Node 22 사용)
- 백엔드: [policelab.projects](https://github.com/Datamatica-project/policelab.projects) 의 `docker-compose-dev.yml` 로 Gateway(:8000)와 서비스들을 띄우거나, 운영 Gateway 사용

### 실행

```bash
npm install
npm run dev          # http://localhost:3000
```

### 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (`next dev`) |
| `npm run build` | 프로덕션 빌드 (`next build`) |
| `npm run start` | 빌드 결과 실행 (`next start`) |
| `npm run lint` | ESLint (`eslint.config.mjs` — Next core-web-vitals + TypeScript 규칙) |

테스트 스크립트·테스트 코드는 현재 없습니다.

### Docker (`Dockerfile.dev`)

`Dockerfile.dev` 는 **로컬 통합 테스트용 개발 서버 이미지**입니다 (`node:22-alpine`, `npm ci` 후 `next dev --hostname 0.0.0.0 --port 3000`). 운영 배포는 Vercel이 담당하므로 프로덕션 빌드 단계는 없습니다.

GitOps 리포 루트의 `docker-compose-video-test.yml` 에 `front` 프로필로 연결되어 있어, 백엔드와 함께 영상 업로드 흐름을 끝까지 확인할 때 사용합니다.

```bash
# policelab.projects 루트에서
docker compose -f docker-compose-dev.yml -f docker-compose-video-test.yml --profile front up -d
```

- 소스는 바인드 마운트되고 `WATCHPACK_POLLING=true` 로 변경을 감지합니다.
- `node_modules`·`.next` 는 익명 볼륨으로 분리합니다. 호스트의 `node_modules` 가 섞이면 플랫폼이 다른 네이티브 바이너리 때문에 기동이 깨지므로 `.dockerignore` 에서도 제외합니다.

---

## 배포 (Vercel)

- 프론트엔드는 **Vercel** 에 배포됩니다 (백엔드는 AWS EC2 k3s, ArgoCD로 별도 배포).
- 운영 API 호출은 `vercel.json` / `next.config.ts` 의 rewrites로 운영 Gateway에 프록시됩니다. **Gateway 주소가 바뀌면 두 파일을 함께 수정**해야 합니다.
- Vercel 환경 변수에 `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MOSAIC_API_URL` 을 설정합니다. 값 변경 후에는 재배포가 필요합니다.
- 대용량 파일은 Vercel 프록시를 거치지 않도록 S3 presigned 직접 업로드를 사용합니다. 내부(NAS) 보관 정책 파일은 직접 업로드 경로가 없어 multipart로 프록시를 거칩니다.
- 이 리포에는 GitHub Actions 워크플로가 없으며, 이미지 빌드·ECR 푸시·ArgoCD 배포 대상이 아닙니다.

---

## 디렉터리 구조

```
policelab.new.front/
├── public/                         # 로고, 로그인 일러스트, 대시보드 아이콘 등 정적 파일
├── src/
│   ├── middleware.ts               # refreshToken 쿠키 기반 라우트 보호/리다이렉트
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃 (Noto Sans KR, sonner Toaster)
│   │   ├── page.tsx                # / → /dashboard 리다이렉트
│   │   ├── globals.css             # Tailwind 4 + shadcn 테마 변수
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      # 로그인
│   │   │   └── signup/page.tsx     # 회원가입
│   │   └── (main)/
│   │       ├── layout.tsx          # Sidebar + Footer 공통 레이아웃
│   │       ├── dashboard/page.tsx  # 대시보드 (Recharts)
│   │       └── cases/
│   │           ├── page.tsx        # 사건 목록
│   │           ├── new/page.tsx    # 새 사건 4단계 마법사
│   │           └── [id]/page.tsx   # 사건 상세
│   ├── components/
│   │   ├── cases/                  # 사건 카드·수정/공유 모달, 이미지/영상 수동 보정 편집기,
│   │   │                           #   영상 결과 패널, 완료 화면(Step3Complete), 처리 상태 배지
│   │   ├── common/                 # AuthedImage, AssigneePicker, ConfirmDialog, PaginationBar 등
│   │   ├── dashboard/              # 대시보드 보조 컴포넌트 (일부 목업, 현재 미사용)
│   │   ├── layout/                 # Sidebar(메뉴·최근 사건·로그아웃), Footer
│   │   └── ui/                     # shadcn(base-ui) 생성 컴포넌트
│   ├── hooks/
│   │   ├── useAuthedImage.ts       # 인증 필요한 파일 → Object URL
│   │   ├── useVideoSource.ts       # 영상 presigned 스트리밍 / Blob 폴백
│   │   ├── useFileProcessingPoll.ts# 처리 중 파일 상태 폴링
│   │   └── useDebouncedCallback.ts # 검색 입력 디바운스
│   ├── lib/
│   │   ├── api.ts                  # axios 인스턴스, 인터셉터(토큰·재발급), API 함수·타입
│   │   ├── apiError.ts             # 서버 오류 메시지 추출
│   │   ├── directUpload.ts         # S3 presigned 직접 업로드 (init → PUT → complete)
│   │   ├── directReplace.ts        # S3 presigned 직접 교체 업로드
│   │   ├── caseSession.ts          # 사건 생성 진행 상태 저장 (sessionStorage + IndexedDB)
│   │   ├── fileStatus.ts           # 파일 처리 상태 모델·표시 규칙
│   │   ├── case-data.ts            # 사건 화면 타입 (+ 초기 목업 생성기, 현재 미사용)
│   │   ├── datetime.ts / filesize.ts / utils.ts   # 날짜·용량 포맷, cn()
│   └── store/
│       ├── authStore.ts            # 토큰(메모리)·이메일(localStorage) 스토어
│       └── caseStore.ts            # 사이드바 최근 사건 캐시
├── next.config.ts                  # rewrites (/api, /proxy-mosaic)
├── vercel.json                     # Vercel rewrites (next.config.ts 와 동일)
├── Dockerfile.dev                  # 로컬 통합 테스트용 dev 서버 이미지
├── components.json                 # shadcn 설정 (base-nova, lucide)
├── eslint.config.mjs
├── postcss.config.mjs
└── tsconfig.json                   # 경로 별칭 @/* → src/*
```

---

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 릴리스 브랜치 (`develop` 에서 PR로 병합) |
| `develop` | 통합 브랜치 (GitHub 기본 브랜치) |
| `feature/*` | 기능 개발 (현재 `feature/aws`) |

`feature/*` → `develop` → `main` 순서로 Pull Request를 통해 병합합니다.

---

## 주의사항

- `next.config.ts` 의 rewrites 대상을 로컬 주소로 바꾼 상태로 **커밋하지 마세요.** 운영 Vercel 배포가 로컬 주소로 프록시하게 됩니다.
- 서버 주소, 자격 증명 등 민감한 값을 `NEXT_PUBLIC_*` 변수나 소스에 넣지 마세요. 브라우저에 그대로 노출됩니다.
- 영상은 업로드 직후 비식별화가 끝나 있지 않습니다. 처리 중인 파일은 백엔드가 원본 열람·다운로드를 **409로 차단**하며, 프론트는 상태 배지로 안내합니다. 열람 차단의 정본은 백엔드입니다.
- 시스템 전체 구성·백엔드 환경 변수·배포 절차는 [policelab.projects README](https://github.com/Datamatica-project/policelab.projects) 를 참고하세요.
