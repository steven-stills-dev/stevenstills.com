import { useEffect } from "react";

/** Set the document title and description for the current route. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title === "Steven Stills" ? title : `${title} · Steven Stills`;
    if (description) {
      let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
      m.content = description;
    }
  }, [title, description]);
}
