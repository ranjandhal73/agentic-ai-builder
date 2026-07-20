import { aj } from "@/lib/arcjet";
import { CREDIT_COST_PER_GENERATION } from "@/lib/constant";
import { db } from "@/lib/prisma/prisma";
import { FileData, Message } from "@/types/workspace";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { Agent, createTool } from "@cline/sdk";
import z from "zod";

const sseEvent = (type: string, payload: unknown): string => {
  return `data: ${JSON.stringify({ type, ...(payload as object) })}\n\n`;
};

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceId, userId, userRequest, fileData } = body as {
    workspaceId: string;
    userId: string;
    userRequest: string;
    fileData: FileData;
  };

  let user;
  try {
    user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, credits: true, plan: true },
    });
  } catch (error) {
    console.error("Database error while fetching user:", error);
    return Response.json({ message: "Database unavailable" }, { status: 500 });
  }

  if (!user) return Response.json({ message: "Not exist" }, { status: 404 });

  if (user.plan !== "pro") {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  if (user.credits < CREDIT_COST_PER_GENERATION) {
    return Response.json({ messages: "Insufficient credits" }, { status: 402 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));

      //Accumulate file patche as the agent calls updadting the file
      const patchedFiles: Record<string, { code: string }> = {
        ...fileData.files,
      };

      let finalSummary = "";

      //Tool-1: Updating the file

      const updatedFileTool = createTool({
        name: "update_file",
        description:
          "Update or rewrite a file in the react sandbox. Call once per file you need to change.",
        inputSchema: z.object({
          path: z
            .string()
            .describe("File path exactly as it appears, e.g. /App.js"),
          code: z.string().describe("The updated file contents to write."),
          reason: z
            .string()
            .describe("One sentence explaining what you changed and why"),
        }),
        async execute({ path, code, reason }) {
          patchedFiles[path] = { code };
          enqueue(sseEvent("file_patch", { path, code, reason }));
          return `Updated ${path}: ${reason}`;
        },
      });

      // Tool-2: Done Improving
      const doneImprovingTool = createTool({
        name: "done_improving",
        description:
          "Call this when you have finished making all improvements.",
        inputSchema: z.object({
          summary: z
            .string()
            .describe(
              "A short friendly summary of all the improvements you made (1-3 sentences)",
            ),
        }),
        lifecycle: { completesRun: true },
        async execute({ summary }) {
          finalSummary = summary;
          return "Done.";
        },
      });

      //Serialixe current file for context
      const fileContext = Object.entries(fileData.files)
        .map(([path, { code }]) => `// ${path}\n${code}`)
        .join("\n\n---\n\n");

      const agent = new Agent({
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        apiKey: process.env.GEMINI_API_KEY!,
        maxIterations: 8,
        systemPrompt: `You are an expert React developer improving a live browser preview app.

The app uses React (functional components), Tailwind CSS for styling, and runs in Sandpack.
You CANNOT use TypeScript, CSS modules, or real npm install — only what's already available.
Available packages: react, react-dom, tailwindcss (CDN), lucide-react, recharts, react-router-dom, framer-motion, date-fns, zod, react-hook-form.

Here are the current files:

${fileContext}

WORKFLOW:
1. Understand what the user wants improved.
2. Identify which files need to change.
3. Call update_file for each file that needs changes (always include the COMPLETE file, not just the diff).
4. Once all files are updated, call done_improving with a short summary.

RULES:
- Always write complete file contents — never partial snippets.
- Keep all existing functionality unless asked to remove it.
- The entry point is always /App.js with a default export.
- All imports must reference files you've updated or packages in the available list above.`,
        tools: [updatedFileTool, doneImprovingTool],
        toolPolicies: {
          update_file: { autoApprove: true },
          done_improving: { autoApprove: true },
        },
      });

      try {
        //__________Streaming agent
        agent.subscribe((event)=>{
          if(event.type === "assistant-text-delta" && event.text){
            enqueue(sseEvent("thinking", {text: event.text}));
          }

          if(event.type === "tool-started"){
            const toolName = event.toolCall?.toolName;

            if(toolName === "update_file"){
              const path = (event.toolCall?.input as {path?: string})?.path ?? "a file";
              enqueue(sseEvent("thinking", {text: `\n\nUpdating \`${path}\`...`}))
            } else if (toolName === "done_improving"){
              enqueue(sseEvent("thinking", { text: "\n\nFinalizing improvements..."}))
            }
          }
        });

        // Rung the agent
        enqueue(sseEvent("status", {message: "Agent starting..."}));

        const result = await agent.run(userRequest);

        if(result.status === "failed"){
          throw new Error(result?.error?.message ?? "Agent run failed.")
        }

        // Deduct the credit and save to the DB
        const newFileData: FileData = {
          files: patchedFiles,
          dependencies: fileData.dependencies,
          title: fileData.title
        }

          await db.workspaces.update({
            where: {id: workspaceId, userId},
            data: {fileData: newFileData as never}
          });
          await db.user.update({
            where: {id: userId},
            data: {credits: {decrement: CREDIT_COST_PER_GENERATION}}
          });

          const updatedUser = await db.user.findUnique({
            where: {id: userId},
            select: {credits: true}
          });

          enqueue(
            sseEvent("done", {
              fileData: newFileData,
              summary: finalSummary || result.outputText,
              creditsRemaining: updatedUser?.credits ?? user.credits - CREDIT_COST_PER_GENERATION
            })
          );

      } catch (error) {
        console.error("[improve] error:", error);
        enqueue(
          sseEvent("error", {
            message: error instanceof Error ? error.message : "Something went wrong"
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 300;
