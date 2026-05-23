import type {
  Job,
  CreateJobDto,
  UpdateJobDto,
  FilterJobsDto,
  Comment,
  CreateCommentDto,
  UpdateCommentDto,
  Attachment,
  Document,
  CreateDocumentDto,
  JobDocument,
  LinkDocumentDto,
  UpdateJobDocumentDto,
  Statistics,
} from "@/types";

// --- Detect Tauri context early ---
function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__TAURI__ !== undefined
  );
}

// --- Tauri invoke (only when inside the desktop app) ---
async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) {
    return mockInvoke<T>(command, args);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

// --- Mock data for browser preview ---
const MOCK_JOBS: Job[] = [
  {
    id: "mock-1",
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "Berlin, DE (Remote)",
    description:
      "Looking for an experienced React developer with TypeScript expertise.",
    url: "https://example.com/jobs/frontend-dev",
    status: "applied",
    is_favorite: true,
    status_manually_changed: true,
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-16T14:30:00Z",
  },
  {
    id: "mock-2",
    title: "Fullstack Engineer",
    company: "StartupXYZ",
    location: "Munich, DE",
    description: "Build products from scratch using modern tech stack.",
    url: "",
    status: "waiting",
    is_favorite: false,
    status_manually_changed: false,
    created_at: "2025-01-14T09:00:00Z",
    updated_at: "2025-01-14T09:00:00Z",
  },
  {
    id: "mock-3",
    title: "UI/UX Developer",
    company: "DesignHub",
    location: "London, UK (Hybrid)",
    description:
      "Create beautiful, accessible interfaces for enterprise products.",
    url: "https://example.com/jobs/ui-ux",
    status: "waiting",
    is_favorite: true,
    status_manually_changed: false,
    created_at: "2025-01-13T11:00:00Z",
    updated_at: "2025-01-13T11:00:00Z",
  },
  {
    id: "mock-4",
    title: "Backend Developer (Rust)",
    company: "CloudSystems",
    location: "Amsterdam, NL",
    description: "Work on high-performance distributed systems.",
    url: "",
    status: "rejected",
    is_favorite: false,
    status_manually_changed: true,
    created_at: "2025-01-10T08:00:00Z",
    updated_at: "2025-01-12T16:00:00Z",
  },
  {
    id: "mock-5",
    title: "DevOps Engineer",
    company: "InfraScale",
    location: "Remote",
    description: "Manage CI/CD pipelines and cloud infrastructure.",
    url: "https://example.com/jobs/devops",
    status: "applied",
    is_favorite: false,
    status_manually_changed: false,
    created_at: "2025-01-12T14:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
  },
];

const MOCK_COMMENTS: Comment[] = [
  {
    id: "mock-c1",
    job_id: "mock-1",
    content: "Applied via LinkedIn. Got confirmation email.",
    created_at: "2025-01-15T12:00:00Z",
  },
  {
    id: "mock-c2",
    job_id: "mock-1",
    content: "Follow up scheduled for next week.",
    created_at: "2025-01-16T09:00:00Z",
  },
  {
    id: "mock-c3",
    job_id: "mock-3",
    content: "Referral from colleague — should help with screening.",
    created_at: "2025-01-13T15:00:00Z",
  },
];

const MOCK_STATS: Statistics = {
  total: MOCK_JOBS.length,
  waiting: MOCK_JOBS.filter((j) => j.status === "waiting").length,
  applied: MOCK_JOBS.filter((j) => j.status === "applied").length,
  rejected: MOCK_JOBS.filter((j) => j.status === "rejected").length,
  favorites: MOCK_JOBS.filter((j) => j.is_favorite).length,
};

function filterMockJobs(filter?: FilterJobsDto): Job[] {
  let jobs = [...MOCK_JOBS];
  if (filter?.status) {
    jobs = jobs.filter((j) => j.status === filter.status);
  }
  if (filter?.is_favorite !== undefined) {
    jobs = jobs.filter((j) => j.is_favorite === filter.is_favorite);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q),
    );
  }
  return jobs;
}

