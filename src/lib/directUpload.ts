import {
  CompleteDirectUpload,
  InitDirectUpload,
  PutFileToS3,
  type DirectUploadFileMeta,
  type FileUploadResult,
} from "@/lib/api";

export interface DirectUploadTask {
  id: number;
  file: File;
  description: string;
  categoryName: string;
  tags: string[];
}

export interface DirectUploadOutcome {
  id: number;
  result?: FileUploadResult;
  error?: unknown;
}

/**
 * 파일을 Vercel/백엔드를 거치지 않고 S3에 직접 업로드한다.
 *
 * init(배치 1회) → 파일마다 PUT(동시 concurrency개) → complete(파일마다) 순서로
 * 진행하며, 결과는 요청 순서가 아니라 각 task의 id로 상관관계를 맺는다 — PUT은
 * 완료 순서가 뒤섞일 수 있기 때문이다.
 */
export async function uploadFilesDirect(
  caseId: string,
  tasks: DirectUploadTask[],
  onProgress?: (id: number, percent: number) => void,
  concurrency = 4,
): Promise<DirectUploadOutcome[]> {
  if (tasks.length === 0) return [];

  const initMetas: DirectUploadFileMeta[] = tasks.map((t) => ({
    fileName: t.file.name,
    contentType: t.file.type,
    fileSize: t.file.size,
    description: t.description,
    categoryName: t.categoryName,
    tags: t.tags,
  }));
  const inits = await InitDirectUpload(caseId, initMetas);

  const pairs = tasks.map((task, i) => ({ task, init: inits[i] }));
  const outcomes: DirectUploadOutcome[] = new Array(tasks.length);

  let cursor = 0;
  async function worker() {
    while (cursor < pairs.length) {
      const index = cursor++;
      const { task, init } = pairs[index];
      try {
        await PutFileToS3(init.uploadUrl, task.file, (pct) => onProgress?.(task.id, pct));
        const result = await CompleteDirectUpload(init.fileId);
        outcomes[index] = { id: task.id, result };
      } catch (error) {
        outcomes[index] = { id: task.id, error };
      }
    }
  }

  const workerCount = Math.min(concurrency, pairs.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return outcomes;
}
