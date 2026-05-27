/**
 * Maps numeric status codes to Tailwind class strings for cards / rows.
 * (Portable reference from WMS live-data status styling.)
 */
export const LIVE_STATUS_TEXT: Record<0 | 1 | 2 | 3, string> = {
  0: "text-primary-600 dark:text-primary-400",
  1: "text-amber-600 dark:text-amber-400",
  2: "text-red-600 dark:text-red-400",
  3: "text-muted-foreground",
};

export const LIVE_STATUS_BORDER_TOP: Record<0 | 1 | 2 | 3, string> = {
  0: "!border-t-primary-500",
  1: "!border-t-amber-500",
  2: "!border-t-red-500",
  3: "!border-t-border",
};

/** Status meaning for docs / tooltips */
export const LIVE_STATUS_LABEL: Record<0 | 1 | 2 | 3, string> = {
  0: "Normal",
  1: "Warning",
  2: "Alarm",
  3: "No data",
};
