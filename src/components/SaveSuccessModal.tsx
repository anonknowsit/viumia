import { CheckCircle } from "lucide-react";

interface SaveSuccessModalProps {
  open: boolean;
  title?: string;
}

export default function SaveSuccessModal({
  open,
  title = "Job saved successfully!",
}: SaveSuccessModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-sm rounded-xl border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>

        {/* Title */}
        <h2 className="text-center text-lg font-semibold">{title}</h2>
      </div>
    </div>
  );
}
