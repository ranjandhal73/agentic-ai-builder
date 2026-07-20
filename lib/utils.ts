import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type SearchResult = {
  path: string;
  snippet: string;
  score: number;
};

// Simple file search: tokenizes the query and scores files by occurrence.
export function searchFiles(
  files: Record<string, { code: string }>,
  query: string,
  maxResults = 10,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);

  const results: SearchResult[] = Object.entries(files).map(([path, { code }]) => {
    const hay = (path + '\n' + code).toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (hay.includes(term)) score += 10;
      const matches = (hay.match(new RegExp(term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length;
      score += matches;
    }

    const firstIdx = hay.indexOf(terms[0]);
    const snippet = firstIdx === -1
      ? code.slice(0, 140)
      : code.slice(Math.max(0, firstIdx - 40), Math.min(code.length, firstIdx + 120));

    return { path, snippet, score };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return results;
}