async function mockInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 200));

  switch (command) {
    case "get_jobs": {
      const filter = args?.filter as FilterJobsDto | undefined;
      return filterMockJobs(filter) as T;
    }
    case "get_statistics": {
      return MOCK_STATS as T;
    }
    case "get_job_by_id": {
      const id = args?.id as string;
      const job = MOCK_JOBS.find((j) => j.id === id);
      if (!job) throw new Error("Job not found");
      return job as T;
    }
    case "create_job": {
      const request = args?.request as CreateJobDto;
      const newJob: Job = {
        id: `mock-${Date.now()}`,
        title: request?.title ?? "",
        company: request?.company ?? "",
        location: request?.location ?? "",
        description: request?.description ?? "",
        url: request?.url ?? "",
        status: request?.status ?? "applied",
        is_favorite: request?.is_favorite ?? false,
        status_manually_changed: request?.status !== undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_JOBS.unshift(newJob);
      return newJob as T;
    }
    case "update_job": {
      const request = args?.request as UpdateJobDto;
      const idx = MOCK_JOBS.findIndex((j) => j.id === request?.id);
      if (idx === -1) throw new Error("Job not found");
      MOCK_JOBS[idx] = {
        ...MOCK_JOBS[idx],
        ...(request || {}),
        updated_at: new Date().toISOString(),
      };
      return MOCK_JOBS[idx] as T;
    }
    case "delete_job": {
      const id = args?.id as string;
      const idx = MOCK_JOBS.findIndex((j) => j.id === id);
      if (idx === -1) throw new Error("Job not found");
      MOCK_JOBS.splice(idx, 1);
      return true as T;
    }
    case "get_comments": {
      const jobId = args?.jobId as string;
      return MOCK_COMMENTS.filter((c) => c.job_id === jobId) as T;
    }
    case "create_comment": {
      const request = args?.request as CreateCommentDto;
      const newComment: Comment = {
        id: `mock-c-${Date.now()}`,
        job_id: request?.job_id ?? "",
        content: request?.content ?? "",
        created_at: new Date().toISOString(),
      };
      MOCK_COMMENTS.unshift(newComment);
      return newComment as T;
    }
    case "update_comment": {
      const request = args?.request as UpdateCommentDto;
      const idx = MOCK_COMMENTS.findIndex((c) => c.id === request?.id);
      if (idx === -1) throw new Error("Comment not found");
      MOCK_COMMENTS[idx] = {
        ...MOCK_COMMENTS[idx],
        content: request?.content ?? MOCK_COMMENTS[idx].content,
      };
      return MOCK_COMMENTS[idx] as T;
    }
    case "delete_comment": {
      const id = args?.id as string;
      const idx = MOCK_COMMENTS.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Comment not found");
      MOCK_COMMENTS.splice(idx, 1);
      return true as T;
    }
    case "get_attachments": {
      return [] as T;
    }
    case "upload_attachment": {
      return {
        id: `mock-a-${Date.now()}`,
        job_id: args?.jobId as string,
        filename: "test.pdf",
        file_type: "application/pdf",
        file_size: 1234,
        created_at: new Date().toISOString(),
      } as T;
    }
    case "get_attachment_file": {
      return {
        data: "",
        filename: "test.pdf",
        file_type: "application/pdf",
      } as T;
    }
    case "delete_attachment": {
      return true as T;
    }
    case "get_documents": {
      return [] as T;
    }
    case "upload_document": {
      return {
        id: `mock-d-${Date.now()}`,
        name: "My CV",
        filename: "cv.pdf",
        file_type: "application/pdf",
        file_size: 1234,
        document_type: "cv",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as T;
    }
    case "get_document_file": {
      return {
        data: "",
        filename: "cv.pdf",
        file_type: "application/pdf",
      } as T;
    }
    case "delete_document": {
      return true as T;
    }
    case "get_job_documents": {
      return [] as T;
    }
    case "link_document":
    case "unlink_document": {
      return true as T;
    }
    case "update_job_document": {
      return {
        id: "mock-jd-1",
        job_id: "mock-1",
        document_id: "mock-d-1",
        name: "My CV",
        filename: "cv.pdf",
        file_type: "application/pdf",
        file_size: 1234,
        document_type: "cv",
        sent_date: null,
        notes: "",
        created_at: new Date().toISOString(),
      } as T;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// --- Public API (auto-detects Tauri vs browser) ---

export async function getJobs(filter?: FilterJobsDto): Promise<Job[]> {
  return tauriInvoke<Job[]>("get_jobs", { filter });
}

export async function createJob(data: CreateJobDto): Promise<Job> {
  return tauriInvoke<Job>("create_job", { request: data });
}

export async function updateJob(data: UpdateJobDto): Promise<Job> {
  return tauriInvoke<Job>("update_job", { request: data });
}

export async function deleteJob(id: string): Promise<boolean> {
  return tauriInvoke<boolean>("delete_job", { id });
}

export async function getJobById(id: string): Promise<Job> {
  return tauriInvoke<Job>("get_job_by_id", { id });
}

export async function getStatistics(): Promise<Statistics> {
  return tauriInvoke<Statistics>("get_statistics");
}

export async function getComments(jobId: string): Promise<Comment[]> {
  return tauriInvoke<Comment[]>("get_comments", { jobId });
}

export async function createComment(data: CreateCommentDto): Promise<Comment> {
  return tauriInvoke<Comment>("create_comment", { request: data });
}

export async function updateComment(data: UpdateCommentDto): Promise<Comment> {
  return tauriInvoke<Comment>("update_comment", { request: data });
}

export async function deleteComment(id: string): Promise<boolean> {
  return tauriInvoke<boolean>("delete_comment", { id });
}

export async function getAttachments(jobId: string): Promise<Attachment[]> {
  return tauriInvoke<Attachment[]>("get_attachments", { jobId });
}

/// Uploads a file by reading it as base64 and sending to backend
export async function uploadAttachment(
  jobId: string,
  file: File,
): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result?.toString().split(",")[1] || "";
      tauriInvoke<Attachment>("upload_attachment", {
        jobId,
        filename: file.name,
        fileType: file.type || "application/octet-stream",
        fileData: base64Data,
      })
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/// Downloads an attachment file and triggers browser download
export async function downloadAttachment(id: string): Promise<void> {
  const response = await tauriInvoke<{
    data: string;
    filename: string;
    file_type: string;
  }>("get_attachment_file", { id });

  // Create blob from base64 and trigger download
  const byteCharacters = atob(response.data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: response.file_type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = response.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function deleteAttachment(id: string): Promise<boolean> {
  return tauriInvoke<boolean>("delete_attachment", { id });
}

// --- Document Library ---

export async function getDocuments(): Promise<Document[]> {
  return tauriInvoke<Document[]>("get_documents");
}

export async function uploadDocument(
  dto: CreateDocumentDto,
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result?.toString().split(",")[1] || "";
      tauriInvoke<Document>("upload_document", {
        name: dto.name,
        documentType: dto.document_type,
        fileData: base64Data,
      })
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(dto.file);
  });
}

export async function downloadDocument(id: string): Promise<void> {
  const response = await tauriInvoke<{
    data: string;
    filename: string;
    file_type: string;
  }>("get_document_file", { id });

  const byteCharacters = atob(response.data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: response.file_type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = response.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function deleteDocument(id: string): Promise<boolean> {
  return tauriInvoke<boolean>("delete_document", { id });
}

// --- Job-Document Linking ---

export async function getJobDocuments(jobId: string): Promise<JobDocument[]> {
  return tauriInvoke<JobDocument[]>("get_job_documents", { jobId });
}

export async function linkDocument(dto: LinkDocumentDto): Promise<JobDocument> {
  return tauriInvoke<JobDocument>("link_document", {
    jobId: dto.job_id,
    documentId: dto.document_id,
    sentDate: dto.sent_date ?? null,
    notes: dto.notes ?? "",
  });
}

export async function unlinkDocument(
  jobId: string,
  documentId: string,
): Promise<boolean> {
  return tauriInvoke<boolean>("unlink_document", { jobId, documentId });
}

export async function updateJobDocument(
  dto: UpdateJobDocumentDto,
): Promise<JobDocument> {
  return tauriInvoke<JobDocument>("update_job_document", {
    jobId: dto.job_id,
    documentId: dto.document_id,
    sentDate: dto.sent_date ?? null,
    notes: dto.notes ?? "",
  });
}

// --- Settings ---

export interface AppSettings {
  default_status: string;
}

export interface StorageUsage {
  documents_size: number;
  attachments_size: number;
  db_size: number;
  total_size: number;
}

export async function getSettings(): Promise<AppSettings> {
  return tauriInvoke<AppSettings>("get_settings");
}

export async function updateSettings(
  data: Partial<AppSettings>,
): Promise<AppSettings> {
  return tauriInvoke<AppSettings>("update_settings", {
    request: { default_status: data.default_status },
  });
}

export async function getStorageUsage(): Promise<StorageUsage> {
  return tauriInvoke<StorageUsage>("get_storage_usage");
}

export async function getDataDirectory(): Promise<string> {
  return tauriInvoke<string>("get_data_directory");
}

export async function exportData(): Promise<{ path: string }> {
  return tauriInvoke<{ path: string }>("export_data");
}

export async function exportDataTo(path: string): Promise<{ path: string }> {
  return tauriInvoke<{ path: string }>("export_data_to", { exportPath: path });
}

export async function importData(zipPath: string): Promise<string> {
  return tauriInvoke<string>("import_data", { zipPath });
}
