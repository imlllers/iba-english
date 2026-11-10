import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const listener = () => setMatches(list.matches);
    listener();
    list.addEventListener("change", listener);
    return () => list.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
