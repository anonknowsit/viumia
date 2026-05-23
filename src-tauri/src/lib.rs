mod commands;
mod db;

use sqlx::sqlite::SqliteConnectOptions;
use sqlx::SqlitePool;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Set window icon explicitly
            let window = app.get_webview_window("main").expect("no main window");
            if let Some(icon) = app_handle.default_window_icon() {
                let _ = window.set_icon(icon.clone());
            }

            // Initialize database path
            let data_dir = app_handle
                .path()
                .app_local_data_dir()
                .expect("failed to get data dir");

            // Ensure the directory exists before creating the database
            std::fs::create_dir_all(&data_dir).expect("failed to create data directory");

            let db_path = data_dir.join("job_planner.db");
            println!("Database path: {}", db_path.display());

            // Use SqliteConnectOptions API - avoids URL parsing issues on Windows
            let connect_options = SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true);

            // Initialize DB using a blocking tokio runtime
            let pool = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("failed to create runtime")
                .block_on(async {
                    let pool = SqlitePool::connect_with(connect_options)
                        .await
                        .expect("failed to connect to database");

                    db::migrate(&pool).await.expect("failed to run migrations");

                    pool
                });

            // Store pool in app state for use in commands
            app.manage(pool);

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_jobs,
            commands::create_job,
            commands::update_job,
            commands::delete_job,
            commands::get_job_by_id,
            commands::get_statistics,
            commands::get_comments,
            commands::create_comment,
            commands::update_comment,
            commands::delete_comment,
            commands::get_attachments,
            commands::upload_attachment,
            commands::get_attachment_file,
            commands::delete_attachment,
            commands::get_documents,
            commands::upload_document,
            commands::get_document_file,
            commands::delete_document,
            commands::get_job_documents,
            commands::link_document,
            commands::unlink_document,
            commands::update_job_document,
            // Settings
            commands::get_settings,
            commands::update_settings,
            commands::get_storage_usage,
            commands::get_data_directory,
            commands::export_data,
            commands::export_data_to,
            commands::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
