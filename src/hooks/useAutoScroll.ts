import { useRef } from "react";
export function useAutoScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  return containerRef;
}
