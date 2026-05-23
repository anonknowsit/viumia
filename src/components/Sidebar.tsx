import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useTheme } from "@/context/ThemeContext";
import {
  LayoutDashboard,
  Briefcase,
  Star,
  Send,
  Monitor,
  Sparkles,
  Moon,
  Sun,
  XCircle,
  Clock,
  FileText,
  Settings,
} from "lucide-react";

function pathsMatch(
  pathname: string,
  search: string,
  itemPath: string,
): boolean {
  const [itemPathname, itemSearch] = itemPath.split("?");
  if (pathname !== itemPathname) return false;

  // No query expected — must have no query
  if (!itemSearch) return search === "";

  // Compare query params properly
  const expected = new URLSearchParams(itemSearch);
  const actual = new URLSearchParams(search);

  if (expected.size !== actual.size) return false;
  for (const [key, value] of expected) {
    if (actual.get(key) !== value) return false;
  }
  return true;
}

// Detect if running inside Tauri (window.__TAURI__ is the global Tauri object)
function detectTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__TAURI__ !== undefined
  );
}

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: Briefcase, label: "Jobs", path: "/jobs" },
  { icon: FileText, label: "Documents", path: "/documents" },
  { icon: Star, label: "Favorites", path: "/jobs?favorite=true" },
  { icon: Send, label: "Applied", path: "/jobs?status=applied" },
  { icon: Clock, label: "Waiting", path: "/jobs?status=waiting" },
  { icon: XCircle, label: "Rejected", path: "/jobs?status=rejected" },
];

export default function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const inTauri = detectTauri();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-gradient-to-b from-background via-background to-muted/20">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b px-5">
        <img
          src="/viumia_icon.jpeg"
          alt="Viumia"
          className="h-8 w-8 rounded-lg object-cover"
        />
        <span className="ml-2.5 text-base font-bold tracking-tight">
          Viumia
        </span>
        <Sparkles className="ml-auto h-3.5 w-3.5 text-yellow-500" />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathsMatch(
            location.pathname,
            location.search,
            item.path,
          );
          return (
            <Link key={item.label} to={item.path}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-primary shadow-sm ring-1 ring-blue-500/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive && "text-primary",
                  )}
                />
                {item.label}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        {/* Settings Link */}
        <Link to="/settings">
          <span
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </span>
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>

        {!inTauri && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50/80 px-3 py-2 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-900/50">
            <Monitor className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Browser Preview
            </span>
          </div>
        )}
        <div className="px-3">
          <p className="text-xs text-muted-foreground/60">
            All data stored locally
          </p>
          <p className="text-[10px] text-muted-foreground/40 mt-0.5">
            Job Planner v0.1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
