import { CREDIT_COST_PER_GENERATION } from "@/lib/constant";
import { db } from "@/lib/prisma/prisma";
import { FileData, Message } from "@/types/workspace";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import {GoogleGenAI} from "@google/genai"
import { Lateef } from "next/font/google";
import { aj } from "@/lib/arcjet";

const trimHistory = (messages: Message[]): Message[] => {
    if(messages.length <= 10) return messages;

    return [messages[0], ...messages.slice(-8)]
}

const buildContents = (messages: Message[], fileData: FileData | null) => {
    const trimmed = trimHistory(messages);

    return trimmed.map((msg, idx) => {
        const role = msg.role === "assistant" ? "model" : "user";

        if(msg.role === "user"){
            const parts: object[] = [];

            let text = msg.content;

            if(msg.imageUrl){
                text = `[The user has attached an image. Use this URL directly in the generated app where relevant (as img src, background-image, etc.): ${msg.imageUrl}\n\n${text}]`
            }

            const isLast = idx === trimmed.length -1;
            if(isLast && fileData){
                text += "\n\nCurrent projext files for context:\n" + 
                JSON.stringify(fileData, null,2);
            }

            parts.push({text});
            return { role, parts};
        }

        return {role, parts: [{ text: msg.content}]};
    });
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY});

