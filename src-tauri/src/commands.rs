use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::fs;
use std::io::Write;
use tauri::{Manager, State};
use uuid::Uuid;

use crate::db::{
    AppSettings, AttachmentFileResponse, AttachmentRow, CommentRow, DocumentResponse, DocumentRow,
    ExportResult, JobDocumentRow, JobRow, Statistics, StorageUsage, UpdateSettingsRequest,
};

// --- Request/Response Types ---

#[derive(Debug, Deserialize)]
pub struct CreateJobRequest {
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub status: Option<String>,
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateJobRequest {
    pub id: String,
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub status: Option<String>,
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct FilterJobsRequest {
    pub status: Option<String>,
    pub is_favorite: Option<bool>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommentRequest {
    pub job_id: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct AttachmentResponse {
    pub id: String,
    pub job_id: String,
    pub filename: String,
    pub file_type: String,
    pub file_size: i64,
    pub created_at: String,
}

// --- Helper to build filter query ---

// --- Job Commands ---

#[tauri::command]
pub async fn get_jobs(
    pool: State<'_, SqlitePool>,
    filter: Option<FilterJobsRequest>,
) -> Result<Vec<JobRow>, String> {
    let f = filter.unwrap_or(FilterJobsRequest {
        status: None,
        is_favorite: None,
        search: None,
    });

    // Fixed query with nullable parameters - sqlx validates at compile time.
    // Passing NULL for the flag skips that filter branch entirely.
    let jobs = sqlx::query_as::<_, JobRow>(
        r"SELECT * FROM jobs
           WHERE (?1 IS NULL OR status = ?1)
             AND (?2 IS NULL OR is_favorite = ?2)
             AND (?3 IS NULL OR title LIKE ?4 OR company LIKE ?4)
           ORDER BY updated_at DESC",
    )
    .bind(f.status)
    .bind(f.is_favorite.map(|b| if b { 1 } else { 0 }))
    .bind(f.search.as_ref())
    .bind(f.search.as_ref().map(|s| format!("%{s}%")))
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(jobs)
}

#[tauri::command]
pub async fn create_job(
    pool: State<'_, SqlitePool>,
    request: CreateJobRequest,
) -> Result<JobRow, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let status_manually_changed = if request.status.is_some() { 1 } else { 0 };
    let status = request.status.unwrap_or_else(|| "applied".to_string());
    let is_favorite = request.is_favorite.unwrap_or(false);

    sqlx::query(
        "INSERT INTO jobs (id, title, company, location, description, url, status, is_favorite, status_manually_changed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&request.title)
    .bind(&request.company)
    .bind(request.location.unwrap_or_default())
    .bind(request.description.unwrap_or_default())
    .bind(request.url.unwrap_or_default())
    .bind(&status)
    .bind(is_favorite)
    .bind(status_manually_changed)
    .bind(&now)
    .bind(&now)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_job_by_id(pool, id).await
}

#[tauri::command]
pub async fn update_job(
    pool: State<'_, SqlitePool>,
    request: UpdateJobRequest,
) -> Result<JobRow, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Fetch current job to preserve fields not being updated
    let result = sqlx::query_as::<_, JobRow>("SELECT * FROM jobs WHERE id = ?")
        .bind(&request.id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let current = match result {
        Some(j) => j,
        None => return Err("Job not found".to_string()),
    };

    let new_title = request.title.unwrap_or(current.title);
    let new_company = request.company.unwrap_or(current.company);
    let new_location = request.location.unwrap_or(current.location);
    let new_description = request.description.unwrap_or(current.description);
    let new_url = request.url.unwrap_or(current.url);

    // Track if user manually changed the status (check before consuming)
    let status_manually_changed = if request.status.is_some() {
        1
    } else {
        if current.status_manually_changed {
            1
        } else {
            0
        }
    };
    let new_status = request.status.unwrap_or(current.status);
    let new_favorite = request.is_favorite.unwrap_or(current.is_favorite);

    sqlx::query(
        "UPDATE jobs SET title = ?, company = ?, location = ?, description = ?, url = ?, status = ?, is_favorite = ?, status_manually_changed = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&new_title)
    .bind(&new_company)
    .bind(&new_location)
    .bind(&new_description)
    .bind(&new_url)
    .bind(&new_status)
    .bind(new_favorite)
    .bind(status_manually_changed)
    .bind(&now)
    .bind(&request.id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_job_by_id(pool, request.id).await
}

#[tauri::command]
pub async fn delete_job(pool: State<'_, SqlitePool>, id: String) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM jobs WHERE id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

#[tauri::command]
pub async fn get_job_by_id(pool: State<'_, SqlitePool>, id: String) -> Result<JobRow, String> {
    let job = sqlx::query_as::<_, JobRow>("SELECT * FROM jobs WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    job.ok_or_else(|| "Job not found".to_string())
}

#[tauri::command]
pub async fn get_statistics(pool: State<'_, SqlitePool>) -> Result<Statistics, String> {
    crate::db::get_statistics(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

// --- Comment Commands ---

#[tauri::command]
pub async fn get_comments(
    pool: State<'_, SqlitePool>,
    job_id: String,
) -> Result<Vec<CommentRow>, String> {
    let comments = sqlx::query_as::<_, CommentRow>(
        "SELECT * FROM comments WHERE job_id = ? ORDER BY created_at DESC",
    )
    .bind(&job_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(comments)
}

#[tauri::command]
pub async fn create_comment(
    pool: State<'_, SqlitePool>,
    request: CreateCommentRequest,
) -> Result<CommentRow, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query("INSERT INTO comments (id, job_id, content, created_at) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(&request.job_id)
        .bind(&request.content)
        .bind(&now)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(CommentRow {
        id,
        job_id: request.job_id,
        content: request.content,
        created_at: now,
    })
}

#[tauri::command]
pub async fn update_comment(
    pool: State<'_, SqlitePool>,
    id: String,
    content: String,
) -> Result<CommentRow, String> {
    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query("UPDATE comments SET content = ?, created_at = ? WHERE id = ?")
        .bind(&content)
        .bind(&now)
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let comment = sqlx::query_as::<_, CommentRow>("SELECT * FROM comments WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    comment.ok_or_else(|| "Comment not found".to_string())
}

#[tauri::command]
pub async fn delete_comment(pool: State<'_, SqlitePool>, id: String) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM comments WHERE id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

// --- Attachment Commands ---

#[tauri::command]
pub async fn get_attachments(
    pool: State<'_, SqlitePool>,
    job_id: String,
) -> Result<Vec<AttachmentResponse>, String> {
    let attachments = sqlx::query_as::<_, AttachmentRow>(
        "SELECT * FROM attachments WHERE job_id = ? ORDER BY created_at DESC",
    )
    .bind(&job_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let response: Vec<AttachmentResponse> = attachments
        .into_iter()
        .map(|a| AttachmentResponse {
            id: a.id,
            job_id: a.job_id,
            filename: a.filename,
            file_type: a.file_type,
            file_size: a.file_size,
            created_at: a.created_at,
        })
        .collect();

    Ok(response)
}

/// Uploads a file (base64 encoded) to the local attachments directory and creates a DB record.
#[tauri::command]
pub async fn upload_attachment(
    pool: State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    job_id: String,
    filename: String,
    file_type: String,
    file_data: String,
) -> Result<AttachmentResponse, String> {
    // Get app data directory
    let data_dir = app_handle
        .path()
        .app_local_data_dir()
        .expect("failed to get data dir");

    // Create attachments subdirectory
    let attachments_dir = data_dir.join("attachments");
    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to create attachments directory: {}", e))?;

    // Generate unique filename to avoid collisions
    let id = Uuid::new_v4().to_string();
    let extension = filename.rsplit('.').next().unwrap_or("bin");
    let stored_filename = format!("{}_.{}", id, extension);
    let file_path = attachments_dir.join(&stored_filename);

    // Decode base64 data and write to disk
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &file_data)
        .map_err(|e| format!("Failed to decode file data: {}", e))?;

    fs::write(&file_path, &bytes).map_err(|e| format!("Failed to write file: {}", e))?;

    let file_size = bytes.len() as i64;
    let now = chrono::Utc::now().to_rfc3339();

    // Store relative path for portability
    let relative_path = stored_filename;

    sqlx::query(
        "INSERT INTO attachments (id, job_id, filename, file_type, file_size, file_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&job_id)
    .bind(&filename)
    .bind(&file_type)
    .bind(file_size)
    .bind(&relative_path)
    .bind(&now)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(AttachmentResponse {
        id,
        job_id,
        filename,
        file_type,
        file_size,
        created_at: now,
    })
}

/// Reads a file from the attachments directory and returns it as base64 data.

#[tauri::command]
pub async fn get_attachment_file(
    pool: State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<AttachmentFileResponse, String> {
    // Get the attachment record
    let attachment = sqlx::query_as::<_, AttachmentRow>("SELECT * FROM attachments WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let att = attachment.ok_or_else(|| "Attachment not found".to_string())?;

    // Build file path
    let data_dir = app_handle
        .path()
        .app_local_data_dir()
        .expect("failed to get data dir");
    let file_path = data_dir.join("attachments").join(&att.file_path);

    // Read file and encode as base64
    let bytes = fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);

    Ok(AttachmentFileResponse {
        data,
        filename: att.filename,
        file_type: att.file_type,
    })
}

#[tauri::command]
pub async fn delete_attachment(
    pool: State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<bool, String> {
    // Get the attachment record first to find the file path
    let attachment = sqlx::query_as::<_, AttachmentRow>("SELECT * FROM attachments WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    // If found, delete the physical file
    if let Some(att) = attachment {
        let data_dir = app_handle
            .path()
            .app_local_data_dir()
            .expect("failed to get data dir");
        let file_path = data_dir.join("attachments").join(&att.file_path);

        if file_path.exists() {
            fs::remove_file(&file_path).ok(); // Best-effort deletion
        }
    }

    // Delete DB record
    let result = sqlx::query("DELETE FROM attachments WHERE id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

// --- Document Library Commands ---

#[tauri::command]
pub async fn get_documents(pool: State<'_, SqlitePool>) -> Result<Vec<DocumentResponse>, String> {
    let docs = sqlx::query_as::<_, DocumentRow>("SELECT * FROM documents ORDER BY created_at DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let response: Vec<DocumentResponse> = docs
        .into_iter()
        .map(|d| DocumentResponse {
            id: d.id,
            name: d.name,
            filename: d.filename,
            file_type: d.file_type,
            file_size: d.file_size,
            document_type: d.document_type,
            created_at: d.created_at,
            updated_at: d.updated_at,
        })
        .collect();

    Ok(response)
}

#[tauri::command]
pub async fn upload_document(
    pool: State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    name: String,
    document_type: String,
    file_data: String,
) -> Result<DocumentResponse, String> {
    let data_dir = app_handle
        .path()
        .app_local_data_dir()
        .expect("failed to get data dir");

    let docs_dir = data_dir.join("documents");
    fs::create_dir_all(&docs_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let extension = name.rsplit('.').next().unwrap_or("bin");
    let stored_filename = format!("{}_.{}", id, extension);
    let file_path = docs_dir.join(&stored_filename);

    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &file_data)
        .map_err(|e| format!("Failed to decode file data: {}", e))?;

    fs::write(&file_path, &bytes).map_err(|e| format!("Failed to write file: {}", e))?;

    let file_size = bytes.len() as i64;
    let file_type = match extension.as_ref() {
        "pdf" => "application/pdf".to_string(),
        "doc" => "application/msword".to_string(),
        "docx" => {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()
        }
        "txt" => "text/plain".to_string(),
        _ => "application/octet-stream".to_string(),
    };
    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO documents (id, name, filename, file_type, file_size, file_path, document_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&stored_filename)
    .bind(&file_type)
    .bind(file_size)
    .bind(&stored_filename)
    .bind(&document_type)
    .bind(now.clone())
    .bind(now.clone())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(DocumentResponse {
        id,
        name,
        filename: stored_filename,
        file_type,
        file_size,
        document_type,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn get_document_file(
    pool: State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<AttachmentFileResponse, String> {
    let doc = sqlx::query_as::<_, DocumentRow>("SELECT * FROM documents WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let d = doc.ok_or_else(|| "Document not found".to_string())?;

    let data_dir = app_handle
        .path()
        .app_local_data_dir()
        .expect("failed to get data dir");
    let file_path = data_dir.join("documents").join(&d.file_path);

    let bytes = fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);

    Ok(AttachmentFileResponse {
        data,
        filename: d.filename,
        file_type: d.file_type,
    })
}

#[tauri::command]
pub async fn delete_document(
    pool: State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<bool, String> {
    let doc = sqlx::query_as::<_, DocumentRow>("SELECT * FROM documents WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(d) = doc {
        let data_dir = app_handle
            .path()
            .app_local_data_dir()
            .expect("failed to get data dir");
        let file_path = data_dir.join("documents").join(&d.file_path);
        if file_path.exists() {
            fs::remove_file(&file_path).ok();
        }
    }

    // Delete job_documents links first (CASCADE should handle it, but be explicit)
    sqlx::query("DELETE FROM job_documents WHERE document_id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let result = sqlx::query("DELETE FROM documents WHERE id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

// --- Job-Document Linking Commands ---

/// Get all documents linked to a specific job
#[tauri::command]
pub async fn get_job_documents(
    pool: State<'_, SqlitePool>,
    job_id: String,
) -> Result<Vec<JobDocumentRow>, String> {
    let rows = sqlx::query_as::<_, JobDocumentRow>(
        "SELECT jd.id, jd.job_id, jd.document_id, d.name, d.filename, d.file_type, d.file_size, d.document_type, jd.sent_date, jd.notes, jd.created_at
         FROM job_documents jd
         JOIN documents d ON jd.document_id = d.id
         WHERE jd.job_id = ?
         ORDER BY jd.created_at DESC"
    )
    .bind(&job_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Link a document to a job
#[tauri::command]
pub async fn link_document(
    pool: State<'_, SqlitePool>,
    job_id: String,
    document_id: String,
    sent_date: Option<String>,
    notes: Option<String>,
) -> Result<JobDocumentRow, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let notes = notes.unwrap_or_default();

    // Check if already linked
    let existing =
        sqlx::query("SELECT COUNT(*) FROM job_documents WHERE job_id = ? AND document_id = ?")
            .bind(&job_id)
            .bind(&document_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let count: i64 = existing.get(0);
    if count > 0 {
        return Err("Document already linked to this job".to_string());
    }

    sqlx::query(
        "INSERT INTO job_documents (id, job_id, document_id, sent_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&job_id)
    .bind(&document_id)
    .bind(&sent_date)
    .bind(&notes)
    .bind(&now)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Fetch and return the created link with document info
    let row = sqlx::query_as::<_, JobDocumentRow>(
        "SELECT jd.id, jd.job_id, jd.document_id, d.name, d.filename, d.file_type, d.file_size, d.document_type, jd.sent_date, jd.notes, jd.created_at
         FROM job_documents jd
         JOIN documents d ON jd.document_id = d.id
         WHERE jd.id = ?"
    )
    .bind(&id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(row)
}

/// Unlink a document from a job
#[tauri::command]
pub async fn unlink_document(
    pool: State<'_, SqlitePool>,
    job_id: String,
    document_id: String,
) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM job_documents WHERE job_id = ? AND document_id = ?")
        .bind(&job_id)
        .bind(&document_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

/// Update sent_date or notes for a job-document link
#[tauri::command]
pub async fn update_job_document(
    pool: State<'_, SqlitePool>,
    job_id: String,
    document_id: String,
    sent_date: Option<String>,
    notes: Option<String>,
) -> Result<JobDocumentRow, String> {
    sqlx::query(
        "UPDATE job_documents SET sent_date = ?, notes = ? WHERE job_id = ? AND document_id = ?",
    )
    .bind(&sent_date)
    .bind(notes.as_deref().unwrap_or(""))
    .bind(&job_id)
    .bind(&document_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query_as::<_, JobDocumentRow>(
        "SELECT jd.id, jd.job_id, jd.document_id, d.name, d.filename, d.file_type, d.file_size, d.document_type, jd.sent_date, jd.notes, jd.created_at
         FROM job_documents jd
         JOIN documents d ON jd.document_id = d.id
         WHERE jd.job_id = ? AND jd.document_id = ?"
    )
    .bind(&job_id)
    .bind(&document_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(row)
}

// ============================================================================
// SETTINGS COMMANDS
// ============================================================================

/// Get current app settings
#[tauri::command]
pub async fn get_settings(pool: State<'_, SqlitePool>) -> Result<AppSettings, String> {
    let row: Option<(String, String)> =
        sqlx::query_as("SELECT key, value FROM app_settings WHERE key = 'default_status'")
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let default_status = row.map(|(_, v)| v).unwrap_or_else(|| "applied".to_string());

    Ok(AppSettings { default_status })
}

/// Update app settings
#[tauri::command]
pub async fn update_settings(
    pool: State<'_, SqlitePool>,
    request: UpdateSettingsRequest,
) -> Result<AppSettings, String> {
    if let Some(ref status) = request.default_status {
        match status.as_str() {
            "waiting" | "applied" | "rejected" | "favorite" => {}
            _ => return Err("Invalid status value".to_string()),
        }

        sqlx::query(
            "INSERT INTO app_settings (key, value) VALUES ('default_status', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .bind(status)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    }

    get_settings(pool).await
}

/// Get storage usage breakdown
#[tauri::command]
pub async fn get_storage_usage(
    pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
) -> Result<StorageUsage, String> {
    let docs_size: i64 = sqlx::query_scalar("SELECT COALESCE(SUM(file_size), 0) FROM documents")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            eprintln!("get_storage_usage: failed to query docs size: {}", e);
            e.to_string()
        })?;

    let attachments_size: i64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(file_size), 0) FROM attachments")
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                eprintln!("get_storage_usage: failed to query attachments size: {}", e);
                e.to_string()
            })?;

    let data_dir = app.path().app_local_data_dir().map_err(|e| {
        eprintln!("get_storage_usage: failed to get data dir: {}", e);
        format!("Failed to get data dir: {}", e)
    })?;
    let db_path = data_dir.join("viumia.db");
    let db_size = std::fs::metadata(&db_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    Ok(StorageUsage {
        documents_size: docs_size,
        attachments_size: attachments_size,
        db_size,
        total_size: docs_size + attachments_size + db_size,
    })
}

/// Get the data directory path
#[tauri::command]
pub async fn get_data_directory(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_local_data_dir().map_err(|e| {
        eprintln!("get_data_directory: failed to get data dir: {}", e);
        format!("Failed to get data dir: {}", e)
    })?;

    Ok(data_dir.to_string_lossy().to_string())
}

/// Export all data as a ZIP backup file
#[tauri::command]
pub async fn export_data(
    _pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
) -> Result<ExportResult, String> {
    let data_dir = app.path().app_local_data_dir().map_err(|e| {
        eprintln!("export_data: failed to get data dir: {}", e);
        format!("Failed to get data dir: {}", e)
    })?;
    eprintln!("export_data: data_dir = {}", data_dir.display());

    let db_path = data_dir.join("viumia.db");

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("viumia_backup_{}.zip", timestamp);
    let backup_path = data_dir.join(&backup_filename);

    let file = std::fs::File::create(&backup_path)
        .map_err(|e| format!("Failed to create backup file: {}", e))?;

    let mut builder = zip::ZipWriter::new(file);
    let options: zip::write::FileOptions<()> =
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    // Add database file
    if db_path.exists() {
        let db_data =
            std::fs::read(&db_path).map_err(|e| format!("Failed to read database: {}", e))?;

        builder
            .start_file("viumia.db", options)
            .map_err(|e| format!("Failed to add DB to ZIP: {}", e))?;
        builder
            .write_all(&db_data)
            .map_err(|e| format!("Failed to write DB to ZIP: {}", e))?;
    }

    // Add documents folder
    let docs_dir = data_dir.join("documents");
    if docs_dir.exists() {
        for entry in std::fs::read_dir(&docs_dir)
            .map_err(|e| format!("Failed to read documents dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if path.is_file() {
                let filename = path.file_name().unwrap().to_string_lossy().to_string();
                let file_data =
                    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

                builder
                    .start_file(format!("documents/{}", filename), options)
                    .map_err(|e| format!("Failed to add file to ZIP: {}", e))?;
                builder
                    .write_all(&file_data)
                    .map_err(|e| format!("Failed to write file to ZIP: {}", e))?;
            }
        }
    }

    // Add attachments folder
    let attachments_dir = data_dir.join("attachments");
    if attachments_dir.exists() {
        for entry in std::fs::read_dir(&attachments_dir)
            .map_err(|e| format!("Failed to read attachments dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if path.is_file() {
                let filename = path.file_name().unwrap().to_string_lossy().to_string();
                let file_data =
                    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

                builder
                    .start_file(format!("attachments/{}", filename), options)
                    .map_err(|e| format!("Failed to add file to ZIP: {}", e))?;
                builder
                    .write_all(&file_data)
                    .map_err(|e| format!("Failed to write file to ZIP: {}", e))?;
            }
        }
    }

    builder
        .finish()
        .map_err(|e| format!("Failed to finish ZIP: {}", e))?;

    Ok(ExportResult {
        path: backup_path.to_string_lossy().to_string(),
    })
}

/// Export all data to a user-specified path
#[tauri::command]
pub async fn export_data_to(
    _pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
    export_path: String,
) -> Result<ExportResult, String> {
    let data_dir = app.path().app_local_data_dir().map_err(|e| {
        eprintln!("export_data_to: failed to get data dir: {}", e);
        format!("Failed to get data dir: {}", e)
    })?;
    eprintln!("export_data_to: exporting to {}", export_path);

    let db_path = data_dir.join("viumia.db");
    let backup_path = std::path::PathBuf::from(&export_path);

    let file = std::fs::File::create(&backup_path)
        .map_err(|e| format!("Failed to create backup file: {}", e))?;

    let mut builder = zip::ZipWriter::new(file);
    let options: zip::write::FileOptions<()> =
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    // Add database file
    if db_path.exists() {
        let db_data =
            std::fs::read(&db_path).map_err(|e| format!("Failed to read database: {}", e))?;

        builder
            .start_file("viumia.db", options)
            .map_err(|e| format!("Failed to add DB to ZIP: {}", e))?;
        builder
            .write_all(&db_data)
            .map_err(|e| format!("Failed to write DB to ZIP: {}", e))?;
    }

    // Add documents folder
    let docs_dir = data_dir.join("documents");
    if docs_dir.exists() {
        for entry in std::fs::read_dir(&docs_dir)
            .map_err(|e| format!("Failed to read documents dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if path.is_file() {
                let filename = path.file_name().unwrap().to_string_lossy().to_string();
                let file_data =
                    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

                builder
                    .start_file(format!("documents/{}", filename), options)
                    .map_err(|e| format!("Failed to add file to ZIP: {}", e))?;
                builder
                    .write_all(&file_data)
                    .map_err(|e| format!("Failed to write file to ZIP: {}", e))?;
            }
        }
    }

    // Add attachments folder
    let attachments_dir = data_dir.join("attachments");
    if attachments_dir.exists() {
        for entry in std::fs::read_dir(&attachments_dir)
            .map_err(|e| format!("Failed to read attachments dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if path.is_file() {
                let filename = path.file_name().unwrap().to_string_lossy().to_string();
                let file_data =
                    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

                builder
                    .start_file(format!("attachments/{}", filename), options)
                    .map_err(|e| format!("Failed to add file to ZIP: {}", e))?;
                builder
                    .write_all(&file_data)
                    .map_err(|e| format!("Failed to write file to ZIP: {}", e))?;
            }
        }
    }

    builder
        .finish()
        .map_err(|e| format!("Failed to finish ZIP: {}", e))?;

    Ok(ExportResult {
        path: backup_path.to_string_lossy().to_string(),
    })
}

/// Import data from a ZIP backup file
#[tauri::command]
pub async fn import_data(
    _pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
    zip_path: String,
) -> Result<String, String> {
    use std::io::Read;

    eprintln!("import_data: zip_path = {}", zip_path);
    let data_dir = app.path().app_local_data_dir().map_err(|e| {
        eprintln!("import_data: failed to get data dir: {}", e);
        format!("Failed to get data dir: {}", e)
    })?;
    eprintln!("import_data: data_dir = {}", data_dir.display());

    let zip_data =
        std::fs::read(&zip_path).map_err(|e| format!("Failed to read backup file: {}", e))?;

    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(&zip_data))
        .map_err(|e| format!("Invalid backup file: {}", e))?;

    // Create directories
    std::fs::create_dir_all(data_dir.join("documents"))
        .map_err(|e| format!("Failed to create documents dir: {}", e))?;
    std::fs::create_dir_all(data_dir.join("attachments"))
        .map_err(|e| format!("Failed to create attachments dir: {}", e))?;

    // Extract files
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to open ZIP entry: {}", e))?;

        let entry_name = file.name().to_string();
        let mut content = Vec::new();
        file.read_to_end(&mut content)
            .map_err(|e| format!("Failed to read entry: {}", e))?;

        // Extract database file
        if entry_name == "viumia.db" {
            let db_path = data_dir.join("viumia.db");
            std::fs::write(&db_path, &content)
                .map_err(|e| format!("Failed to write database: {}", e))?;
        }
        // Extract documents
        else if let Some(filename) = entry_name.strip_prefix("documents/") {
            if !filename.is_empty() && !file.is_dir() {
                let outpath = data_dir.join("documents").join(filename);
                std::fs::create_dir_all(outpath.parent().unwrap_or(&data_dir))
                    .map_err(|e| format!("Failed to create dir: {}", e))?;
                std::fs::write(&outpath, &content)
                    .map_err(|e| format!("Failed to write file: {}", e))?;
            }
        }
        // Extract attachments
        else if let Some(filename) = entry_name.strip_prefix("attachments/") {
            if !filename.is_empty() && !file.is_dir() {
                let outpath = data_dir.join("attachments").join(filename);
                std::fs::create_dir_all(outpath.parent().unwrap_or(&data_dir))
                    .map_err(|e| format!("Failed to create dir: {}", e))?;
                std::fs::write(&outpath, &content)
                    .map_err(|e| format!("Failed to write file: {}", e))?;
            }
        }
    }

    Ok("Import successful. Please restart the application for changes to take effect.".to_string())
}
