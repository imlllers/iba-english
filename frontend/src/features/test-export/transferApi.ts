import { downloadFile } from "@/shared/api/client";

export const transferApi = {
  exportTest: (id: string) => downloadFile(`/api/teacher/tests/${id}/export`, "test.zip"),
};
