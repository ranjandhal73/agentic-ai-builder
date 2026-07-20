// ─── Project Types ────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  firstPrompt: string | null;
}