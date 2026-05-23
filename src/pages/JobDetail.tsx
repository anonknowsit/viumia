import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getJobById,
  updateJob,
  deleteJob,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getDocuments,
  getJobDocuments,
  linkDocument,
  unlinkDocument,
  downloadDocument,
} from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import type { Job, Comment, JobStatus, Document, JobDocument } from "@/types";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  ExternalLink,
  Star,
  Trash2,
  MessageSquare,
  Send,
  Edit3,
  Check,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  FileText,
  File,
  Image,
  FileSpreadsheet,
  Link2,
  Unlink,
} from "lucide-react";
import { format } from "date-fns";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [jobDocuments, setJobDocuments] = useState<JobDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [linkDocumentOpen, setLinkDocumentOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getJobById(id),
      getComments(id),
      getJobDocuments(id),
      getDocuments(),
    ])
      .then(([j, c, jd, docs]) => {
        setJob(j);
        setEditForm(j);
        setComments(c);
        setJobDocuments(jd);
        setAllDocuments(docs);
      })
      .catch(() => navigate("/jobs"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    if (!id || !editForm) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJob({ id, ...editForm });
      setJob(updated);
      setEditing(false);
      setSuccess("Job updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    if (!id) return;
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteJob(id);
      navigate("/jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job.");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;
    try {
      const comment = await createComment({
        job_id: id,
        content: newComment.trim(),
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete comment.",
      );
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      const updated = await updateComment({
        id: commentId,
        content: editingCommentText.trim(),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c)),
      );
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update comment.",
      );
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const toggleFavorite = async () => {
    if (!id || !job) return;
    try {
      const updated = await updateJob({
        id,
        is_favorite: !job.is_favorite,
      });
      setJob(updated);
      setEditForm(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to toggle favorite.",
      );
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return Image;
    if (fileType.includes("pdf")) return FileText;
    if (fileType.includes("spreadsheet") || fileType.includes("excel"))
      return FileSpreadsheet;
    return File;
  };

  // Document linking handlers
  const handleLinkDocument = async (documentId: string) => {
    if (!id) return;
    try {
      const jd = await linkDocument({ job_id: id, document_id: documentId });
      setJobDocuments((prev) => [jd, ...prev]);
      setLinkDocumentOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link document.");
    }
  };

  const handleUnlinkDocument = async (documentId: string) => {
    if (!id) return;
    try {
      await unlinkDocument(id, documentId);
      setJobDocuments((prev) =>
        prev.filter((jd) => jd.document_id !== documentId),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to unlink document.",
      );
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      await downloadDocument(documentId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download document.",
      );
    }
  };

  const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    cv: "CV",
    resume: "Resume",
    cover_letter: "Cover Letter",
    portfolio: "Portfolio",
    certificate: "Certificate",
    other: "Other",
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Available documents (not yet linked to this job)
  const availableDocuments = allDocuments.filter(
    (doc) => !jobDocuments.some((jd) => jd.document_id === doc.id),
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="h-6 w-64 rounded bg-muted" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) return null;

  const displayJob = editing ? { ...job, ...editForm } : job;

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 animate-in fade-in slide-in-from-top-2 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/jobs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editing ? (
                <Input
                  value={editForm.title ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="text-2xl font-bold w-[300px]"
                />
              ) : (
                displayJob.title
              )}
            </h1>
            <p className="text-muted-foreground">
              {editing ? (
                <Input
                  value={editForm.company ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, company: e.target.value })
                  }
                  className="w-[200px] inline-block"
                />
              ) : (
                displayJob.company
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFavorite}
            title={
              job.is_favorite ? "Remove from favorites" : "Add to favorites"
            }
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-5 w-5 ${
                job.is_favorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
              >
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="mr-1 h-3 w-3" />{" "}
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit3 className="mr-1 h-3 w-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteClick}>
                <Trash2 className="mr-1 h-3 w-3 text-destructive" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Job Info Card */}
      <Card className="shadow-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {editing ? (
              <Input
                placeholder="Location"
                value={editForm.location ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                className="flex-1"
              />
            ) : (
              <span className="text-sm">{displayJob.location || "—"}</span>
            )}
          </div>

          {/* URL */}
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            {editing ? (
              <Input
                placeholder="Job URL"
                value={editForm.url ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, url: e.target.value })
                }
                className="flex-1"
              />
            ) : displayJob.url ? (
              <a
                href={displayJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate"
              >
                {displayJob.url}
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            {editing ? (
              <Select
                value={editForm.status ?? "waiting"}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, status: v as JobStatus })
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant={
                  displayJob.status as "waiting" | "applied" | "rejected"
                }
              >
                {displayJob.status.charAt(0).toUpperCase() +
                  displayJob.status.slice(1)}
              </Badge>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Description
            </label>
            {editing ? (
              <textarea
                value={editForm.description ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Add a description..."
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {displayJob.description || (
                  <span className="text-muted-foreground/60">
                    No description added.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground/60 pt-2 border-t">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {format(new Date(job.created_at), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {format(new Date(job.updated_at), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card className="shadow-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
            <Badge variant="secondary" className="ml-1">
              {comments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a note about this job..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddComment();
              }}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No comments yet. Add a note about this job.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="group flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  {editingCommentId === comment.id ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveComment(comment.id)}
                          disabled={!editingCommentText.trim()}
                        >
                          <Check className="mr-1 h-3 w-3" /> Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <p className="text-sm">{comment.content}</p>
                        <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(comment.created_at),
                            "MMM d, yyyy · h:mm a",
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditComment(comment)}
                        >
                          <Edit3 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Documents Section */}
      <Card className="shadow-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-500" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
            <Badge variant="secondary" className="ml-1">
              {jobDocuments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Link Document Button */}
          {availableDocuments.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLinkDocumentOpen(!linkDocumentOpen)}
                className="w-full gap-2"
              >
                <Link2 className="h-4 w-4" />
                Link Document
              </Button>
              {/* Dropdown */}
              {linkDocumentOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-background shadow-lg z-10 overflow-hidden">
                  {availableDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleLinkDocument(doc.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] ||
                            doc.document_type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linked Documents List */}
          {jobDocuments.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No linked documents. Link files from your document library.
              </p>
              {allDocuments.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Upload documents in the Documents tab first.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {jobDocuments.map((jd) => {
                const FileIcon = getFileIcon(jd.file_type);
                return (
                  <div
                    key={jd.document_id}
                    className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {jd.name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {DOCUMENT_TYPE_LABELS[jd.document_type] ||
                            jd.document_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(jd.file_size)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadDocument(jd.document_id)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleUnlinkDocument(jd.document_id)}
                        title="Unlink"
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Job"
        message="Delete this job and all its data? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
