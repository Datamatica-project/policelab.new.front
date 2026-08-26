import {
  CompleteDirectReplace,
  InitDirectReplace,
  PutFileToS3,
  type DirectReplaceFileMeta,
  type ReplaceFileResult,
} from "@/lib/api";

export interface DirectReplaceTask {
  id: number;
  fileId: string;
  file: File;
}

export interface DirectReplaceOutcome {
  id: number;
  result?: ReplaceFileResult;
  error?: unknown;
}

/**
 * 수동 보정된 파일을 Vercel/백엔드를 거치지 않고 S3에 직접 재업로드해 교체한다.
 * uploadFilesDirect와 동일한 모양(init 배치 1회 → 파일별 동시 PUT → 파일별 complete)
 * 이지만, 대상이 이미 존재하는 파일이라 init 단계에서 서버 쪽 상태 변화가 없다.
 */
export async function replaceFilesDirect(
  tasks: DirectReplaceTask[],
  onProgress?: (id: number, percent: number) => void,
  concurrency = 4,
): Promise<DirectReplaceOutcome[]> {
  if (tasks.length === 0) return [];

  const initMetas: DirectReplaceFileMeta[] = tasks.map((t) => ({
    fileId: t.fileId,
    fileName: t.file.name,
    contentType: t.file.type,
    fileSize: t.file.size,
  }));
  const inits = await InitDirectReplace(initMetas);

  const pairs = tasks.map((task, i) => ({ task, init: inits[i] }));
  const outcomes: DirectReplaceOutcome[] = new Array(tasks.length);

  let cursor = 0;
  async function worker() {
    while (cursor < pairs.length) {
      const index = cursor++;
      const { task, init } = pairs[index];
      try {
        await PutFileToS3(init.uploadUrl, task.file, (pct) => onProgress?.(task.id, pct));
        const result = await CompleteDirectReplace(
          task.fileId,
          init.rawKey,
          task.file.name,
          task.file.type,
        );
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
