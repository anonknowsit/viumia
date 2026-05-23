use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Enable foreign keys
    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT DEFAULT '',
            description TEXT DEFAULT '',
            url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'applied',
            is_favorite INTEGER NOT NULL DEFAULT 0,
            status_manually_changed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    "#,
    )
    .execute(pool)
    .await?;

    // Migration: add status_manually_changed column if it doesn't exist (for existing DBs)
    sqlx::query(
        r#"ALTER TABLE jobs ADD COLUMN status_manually_changed INTEGER NOT NULL DEFAULT 0"#,
    )
    .execute(pool)
    .await
    .ok(); // Ignore error if column already exists

    // Auto-expire: change 'applied' → 'waiting' after 2 days if user didn't manually change status
    sqlx::query(
        r#"UPDATE jobs SET status = 'waiting', updated_at = datetime('now')
           WHERE status = 'applied'
             AND status_manually_changed = 0
             AND created_at < datetime('now', '-2 days')"#,
    )
    .execute(pool)
    .await
    .ok(); // Best-effort, don't fail if this errors

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
    "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
    "#,
    )
    .execute(pool)
    .await?;

    // Global document templates (CV, Resume, Portfolio, etc.)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            document_type TEXT NOT NULL DEFAULT 'other',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    "#,
    )
    .execute(pool)
    .await?;

    // Junction table: links documents to jobs with optional sent date
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_documents (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            document_id TEXT NOT NULL,
            sent_date TEXT,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            UNIQUE(job_id, document_id)
        );
    "#,
    )
    .execute(pool)
    .await?;

    // App settings (key-value store for user preferences)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    "#,
    )
    .execute(pool)
    .await?;

    // Insert default settings if they don't exist
    sqlx::query(
        r#"INSERT OR IGNORE INTO app_settings (key, value) VALUES ('default_status', 'applied')"#,
    )
    .execute(pool)
    .await
    .ok(); // Best-effort

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobRow {
    pub id: String,
    pub title: String,
    pub company: String,
    pub location: String,
    pub description: String,
    pub url: String,
    pub status: String,
    #[sqlx(rename = "is_favorite")]
    pub is_favorite: bool,
    #[sqlx(rename = "status_manually_changed")]
    pub status_manually_changed: bool,
    #[sqlx(rename = "created_at")]
    pub created_at: String,
    #[sqlx(rename = "updated_at")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct CommentRow {
    #[sqlx(rename = "job_id")]
    pub job_id: String,
    pub content: String,
    #[sqlx(rename = "created_at")]
    pub created_at: String,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AttachmentRow {
    #[sqlx(rename = "job_id")]
    pub job_id: String,
    pub filename: String,
    #[sqlx(rename = "file_type")]
    pub file_type: String,
    #[sqlx(rename = "file_size")]
    pub file_size: i64,
    #[sqlx(rename = "file_path")]
    pub file_path: String,
    #[sqlx(rename = "created_at")]
    pub created_at: String,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct DocumentRow {
    pub id: String,
    pub name: String,
    pub filename: String,
    #[sqlx(rename = "file_type")]
    pub file_type: String,
    #[sqlx(rename = "file_size")]
    pub file_size: i64,
    #[sqlx(rename = "file_path")]
    pub file_path: String,
    #[sqlx(rename = "document_type")]
    pub document_type: String,
    #[sqlx(rename = "created_at")]
    pub created_at: String,
    #[sqlx(rename = "updated_at")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobDocumentRow {
    pub id: String,
    #[sqlx(rename = "job_id")]
    pub job_id: String,
    #[sqlx(rename = "document_id")]
    pub document_id: String,
    pub name: String,
    pub filename: String,
    #[sqlx(rename = "file_type")]
    pub file_type: String,
    #[sqlx(rename = "file_size")]
    pub file_size: i64,
    #[sqlx(rename = "document_type")]
    pub document_type: String,
    #[sqlx(rename = "sent_date")]
    pub sent_date: Option<String>,
    pub notes: String,
    #[sqlx(rename = "created_at")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentResponse {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub file_type: String,
    pub file_size: i64,
    pub document_type: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttachmentFileResponse {
    pub data: String,
    pub filename: String,
    pub file_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Statistics {
    pub total: i64,
    pub waiting: i64,
    pub applied: i64,
    pub rejected: i64,
    pub favorites: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub default_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettingsRequest {
    pub default_status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageUsage {
    pub documents_size: i64,
    pub attachments_size: i64,
    pub db_size: i64,
    pub total_size: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub path: String,
}

pub async fn get_statistics(pool: &SqlitePool) -> Result<Statistics, sqlx::Error> {
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
        .fetch_one(pool)
        .await?;
    let waiting: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE status = 'waiting'")
        .fetch_one(pool)
        .await?;
    let applied: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE status = 'applied'")
        .fetch_one(pool)
        .await?;
    let rejected: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE status = 'rejected'")
        .fetch_one(pool)
        .await?;
    let favorites: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE is_favorite = 1")
        .fetch_one(pool)
        .await?;

    Ok(Statistics {
        total,
        waiting,
        applied,
        rejected,
        favorites,
    })
}
