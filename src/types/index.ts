export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  status: JobStatus;
  is_favorite: boolean;
  status_manually_changed: boolean;
  created_at: string;
  updated_at: string;
}

export type JobStatus = "waiting" | "applied" | "rejected";

export interface CreateJobDto {
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  status?: JobStatus;
  is_favorite?: boolean;
}

export interface UpdateJobDto {
  id: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  status?: JobStatus;
  is_favorite?: boolean;
}

export interface FilterJobsDto {
  status?: JobStatus;
  is_favorite?: boolean;
  search?: string;
}

export interface Comment {
  id: string;
  job_id: string;
  content: string;
  created_at: string;
}

export interface CreateCommentDto {
  job_id: string;
  content: string;
}

export interface UpdateCommentDto {
  id: string;
  content: string;
}

export interface Attachment {
  id: string;
  job_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export type DocumentType =
  | "cv"
  | "resume"
  | "cover_letter"
  | "portfolio"
  | "certificate"
  | "other";

export interface Document {
  id: string;
  name: string;
  filename: string;
  file_type: string;
  file_size: number;
  document_type: DocumentType;
  created_at: string;
  updated_at: string;
}

export interface JobDocument {
  id: string;
  job_id: string;
  document_id: string;
  name: string;
  filename: string;
  file_type: string;
  file_size: number;
  document_type: DocumentType;
  sent_date: string | null;
  notes: string;
  created_at: string;
}

export interface CreateDocumentDto {
  name: string;
  document_type: DocumentType;
  file: File;
}

export interface LinkDocumentDto {
  job_id: string;
  document_id: string;
  sent_date?: string | null;
  notes?: string;
}

export interface UpdateJobDocumentDto {
  job_id: string;
  document_id: string;
  sent_date?: string | null;
  notes?: string;
}

export interface Statistics {
  total: number;
  waiting: number;
  applied: number;
  rejected: number;
  favorites: number;
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  waiting: "Waiting",
  applied: "Applied",
  rejected: "Rejected",
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  waiting:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
