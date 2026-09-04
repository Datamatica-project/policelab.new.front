import axios from "axios";

let getAuthStore: () => {
  token: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
};

// 순환 참조 방지를 위해 런타임에 store를 가져옴
export function setAuthStoreGetter(fn: typeof getAuthStore) {
  getAuthStore = fn;
}

export const ApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export const MosaicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_MOSAIC_API_URL,
});

ApiClient.interceptors.request.use((config) => {
  const token = getAuthStore?.().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

ApiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as {
      config?: { _retry?: boolean; url?: string; headers?: Record<string, string> };
      response?: { status?: number };
    };
    const originalRequest = axiosError.config;

    // /auth/login, /auth/refresh 자체의 401 은 재발급 대상에서 제외해야
    // refresh 무한 루프를 방지할 수 있다.
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (
      axiosError.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const response = await ApiClient.get("/api/auth/refresh");
        const { accessToken, email } = response.data.data;

        getAuthStore?.().login(accessToken, email);
        ApiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers!["Authorization"] = `Bearer ${accessToken}`;

        return ApiClient(originalRequest as Parameters<typeof ApiClient>[0]);
      } catch {
        // 재발급 실패 = 세션 만료. 인메모리 토큰을 비우고,
        // (백엔드가 refreshToken 쿠키를 이미 제거하므로) 로그인 페이지로 이동한다.
        getAuthStore?.().logout();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

MosaicApi.interceptors.request.use((config) => {
  const token = getAuthStore?.().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const FILE_API_MARKER = "/api/files/";

/**
 * 백엔드가 내려준 파일 URL 을 ApiClient 기준의 상대 경로로 바꾼다.
 *
 * NAS 저장 파일의 `url`/`thumbnail`/`downloadUrl` 은 백엔드가
 * `SERVER_DOWNLOAD_URL + /api/files/{id}` 형태의 절대 URL 로 만들어 준다.
 * 이 절대 URL 을 그대로 쓰면 두 가지가 깨진다.
 *  - 배포 환경에서 SERVER_DOWNLOAD_URL 이 http 면 https 페이지에서 mixed content 로 차단된다.
 *  - baseURL 을 우회하므로 프록시/오리진 설정이 반영되지 않는다.
 * 그래서 `/api/files/` 이후만 잘라내 ApiClient 로 다시 태운다.
 *
 * S3 presigned URL 은 이 경로 조각을 포함하지 않으므로 null 이 되고,
 * 호출부에서 원본 URL 을 그대로 쓰면 된다 (서명이 쿼리스트링에 있어 인증이 불필요).
 *
 * @param url 백엔드가 내려준 URL (절대/상대 모두 허용)
 * @returns 파일 API 를 가리키면 상대 경로, 아니면 null
 */
export function toFileApiPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const idx = url.indexOf(FILE_API_MARKER);
  return idx === -1 ? null : url.slice(idx);
}

export type Rank =
  | "SUNGYEONG"
  | "GYEONGJANG"
  | "GYEONGSA"
  | "GYEONGWI"
  | "GYEONGGAM"
  | "GYEONGJEONG"
  | "CHONGGYEONG";

export const RANK_LABEL: Record<Rank, string> = {
  SUNGYEONG: "순경",
  GYEONGJANG: "경장",
  GYEONGSA: "경사",
  GYEONGWI: "경위",
  GYEONGGAM: "경감",
  GYEONGJEONG: "경정",
  CHONGGYEONG: "총경",
};

// 낮은 계급 → 높은 계급 순서 (드롭다운 노출 순서)
export const RANK_ORDER: Rank[] = [
  "SUNGYEONG",
  "GYEONGJANG",
  "GYEONGSA",
  "GYEONGWI",
  "GYEONGGAM",
  "GYEONGJEONG",
  "CHONGGYEONG",
];

export interface UserResponse {
  email: string;
  name: string;
  organization: string | null;
  department: string | null;
  rank: Rank | null;
  roles: string[];
  status: string;
}

export const GetUserList = async (): Promise<UserResponse[]> => {
  const response = await ApiClient.get("/api/auth/users");
  return response.data.data as UserResponse[];
};

export const ShareCase = async (caseId: string, usernames: string[]): Promise<void> => {
  await ApiClient.post(`/api/cases/${caseId}/shares`, { usernames });
};

export type UserRole = "USER" | "INSPECTOR" | "WORKER" | "ADMIN";

export interface JoinPayload {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  organization: string;
  department: string;
  rank: Rank;
}

export const PostJoin = async (payload: JoinPayload): Promise<void> => {
  await ApiClient.post("/api/auth/join", payload);
};

export interface DashboardStats {
  todayUploadCount: number;
  yesterdayUploadCount: number;
  lastUploadedAt: string | null;
  categoryUploads: { photo: number; evidence: number; other: number };
  weeklyUploads: { date: string; photo: number; evidence: number; other: number }[];
  categoryDistribution: { category: string; count: number; percentage: number }[];
  hourlyUploadsToday: { hour: string; uploads: number }[];
}

export const GetDashboardStats = async (): Promise<DashboardStats> => {
  const response = await ApiClient.get("/api/files/dashboard");
  return response.data;
};

export const PostLogin = async (email: string, password: string) => {
  const response = await ApiClient.post("/api/auth/login", { email, password });
  return response.data as {
    resultCode: string;
    resultMessage: string;
    data: { accessToken: string; email: string };
  };
};

export interface CreateCasePayload {
  caseNumber: string;
  title: string;
  description: string;
  occurredAt: string;
  assignedTo: string;
}

export type CaseAccessType = "OWNED" | "SHARED" | "ALL";

export interface CaseResponse {
  caseId: string;
  caseNumber: string;
  title: string;
  description: string;
  occurredAt: string;
  assignedTo: string;
  createdBy: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  sharedWith: string[];
  accessType: "OWNED" | "SHARED";
}

export interface CasePage {
  content: CaseResponse[];
  totalPages: number;
  totalElements: number;
  number: number; // 현재 페이지 (0-based)
  size: number;
}

export const DeleteCase = async (caseId: string): Promise<void> => {
  await ApiClient.delete(`/api/cases/${caseId}`);
};

/**
 * 사건 상태 변경 (진행중 OPEN ↔ 사건종료 CLOSED).
 * 생성자·담당자만 변경 가능하며, 권한이 없으면 403.
 */
export const UpdateCaseStatus = async (
  caseId: string,
  status: "OPEN" | "CLOSED",
): Promise<CaseResponse> => {
  const response = await ApiClient.patch(`/api/cases/${caseId}/status`, { status });
  return response.data;
};

/**
 * 사건 번호 중복 검사. true 이면 이미 사용 중인 번호.
 */
export const CheckCaseNumberExists = async (
  caseNumber: string,
): Promise<boolean> => {
  const response = await ApiClient.get("/api/cases/exists", {
    params: { caseNumber },
  });
  return Boolean(response.data?.exists);
};

export interface UpdateCasePayload {
  title?: string;
  description?: string;
  occurredAt?: string;
  assignedTo?: string;
}

export const UpdateCase = async (
  caseId: string,
  payload: UpdateCasePayload,
): Promise<CaseResponse> => {
  const response = await ApiClient.put(`/api/cases/${caseId}`, payload);
  return response.data;
};

export const GetCases = async (
  page = 0,
  size = 10,
  typeShare: CaseAccessType = "ALL",
): Promise<CasePage> => {
  const response = await ApiClient.get("/api/cases", {
    params: { page, size, typeShare },
  });
  return response.data;
};

export interface FileListResponse {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  uploader: string;
  category: string;
  tags: string[];
  description: string;
  url: string;
  downloadUrl: string;
  thumbnail: string;
  sharedWith: string[];
}

export interface CaseDetailResponse {
  caseId: string;
  caseNumber: string;
  title: string;
  description: string;
  occurredAt: string | null;
  assignedTo: string | null;
  createdBy: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sharedWith: string[];
  files: FileListResponse[];
}

export const GetCaseDetail = async (caseId: string): Promise<CaseDetailResponse> => {
  const response = await ApiClient.get(`/api/cases/${caseId}`);
  return response.data;
};

export const PostCase = async (
  payload: CreateCasePayload,
): Promise<CaseResponse> => {
  const response = await ApiClient.post("/api/cases", payload);
  return response.data;
};

export interface FileUploadMetadata {
  storageType: "S3" | "NAS";
  description: string;
  categoryName: string;
  tags: string[];
  caseId: string;
}

export interface Detection {
  class_name: string;
  confidence: number;
  box_xyxy: [number, number, number, number];
  expanded_box_xyxy: [number, number, number, number];
}

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  storageType: string;
  storagePath: string;
  storageUrl: string;
  tags: string[];
  uploadedAt: string | null;
  detectionCount: number;
  detections: Detection[];
  processingQueued: boolean;
}

export const PostFiles = async (
  files: File[],
  metadataList: FileUploadMetadata[],
): Promise<FileUploadResult[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("metadata", JSON.stringify(metadataList));

  const response = await ApiClient.post("/api/files/upload", formData);
  return response.data;
};

export interface DirectUploadFileMeta {
  fileName: string;
  contentType: string;
  fileSize: number;
  description: string;
  categoryName: string;
  tags: string[];
}

export interface DirectUploadInitResult {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
}

/**
 * 파일별로 S3 presigned PUT URL을 예약한다. 실제 파일 바이트는 이 호출에
 * 실리지 않는다 — 응답으로 받은 uploadUrl에 브라우저가 직접 PUT한다.
 */
export const InitDirectUpload = async (
  caseId: string,
  files: DirectUploadFileMeta[],
): Promise<DirectUploadInitResult[]> => {
  const response = await ApiClient.post("/api/files/upload/init", { caseId, files });
  return response.data;
};

/** S3 PUT이 끝난 뒤 호출해 비식별화·저장을 마무리한다. */
export const CompleteDirectUpload = async (fileId: string): Promise<FileUploadResult> => {
  const response = await ApiClient.post(`/api/files/upload/${fileId}/complete`);
  return response.data;
};

/**
 * presigned URL로 파일을 직접 S3에 PUT한다.
 *
 * 반드시 bare axios를 써야 한다 — ApiClient는 백엔드용 Authorization 헤더와
 * baseURL을 주입하는데, 둘 다 S3로 가는 요청에는 있으면 안 된다(서명 불일치로
 * 거부됨). Content-Type도 /upload/init에 보낸 값과 동일해야 한다 — presigned
 * URL의 서명 자체가 그 값을 포함하고 있어 다르면 SignatureDoesNotMatch로 실패한다.
 */
export const PutFileToS3 = async (
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> => {
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": file.type },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
};

export interface ReplaceFileMetadata {
  fileId: string;
  boxes?: number[][];
}

export interface ReplaceFileResult {
  fileId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  storageUrl: string;
}

export const PostReplace = async (
  files: File[],
  metadata: ReplaceFileMetadata[],
): Promise<ReplaceFileResult[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("metadata", JSON.stringify(metadata));

  const response = await ApiClient.post("/api/files/replace", formData);
  return response.data;
};

export interface DirectReplaceFileMeta {
  fileId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface DirectReplaceInitResult {
  fileId: string;
  uploadUrl: string;
  rawKey: string;
  expiresAt: string;
}

/**
 * 교체 대상 파일마다 S3 presigned PUT URL을 예약한다. /upload/init과 달리 이
 * 시점엔 DB에 아무것도 쓰이지 않는다 — 대상 파일은 complete가 끝날 때까지
 * 계속 정상 상태로 남는다.
 */
export const InitDirectReplace = async (
  files: DirectReplaceFileMeta[],
): Promise<DirectReplaceInitResult[]> => {
  const response = await ApiClient.post("/api/files/replace/init", { files });
  return response.data;
};

/**
 * S3 PUT이 끝난 뒤 호출해 WebP 압축·저장을 마무리한다. rawKey는 init 응답에서
 * 받은 값을 그대로 되돌려줘야 한다 — 서버가 두 호출 사이에 아무 상태도 기억하지 않는다.
 */
export const CompleteDirectReplace = async (
  fileId: string,
  rawKey: string,
  fileName: string,
  contentType: string,
): Promise<ReplaceFileResult> => {
  const response = await ApiClient.post(`/api/files/replace/${fileId}/complete`, {
    rawKey,
    fileName,
    contentType,
  });
  return response.data;
};

export const PostMosaic = async (
  file: File,
  boxes: number[][],
): Promise<Blob> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("boxes", JSON.stringify(boxes));
  const response = await MosaicApi.post("/blur_boxes", formData, {
    responseType: "blob",
  });
  return response.data as Blob;
};
