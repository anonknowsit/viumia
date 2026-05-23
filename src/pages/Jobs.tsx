import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getJobs, deleteJob } from "@/utils/api";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Job, JobStatus, FilterJobsDto } from "@/types";
import {
  Briefcase,
  Search,
  Filter as FilterIcon,
  Star,
  Trash2,
  ExternalLink,
  MapPin,
  Rocket,
  AlertTriangle,
} from "lucide-react";

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Derive active status filter directly from URL (no stale local state)
  const activeStatus = searchParams.get("status") as JobStatus | null;
  const isFavorites = searchParams.get("favorite") === "true";

  const fetchJobs = useCallback(() => {
    setLoading(true);
    const filter: FilterJobsDto = {};
    if (activeStatus) filter.status = activeStatus;
    if (isFavorites) filter.is_favorite = true;
    if (search) filter.search = search;
    getJobs(filter)
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [activeStatus, isFavorites, search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDeleteClick = (id: string) => {
    setJobToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteJob(jobToDelete);
      setJobs((prev) => prev.filter((j) => j.id !== jobToDelete));
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete job.",
      );
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setJobToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          </div>
          <p className="text-muted-foreground mt-0.5">
            Manage and track all your job applications.
          </p>
        </div>
        <Link to="/jobs/new">
          <div className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02]">
            <Rocket className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            Add Job
          </div>
        </Link>
      </div>

      {/* Error Banner */}
      {deleteError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {deleteError}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchJobs();
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={activeStatus ?? "all"}
                onValueChange={(v) => {
                  const params = new URLSearchParams(searchParams);
                  if (v === "all") {
                    params.delete("status");
                  } else {
                    params.set("status", v);
                  }
                  setSearchParams(params);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500/50 to-indigo-500/50" />
              <CardContent className="p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-3 w-28 rounded bg-muted" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : jobs.length === 0 ? (
          <Card className="overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardContent className="py-16 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Briefcase className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="mt-4 text-base font-medium text-muted-foreground">
                No jobs found.
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {search || activeStatus
                  ? "Try adjusting your filters."
                  : "Start by adding your first job."}
              </p>
              <Link to="/jobs/new">
                <Button className="mt-5 gap-2 shadow-md">
                  <Rocket className="h-4 w-4" />
                  Add Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card
              key={job.id}
              className="group overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Top accent line */}
              <div
                className={`h-1 w-full bg-gradient-to-r ${
                  job.status === "applied"
                    ? "from-emerald-500 to-green-500"
                    : job.status === "waiting"
                      ? "from-yellow-500 to-orange-500"
                      : job.status === "rejected"
                        ? "from-red-500 to-rose-500"
                        : "from-purple-500 to-pink-500"
                }`}
              />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <Link
                    to={`/jobs/${job.id}`}
                    className="flex-1 space-y-1.5 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground truncate">
                        {job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1 shrink-0">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">
                            {job.location}
                          </span>
                        </span>
                      )}
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    {job.is_favorite && (
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                    )}
                    <Badge
                      variant={job.status as "waiting" | "applied" | "rejected"}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteClick(job.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Results count */}
      {!loading && jobs.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing{" "}
            <span className="font-semibold text-foreground">{jobs.length}</span>{" "}
            {jobs.length === 1 ? "job" : "jobs"}
          </p>
          {searchParams.get("favorite") === "true" && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              Favorites
            </Badge>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setJobToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
