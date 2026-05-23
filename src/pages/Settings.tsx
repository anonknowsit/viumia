import { useState, useEffect } from "react";
import {
  getSettings,
  updateSettings,
  getStorageUsage,
  getDataDirectory,
  exportDataTo,
  importData,
} from "@/utils/api";
import type { JobStatus } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  Database,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  HardDrive,
  FileText,
  Sparkles,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function Settings() {
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>("applied");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [storage, setStorage] = useState<{
    documents_size: number;
    db_size: number;
    total_size: number;
  } | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  const [dataPath, setDataPath] = useState<string | null>(null);
  const [dataPathLoading, setDataPathLoading] = useState(true);

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Check if running in Tauri
  const inTauri =
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__TAURI__ !== undefined;

  // Load settings on mount
  useEffect(() => {
    if (!inTauri) return;

    Promise.all([
      getSettings().then((settings) => {
        setDefaultStatus(settings.default_status as JobStatus);
      }),
      getStorageUsage().then((usage) => {
        setStorage(usage);
        setStorageLoading(false);
      }),
      getDataDirectory().then((path) => {
        setDataPath(path);
        setDataPathLoading(false);
      }),
    ]).catch((err) => {
      console.error("Failed to load settings:", err);
      setStorageLoading(false);
      setDataPathLoading(false);
    });
  }, [inTauri]);

  const handleSaveDefaultStatus = async (status: JobStatus) => {
    if (!inTauri) return;
    setDefaultStatus(status);
    setSaving(true);
    setSavedMessage(null);

    try {
      await updateSettings({ default_status: status });
      setSavedMessage("Default status updated successfully");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      console.error("Failed to update settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!inTauri) return;
    setExporting(true);
    setExportMessage(null);

    try {
      // Show save dialog to let user choose where to save the backup
      const dialog = await import("@tauri-apps/plugin-dialog");
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const selected = await dialog.save({
        title: "Save Backup",
        defaultPath: `job_planner_backup_${timestamp}.zip`,
        filters: [
          {
            name: "Backup Files",
            extensions: ["zip"],
          },
        ],
      });

      if (selected) {
        const result = await exportDataTo(selected);
        setExportMessage(`Backup saved to: ${result.path}`);
        setTimeout(() => setExportMessage(null), 5000);
      }
    } catch (err) {
      if (err !== "User cancelled") {
        setExportMessage(
          err instanceof Error ? err.message : "Failed to export data",
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!inTauri) return;
    setImporting(true);
    setImportMessage(null);

    try {
      // Use Tauri dialog to select file
      const dialog = await import("@tauri-apps/plugin-dialog");
      const selected = await dialog.open({
        multiple: false,
        filters: [
          {
            name: "Backup Files",
            extensions: ["zip"],
          },
        ],
      });

      if (selected) {
        const zipPath = typeof selected === "string" ? selected : selected[0];
        const message = await importData(zipPath);
        setImportMessage(message);
      }
    } catch (err) {
      if (err !== "User cancelled") {
        setImportMessage(
          err instanceof Error ? err.message : "Failed to import data",
        );
      }
    } finally {
      setImporting(false);
    }
  };

  if (!inTauri) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Settings are only available in the desktop app.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-0.5">
            Manage your data and app preferences.
          </p>
        </div>
      </div>

      {/* Default Job Status */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30 rounded-t-xl">
          <CardTitle className="text-lg flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            Default Job Status
          </CardTitle>
          <CardDescription>
            Choose which status new jobs should have when you create them.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select
              value={defaultStatus}
              onValueChange={(v) => handleSaveDefaultStatus(v as JobStatus)}
              disabled={saving}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {savedMessage && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                {savedMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30 rounded-t-xl">
          <CardTitle className="text-lg flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Storage Usage
          </CardTitle>
          <CardDescription>
            See how much space your data is using on disk.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {storageLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : storage ? (
            <div className="space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Total</span>
                <span className="font-semibold">
                  {formatBytes(storage.total_size)}
                </span>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    Database
                  </span>
                  <span>{formatBytes(storage.db_size)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Documents
                  </span>
                  <span>{formatBytes(storage.documents_size)}</span>
                </div>
              </div>

              {/* Data Location */}
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Data Location
                </div>
                {dataPathLoading ? (
                  <div className="text-xs text-muted-foreground">
                    Loading path...
                  </div>
                ) : dataPath ? (
                  <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1 break-all">
                    {dataPath}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Could not load storage information.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30 rounded-t-xl">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export your data as a backup or import from a previous backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-muted-foreground">
                  Backup your database and documents as a ZIP file.
                </p>
              </div>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              className="gap-2"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>

          {exportMessage && (
            <div
              className={`flex items-center gap-2 text-sm ${
                exportMessage.startsWith("Backup")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {exportMessage.startsWith("Backup") ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {exportMessage}
            </div>
          )}

          {/* Import */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Upload className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium">Import Data</p>
                <p className="text-sm text-muted-foreground">
                  Restore from a backup file. This will replace your current
                  data.
                </p>
              </div>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing}
              variant="outline"
              className="gap-2"
            >
              {importing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </div>

          {importMessage && (
            <div
              className={`flex items-center gap-2 text-sm ${
                importMessage.includes("successful")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {importMessage.includes("successful") ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {importMessage}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
