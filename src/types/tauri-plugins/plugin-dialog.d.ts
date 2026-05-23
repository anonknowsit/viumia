declare module "@tauri-apps/plugin-dialog" {
  export interface OpenDialogOptions {
    title?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    defaultPath?: string;
    filters?: Array<{
      name: string;
      extensions: string[];
    }>;
    multiple?: boolean;
  }

  export interface SaveDialogOptions {
    title?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    defaultPath?: string;
    filters?: Array<{
      name: string;
      extensions: string[];
    }>;
  }

  export function open(
    options?: OpenDialogOptions,
  ): Promise<string | string[] | null>;
  export function save(options?: SaveDialogOptions): Promise<string | null>;
}
