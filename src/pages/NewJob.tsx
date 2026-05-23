import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  createJob,
  getDocuments,
  linkDocument,
  getSettings,
} from "@/utils/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { JobStatus, Document } from "@/types";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Link as LinkIcon,
  FileText,
  Star,
  AlertCircle,
  Save,
  Sparkles,
  Link2,
} from "lucide-react";
import SaveSuccessModal from "@/components/SaveSuccessModal";

type FormErrors = Record<string, string>;

export default function NewJob() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    url: "",
    status: "applied" as JobStatus,
    is_favorite: false,
  });

  // Fetch default status from settings
  useEffect(() => {
    getSettings()
      .then((settings) => {
        setForm((prev) => ({
          ...prev,
          status: settings.default_status as JobStatus,
        }));
      })
      .catch(() => {
        // Fall back to 'applied' if settings fail
      });
  }, []);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<string[]>([]);

  const updateField = useCallback(
    (field: string, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear error when user types
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate({ ...form, [field]: form[field as keyof typeof form] });
  };

  const validate = (data: typeof form): FormErrors => {
    const errs: FormErrors = {};
    if (!data.title.trim()) errs.title = "Job title is required";
    if (!data.company.trim()) errs.company = "Company name is required";
    if (data.url && !/^https?:\/\/.+/.test(data.url))
      errs.url = "Must be a valid URL";
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    setTouched({ title: true, company: true, url: true });

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      // Create job first
      const job = await createJob(form);

      // Then link all selected documents
      for (const docId of linkedDocuments) {
        try {
          await linkDocument({ job_id: job.id, document_id: docId });
        } catch (linkErr) {
          console.error(`Failed to link document ${docId}:`, linkErr);
        }
      }

      setSuccess(true);
      setTimeout(() => navigate(`/jobs/${job.id}`), 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create job. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Document linking handlers
  const toggleLinkDocument = (docId: string) => {
    setLinkedDocuments((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  // Load documents (separate effect to avoid double-fetch with settings)
  useEffect(() => {
    getDocuments()
      .then(setAllDocuments)
      .catch(() => {});
  }, []);

  const fieldError = (field: string) =>
    touched[field] && errors[field] ? (
      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" />
        {errors[field]}
      </p>
    ) : null;

  const inputClass = (field: string) =>
    touched[field] && errors[field]
      ? "border-destructive focus-visible:ring-destructive"
      : "";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Add New Job</h1>
          </div>
          <p className="text-muted-foreground mt-0.5">
            Track a new job application. Fields marked with{" "}
            <span className="text-destructive">*</span> are required.
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="shadow-md">
          <CardHeader className="border-b bg-muted/30 rounded-t-xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Job Information
            </CardTitle>
            <CardDescription>
              Fill in the details of the position you want to track.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                Job Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Senior Frontend Developer"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                onBlur={() => handleBlur("title")}
                className={inputClass("title")}
                required
              />
              {fieldError("title")}
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Company <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Acme Inc."
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
                onBlur={() => handleBlur("company")}
                className={inputClass("company")}
                required
              />
              {fieldError("company")}
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location
              </label>
              <Input
                placeholder="e.g. Berlin, DE (Remote)"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Job URL
              </label>
              <Input
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => updateField("url", e.target.value)}
                onBlur={() => handleBlur("url")}
                className={inputClass("url")}
              />
              {fieldError("url")}
            </div>

            {/* Status + Favorite row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Status
                </label>
                <Select
                  value={form.status}
                  onValueChange={(v) => updateField("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Favorite */}
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={() => updateField("is_favorite", !form.is_favorite)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors w-full"
                >
                  <Star
                    className={`h-4 w-4 transition-colors ${form.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                  {form.is_favorite ? "Favorited" : "Mark as favorite"}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Description / Notes
              </label>
              <textarea
                placeholder="Any notes about this position, requirements, or your thoughts..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              />
            </div>

            {/* Link Documents from Library */}
            {allDocuments.length > 0 && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Link Documents
                  <span className="text-xs text-muted-foreground/60 font-normal">
                    (from your library)
                  </span>
                </label>
                <div className="rounded-lg border divide-y">
                  {allDocuments.map((doc) => {
                    const isLinked = linkedDocuments.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleLinkDocument(doc.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                            isLinked
                              ? "bg-primary border-primary"
                              : "border-input"
                          }`}
                        >
                          {isLinked && (
                            <svg
                              className="h-3 w-3 text-primary-foreground"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.document_type} •{" "}
                            {formatFileSize(doc.file_size)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 shadow-md"
              >
                {saving ? (
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Job
                  </>
                )}
              </Button>
              <Link to="/jobs">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Save Success Modal */}
      <SaveSuccessModal open={success} />
    </div>
  );
}
