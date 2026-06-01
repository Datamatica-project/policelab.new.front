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

    if (
      axiosError.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login")
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
        getAuthStore?.().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export interface UserResponse {
  email: string;
  name: string;
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

export const PostJoin = async (
  email: string,
  name: string,
  password: string,
  role: UserRole,
): Promise<void> => {
  await ApiClient.post("/api/auth/join", { email, name, password, role });
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
