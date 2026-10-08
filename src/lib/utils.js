import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register our semantic font sizes so merging colors never removes typography.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "action", "body", "code", "title", "brand"],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
