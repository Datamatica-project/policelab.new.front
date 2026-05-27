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

export const AuthApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export const ImageApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_IMAGE_API_URL,
  withCredentials: true,
});

export const MosaicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_MOSAIC_API_URL,
});

const attachToken = (config: Parameters<Parameters<typeof AuthApi.interceptors.request.use>[0]>[0]) => {
  const token = getAuthStore?.().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

AuthApi.interceptors.request.use(attachToken);
ImageApi.interceptors.request.use(attachToken);

AuthApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await AuthApi.get("/api/auth/refresh");
        const { accessToken, email } = response.data;

        getAuthStore?.().login(accessToken, email);
        AuthApi.defaults.headers.common["Authorization"] =
          `Bearer ${accessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

        return AuthApi(originalRequest);
      } catch {
        getAuthStore?.().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export const PostLogin = async (email: string, password: string) => {
  const response = await AuthApi.post("/api/auth/login", { email, password });
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
}

export const PostCase = async (payload: CreateCasePayload): Promise<CaseResponse> => {
  const response = await ImageApi.post("/api/cases", payload);
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

export const PostFiles = async (files: File[], metadataList: FileUploadMetadata[]): Promise<FileUploadResult[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("metadata", JSON.stringify(metadataList));

  const response = await ImageApi.post("/api/files/upload", formData);
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

  const response = await ImageApi.post("/api/files/replace", formData);
  return response.data;
};

export const PostMosaic = async (file: File, boxes: number[][]): Promise<Blob> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("boxes", JSON.stringify(boxes));
  const response = await MosaicApi.post("/blur_boxes", formData, { responseType: "blob" });
  return response.data as Blob;
};
