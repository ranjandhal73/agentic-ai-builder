"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/prisma/prisma";
import { ProjectSummary } from "@/types/project";

// ─── Get all workspaces for the current user ──────────────────────────────────

export async function getUserProjects(): Promise<ProjectSummary[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) redirect("/");

  const workspaces = await db.workspaces.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      message: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return workspaces.map((w) => {
    const msgs = Array.isArray(w.message) ? (w.message as unknown[]) : [];
    const firstUserMsg = msgs.find(
      (m): m is { role: "user"; content: string } =>
        typeof m === "object" &&
        m !== null &&
        "role" in m &&
        (m as any).role === "user" &&
        typeof (m as any).content === "string"
    );

    return {
      id: w.id,
      title: w.title,
      firstPrompt: firstUserMsg?.content.slice(0, 120) ?? null,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      messageCount: msgs.length,
    };
  });
}

// ─── Delete a workspace ───────────────────────────────────────────────────────

export async function deleteProject(workspaceId: string): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) redirect("/");

  await db.workspaces.deleteMany({
    where: { id: workspaceId, userId: user.id },
  });

  revalidatePath("/projects");
}