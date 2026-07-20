import { Message, StatusStep } from "@/types/workspace";
import React, { KeyboardEvent, useEffect, useRef, useState } from "react";
import { BlueTitle } from "./Reusable";
import PricingModal from "./PricingModal";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ArrowUp, Check, Loader2, Paperclip, Sparkle, Sparkles, Square, Wand2, X } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown"
import {createClient} from "@supabase/supabase-js"
import { toast } from "sonner";


interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  isImproving: boolean;
  statusLog: StatusStep[];
  credits: number;
  initialPrompt: string | null;
  onGenerate: (prompt: string, imageUrl?: string) => Promise<void>;
  userId: string;
  workspaceId: string | null;
  appTitle: string | null;
  onStop: () => void;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const ChatPanel = ({
  messages,
  isGenerating,
  isImproving,
  statusLog,
  credits,
  initialPrompt,
  onGenerate,
  userId,
  workspaceId,
  appTitle,
  onStop
}: ChatPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasAutoSubmittedRef = useRef(false);
  const noCredits = credits <= 0;
  const canSubmit =
    input.trim().length > 0 && !isGenerating && !isImproving && !noCredits;

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating || isImproving || noCredits) return;
    setInput("");
    setPendingImageUrl(null);
    await onGenerate(trimmed, pendingImageUrl ?? undefined);
  };

  // Auto-resize the text area when the user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isGenerating, isImproving]);

  useEffect(() => {
    if (!initialPrompt || hasAutoSubmittedRef.current || messages.length > 0)
      return;

    hasAutoSubmittedRef.current = true;
    onGenerate(initialPrompt);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const {user} = useUser();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if(!file || !file.type.startsWith("image/")) return;
    setIsUploading(true);

    try {
      const ext = file.name.split('.').pop();

      const path = `${userId}/${workspaceId ?? "new"}/${Date.now()}.${ext}`;

      const {error} = await supabase.storage
            .from("ai-builder-workspace-image")
            .upload(path, file, { upsert: true});

      if(error) throw error;

      const {data} = supabase.storage
                 .from("ai-builder-workspace-image")
                 .getPublicUrl(path);
                 
      setPendingImageUrl(data.publicUrl);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message)
    } finally {
      setIsUploading(false);
      if(fileRef.current) fileRef.current.value = "";
    }
  }

  const lastMsg = messages[messages.length - 1];
  const isStreamingAssistant = isImproving && lastMsg?.role === "assistant";


  return (
    <div className="flex w-[320px] shrink-0 flex-col bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
        <BlueTitle>{appTitle}</BlueTitle>
        <PricingModal reason={noCredits ? "credits" : "upgrade"}>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] transition-colors",
              noCredits
                ? "bg-red-500/15 text-red-400/80 hover:bg-red-500/25"
                : "bg-white/6 text-white/30 hover:bg-white/10 hover:text-white/50",
            )}
          >
            {noCredits
              ? "No Credits. Upgrade"
              : `${credits} credit${credits !== 1 ? "s" : ""}`}
          </span>
        </PricingModal>
      </div>

      {/* Message users + assistant */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:hidden z-10"
      >
        {messages.length === 0 && !isGenerating && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-s text-white/20">
              Tell me what you'd like to create...
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            const isLiveStream = isLast && isStreamingAssistant;


            return (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex items-start justify-end gap-2">
                  <div className="max-w-[85%] space-y-1.5">
                    <div className="rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2.5">
                      <p className="text-[13px] leading-relaxed text-white/80 wrap-break-word">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                   {/* Add the user image here as well */}
                    {user?.imageUrl 
                    ? (
                      <img 
                        src={user.imageUrl}
                        alt={user.fullName ?? "You"}
                        className="mt-0.5 h-6 w-6 shrink-0 rounded-full"
                      />
                    ) : (
                      <div
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/50" 
                      >
                        {user?.firstName?.[0] ?? "You"}
                      </div>
                    )
                  }
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Image
                    src="/mainlogo.png"
                    alt="Avatar"
                    width={24}
                    height={24}
                    className="mt-0.5 h-6 w-6 shrink-0 rounded-md"
                  />
                
                  <div className="min-w-0 rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-2.5">
                    {
                    isLiveStream && !msg.content ? (
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3 w-3 shrink-0 text-blue-400/60 animate-pulse"/>
                        <span className="text-[12px] text-white/30 animate-pulse">
                          Agent is thinking...
                        </span>
                      </div>
                    ) : (
                      isLiveStream && msg.content ? (
                        <div>
                          <div className="mb-1.5 flex items-center ga[-1.5">
                            <Wand2 className="h-3 w-3 shrink-0 text-blue-400/60"/>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-blue-400/50">
                              Agent reasoning
                            </span>
                          </div>
                          <p className="text-[12px] leading-relaxed text-white/35 wrap-break-word">
                            {msg.content}
                            <span className="ml-0.5 inline-block h-3 w-0.5 animate-[blink_1s_ease-in-out_infinite] bg-blue-400/60 align-middle" />
                          </p>
                        </div>
                      ) : (
                        <div className="min-w-0 rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-2.5">
                          <p className="prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed text-white/70 wrap-break-word [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-blue-300/80 [&_code]:text-xs [&_li]:my-0.5 [&_p]:my-1 [&_ul]:my-1">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </p>
                        </div>
                      ))
                  }
                  </div>
                </div>
              )}
            </div>
          )})}

          {/* Status steps */}
          {isGenerating && (
            <div className="flex items-start gap-2">
              <Image
                src="/mainlogo.png"
                alt="Avatar"
                width={24}
                height={24}
                className="mt-0.5 h-6 w-6 shrink-0 rounded-md"
              />
              <div className="rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-3">
                <div className="space-y-5">
                  {statusLog.map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {step.status === "running" ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-400/80" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[12px] transition-colors duration-300",
                          step.status === "running"
                            ? "text-white/75"
                            : "text-white/25",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {
        noCredits && (
        <div className="mx-3 mb-2 rounded-xl border border-red-500/15 bg-red-950/40 px-4 py-3">
          <p className="mb-2 text-[12px] font-medium text-red-400/80">
            You have used all your credits.
          </p>
          <PricingModal reason="credits">
            <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white/70 px-3 text-xs text-black active:scale-95">
              <Sparkles className="h-3 w-3"/>
              Upgrade Plan
            </span>
          </PricingModal>
        </div>
        )}

      <div className="border-t border-white/6 p-3">
      {
        pendingImageUrl && (
          <div className="relative mb-2 w-fit">
            <img 
              src={pendingImageUrl}
              alt="pending"
              className="h-16 w-16 rounded-lg object-cover"
            />
            <button
              onClick={()=> setPendingImageUrl(null)}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-white/60 hover:text-white"
            >
              <X className="h-2.5 w-2.5"/>
            </button>
          </div>
        )
      }
        <div
          className={cn(
            "rounded-xl border bg-white/4 transition-colors",
            isGenerating || isImproving || noCredits
              ? "border-white/4 opacity-60"
              : "border-white/8 hover:border-white/12",
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || isImproving || noCredits}
            placeholder={
              noCredits
                ? "Upgrade to keep building..."
                : isImproving
                  ? "Model is improving your app.."
                  : isGenerating
                    ? "Generating..."
                    : "Ask Agent to modify..."
            }
            rows={1}
            className="w-full resize-none bg-transparent px-3.5 pb-2 pt-3 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none"
            style={{ maxHeight: 160 }}
          />

          <div className="flex items-center justify-between px-2 pb-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={isGenerating || isImproving || isUploading || noCredits}
              className="h-7 w-7 rounded-lg text-white/45 disabled:opacity-40 hover:bg-white/6 hover:text-white/50"
              onClick={() => fileRef.current?.click()}
            >
              {
                isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                ):(
                  <Paperclip className="h-3.5 w-3.5" />
                )
                
              }
            </Button>
            <input 
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {isGenerating || isImproving 
            ? (
              <Button 
                size="icon"
                onClick={onStop}
                disabled={noCredits}
                className="h-7 w-7 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white active:scale-95 transition-all"
              >
                <Square className="h-3 w-3 fill-current"/>
              </Button>
            ) : (
              <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!canSubmit || noCredits}
              className={cn(
                "h-7 w-7 rounded-lg transition-all",
                canSubmit
                  ? "bg-white text-black hover:bg-white/90 active:scale-95"
                  : "bg-white/8 text-white/20 shadow-none",
              )}
            >
              {isGenerating || isImproving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
            </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-white/20">
          {isGenerating || isImproving 
            ? "Click 🛑 to stop generation"
            : "Press Enter to generate • Shift + Enter for a new line"
          }
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
