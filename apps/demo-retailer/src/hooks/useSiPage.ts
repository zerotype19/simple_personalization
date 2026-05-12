import type { PageType } from "@si/shared";
import { useEffect } from "react";

export function useSiPage(page: PageType) {
  useEffect(() => {
    document.documentElement.setAttribute("data-si-page", page);
    return () => {
      document.documentElement.removeAttribute("data-si-page");
    };
  }, [page]);
}