const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with ONLY a valid JSON object — no markdown, no backticks, no extra text before or after.
2. Use DOUBLE QUOTES for all JSON keys and string values.
3. The JSON must match this exact shape (no variations):
{
  "assistantMessage": "brief explanation",
  "title": "2-4 word title",
  "files": {
    "/App.js": { "code": "full file content" }
  },
  "dependencies": {
    "package-name": "latest"
  }
}
4. VALIDATE your JSON before responding. Every key must have double quotes.
5. Do NOT use single quotes, template literals, or unquoted keys.
6. Use React functional components + hooks. No TypeScript.
7. Use Tailwind CSS for styling.
8. Entry point is /App.js with default export.
9. All imports reference files in "files" or packages in "dependencies".
10. Do not include react, react-dom, or tailwindcss in dependencies.`;

const extractThoughtLabel = (text: string): string | null =>  {
    const boldMatch = text.match(/\*\*([^*]{4,60})\*\*/);
                                
    if(boldMatch) return boldMatch[1].trim();

    const sentence = text.split(/[.\n]/)[0].trim();
    if(sentence.length >= 8 && sentence.length <= 80) return sentence;

    return null;
}

const sseEvent = (type: string, payload: unknown): string => {
    return `data: ${JSON.stringify({ type, ...(payload as object)})}\n\n`
}

const validateDependencies = async (
    deps: Record<string, string>,
): Promise<Record<string, string>> =>{
    const valid: Record<string, string> = {};

    await Promise.all(
        Object.entries(deps).map(async([pkg, version])=>{
            try {
                const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
                    signal: AbortSignal.timeout(1500),
                });
                if(res.ok) valid[pkg] = version;
            } catch (error) {
                
            }
        }),
    );
    return valid;
};

export async function POST (request: NextRequest) {
    const {userId: clerkId} = await auth();
    if(!clerkId){
        return Response.json(
            {message: "Unauthorized"},
            {status: 401}
        )
    }

    const body = await request.json();
    const {workspaceId, fileData, messages, userId: clientUserId} = body as {
        workspaceId: string | null;
        userId?: string;
        messages: Message[];
        fileData: FileData | null;
    };

    if(!messages?.length){
        return Response.json({message: "No content provided"}, {status: 400})
    }

    //__________ARCJET: RATE LIMIT, PROMPT INJECTION, SENSITIVE INFO HANDLER_______________

    const lastUserMessage = [...messages]?.reverse().find((m) => m.role === "user")?.content ?? "";

    try {
        // Create a proper request object for Arcjet
        const arcjetReq = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(body)
        });

        const decision = await aj.protect(arcjetReq, {
            requested: 1,
            userId: clerkId,
            detectPromptInjectionMessage: lastUserMessage
        });

        if(decision.isDenied()){
            return Response.json(
                { message: decision.reason?.type ?? "Request forbidden."},
                { status: 429}
            )
        }
    } catch (arcjetError) {
        console.error("Arcjet error:", arcjetError);
        // Continue without Arcjet if it fails in dev
        if (process.env.NODE_ENV === "production") {
            return Response.json(
                { message: "Security check failed" },
                { status: 500 }
            );
        }
    }

    let user;
    try {
        user = await db.user.findUnique({
            where: {clerkId},
            select: {id: true, credits: true}
        });
    } catch (error) {
        console.error('Database error while fetching user:', error);
        return Response.json({ message: 'Database unavailable' }, { status: 500 });
    }

    if(!user) return Response.json({message: "Not exist"}, {status: 404});

    if(user.credits < CREDIT_COST_PER_GENERATION){
        return Response.json(
            {messages: "Insufficient credits"},
            {status: 402}
        )
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller){
            const enqueue = (chunk: string) => controller.enqueue(encoder.encode(chunk));

            try {
                const contents = buildContents(messages, fileData);

                const geminiStream = await ai.models.generateContentStream({
                    model: "gemini-3.5-flash",
                    contents,
                    config:{
                        systemInstruction: SYSTEM_PROMPT,
                        temperature: 0.5,
                        responseMimeType: "application/json",
                        thinkingConfig: {
                            includeThoughts: true
                        }
                    }
                });

                let accumulated = ""; //collects all the actual JSON output chunks
                let lastEmitTime = 0; //used to throttle thought -> status emmision

                for await(const chunk of geminiStream){
                    const parts = chunk.candidates?.[0]?.content?.parts ?? [];

                    for (const part of parts){
                        if(!part.text) continue;

                        if(part.thought){
                            const now = Date.now();
                            if(now - lastEmitTime > 600){
                                const label = extractThoughtLabel(part.text);
                                if(label){
                                    enqueue(sseEvent("status", {message: label}));
                                    lastEmitTime = now;
                                }
                            }
                        } else {
                            accumulated += part.text;
                        }
                    }
                }

                let parsed: {
                    assistantMessage: string;
                    title?: string;
                    files: Record<string, {code: string}>
                    dependencies: Record<string, string>
                };

                try {
                    // Extract the top-level JSON object from the accumulated stream safely.
                    const extractTopLevelJSON = (text: string): string | null => {
                        const first = text.indexOf('{');
                        if (first === -1) return null;
                        let depth = 0;
                        for (let i = first; i < text.length; i++) {
                            const ch = text[i];
                            if (ch === '{') depth++;
                            else if (ch === '}') {
                                depth--;
                                if (depth === 0) return text.slice(first, i + 1);
                            }
                        }
                        return null;
                    };

                    const jsonStr = extractTopLevelJSON(accumulated);
                    if (!jsonStr) throw new Error('No JSON found in agent output');
                    parsed = JSON.parse(jsonStr);
                } catch (error) {
                    console.log("Agent:", error);
                    enqueue(
                        sseEvent("error", {
                            message: "Agent returned invalid JSON. Please try again."
                        }),
                    );
                    controller.close();
                    return;
                }

                const {assistantMessage, title: aiTitle, files, dependencies} = parsed;
                if(!files || typeof files !== "object"){
                    enqueue(
                        sseEvent("error",{
                            message: "Agent response missing files. Please try again."
                        })
                    );
                    controller.close();
                    return;
                }

                // ── Validate npm packages ──────────────────────────────────────────────
                enqueue(sseEvent("status",{message: "Validating packages..."}));
                const validatedDeps = await validateDependencies(dependencies ?? {});
                const newFileData: FileData = {
                    files,
                    dependencies: validatedDeps,
                    title: aiTitle
                };

                // ── Upsert workspace + deduct credit (single transaction) ──────────────

                enqueue(sseEvent("status", {message: "Saving..."}));
                
                const lastUserMsg = messages[messages.length -1];
                const updatedMessages: Message[] = [
                    ...messages,
                    {role: "assistant", content: assistantMessage}
                ];

                const workspace = await db.$transaction( async (tx) => {
                  const ws =  workspaceId
                    ? await tx.workspaces.update({
                        where: {id: workspaceId, userId: user.id},
                        data: {
                            message: updatedMessages as never,
                            fileData: newFileData as never
                        },
                    })
                    : await tx.workspaces.create({
                        data: {
                            userId: user.id,
                            title: aiTitle ?? lastUserMsg.content.slice(0,80),
                            message: updatedMessages as never,
                            fileData: newFileData as never
                        }
                    });

                    await tx.user.update({
                        where: {id: user.id},
                        data: { credits: {decrement: CREDIT_COST_PER_GENERATION}},
                    });

                    return ws;
            }, {timeout: 300000});
            
                //Refetch the updated credit._________________________________________
                const updatedUser = await db.user.findUnique({
                    where: { id: user.id},
                    select: { credits: true},
                });

                // Final done event_______________________________________
                enqueue(
                    sseEvent("done",{
                        workspaceId: workspace?.id,
                        assistantMessage,
                        fileData: newFileData,
                        creditsRemaining: updatedUser?.credits ?? user.credits - CREDIT_COST_PER_GENERATION,
                    })
                );
            } catch (error) {
                console.error("Agent Stream Error:", error);
                enqueue(
                    sseEvent("error", {
                        message: "Something went wrong. Please try again."
                    })
                )
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    })
}

export const runtime = "nodejs";
export const maxDuration = 300;