"use client";

import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars";
import { BlueTitle, GrayTitle, SectionHeading, SectionLabel } from "@/components/Reusable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FEATURES, PLACEHOLDERS, STEPS, SUGGESTIONS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { PricingTable, SignInButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, Check, ChevronRight, Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (isFocused || prompt) return;

    const t = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 600);
    return () => clearInterval(t);
  }, [isFocused, prompt]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [prompt]);

  const handleSumbit = () => {
    if (!prompt.trim() || !isSignedIn) return;

    router.push(`/workspace?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSumbit();
    }
  };

  const handleSuggestions = (s: string) => { 
    setPrompt(s);
    textareaRef?.current?.focus;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] selection:bg-white/20">
      <section className="relative flex flex-col items-center overflow-hidden px-4 pb-24 pt-40 text-center">
        <StarsBackground className="absolute inset-0 h-full w-full " />
        <Badge variant={"outline"} className="gap-2 p-4 backdrop:blur-sm z-10">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Powered by chatGPT-4
        </Badge>

        <h1 className="mx-auto max-w-3xl text-balance font-serif text-5xl leading-tight tracking-tight sm:text-5xl lg:text-7xl z-10">
          <GrayTitle>Transform Ideas-into</GrayTitle>
          <br />
          <BlueTitle>Powerful AI Solutions.</BlueTitle>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-white/40 z-10">
          Describe the application you want to build in plain English. AI
          generates the code, selects the right libraries and packages, creates
          the project structure, and helps you ship production-ready
          applications faster than ever.
        </p>

        {/* Prompt Box */}
        <div className="relative mx-auto mt-12 w-full max-w-2xl">
          <div
            className={cn(
              "rounded-2xl border bg-[#111111] duration-200",
              isFocused
                ? "border-white/20 ring-1  ring-white/8"
                : "border-white/8",
            )}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full resize-none bg-transparent px-5 pb-4 pt-5 text-sm placeholder:text-white/20 focus:outline-none sm:text-base"
              style={{ minHeight: 56, maxHeight: 200 }}
              placeholder={PLACEHOLDERS[placeholderIndex]}
            />

            <div className="flex items-center justify-between border-t border-white/6 px-4 py-2.5">
              <span className="text-xs text-white/20">
                Press <kbd>Enter</kbd> to generate • <kbd>Shift + Enter</kbd>{" "}
                for a new line
              </span>

              {isSignedIn 
                ? (<Button 
                    className="cursor-pointer h-8 rounded-full px-5 font-semibold"
                    disabled={!prompt.trim()}
                    onClick={handleSumbit}
                    variant={prompt.trim() ? "default" : "secondary"}
                >
                  Generate
                </Button> 
              ):(
                <SignInButton mode="modal">
                  <Button className="cursor-pointer">
                    Generate
                    <ArrowRight className="h-3.5 w-3.5"/>
                  </Button>
                </SignInButton>
              ) }
            </div>
          </div>

        {/* Prompt suggestion */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {
            SUGGESTIONS.map((s)=>(
              <button
                key={s}
                onClick={() => handleSuggestions(s)}
                className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white/40 hover:border-white/15 hover:bg-white/8 hover:text-white/70 cursor-pointer"
              >
                {s}
              </button>
            ))
          }
        </div>
        </div>

        <p className="mt-10 text-xs text-white/40 z-10">
          No credit card required. 7 free generations on sign up.
        </p>

          {/* Mock panel */}
        <section className="relative z-10 mt-16 w-full max-w-6xl rounded-[2rem] border border-white/10 bg-[#0e1116]/95 p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/50">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f24e1e] shadow-[0_0_0_4px_rgba(242,78,30,0.08)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f3b82f] shadow-[0_0_0_4px_rgba(243,184,47,0.08)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#34c84a] shadow-[0_0_0_4px_rgba(52,200,74,0.08)]" />
              </div>
              <div className="flex-1 rounded-2xl border border-white/10 bg-[#111316] px-4 py-2 text-xs text-white/50">
                https://app.agentic-builder.ai/workspace
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#111317] p-5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.7)]">
              <div className="mb-5 flex items-center justify-between text-sm text-white/50">
                <span>Workspace chat</span>
                <span className="rounded-full bg-white/5 px-2.5 py-1">Live preview</span>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">You</div>
                  <p>Show me a Kanban board layout with Todo, In progress, and Done.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#14161d] p-4 text-sm text-white/80">
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">AI</div>
                  <p>Building the workspace view now. I’ll include the board columns, cards, and an ambient dark theme.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#14161d] p-4 text-sm text-white/80">
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
                    <span>AI</span>
                    <span className="inline-flex items-center gap-2 text-[11px] text-emerald-400">
                      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> typing
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-[#0f1116] p-3 text-sm text-white/50">
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">Message</div>
                <div className="flex items-center gap-3 rounded-3xl bg-white/5 px-4 py-3">
                  <input
                    type="text"
                    readOnly
                    value="Type a message..."
                    className="w-full bg-transparent text-sm text-white/40 outline-none placeholder:text-white/30"
                  />
                  <button className="rounded-full bg-white/10 px-3 py-2 text-xs text-white/70">Send</button>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12] p-5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.75)]">
              <div className="mb-5 flex items-center gap-2 rounded-3xl bg-white/5 p-3 text-xs text-white/50">
                <span className="rounded-full bg-white/10 px-3 py-1">Kanban</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Activity</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Files</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'Todo', color: 'bg-sky-500/15 text-sky-300' },
                  { title: 'In progress', color: 'bg-amber-500/15 text-amber-300' },
                  { title: 'Done', color: 'bg-emerald-500/15 text-emerald-300' },
                ].map((column) => (
                  <div key={column.title} className="rounded-3xl border border-white/10 bg-white/5 p-3">
                    <div className={`mb-4 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${column.color}`}>{column.title}</div>
                    <div className="space-y-3">
                      {[1, 2].map((card) => (
                        <div key={card} className="rounded-3xl border border-white/10 bg-[#111317] p-3">
                          <div className="mb-2 h-3.5 w-3/4 rounded-full bg-white/10" />
                          <div className="h-2.5 w-1/2 rounded-full bg-white/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-32 text-white mt-18 z-10">
          <div className="mx-auto mb-14 max-w-5xl text-center">
            <SectionLabel>Everything you need</SectionLabel>
            <SectionHeading gray="From Prompt" blue="to production" />
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/6 bg-white/6 sm:grid-cols-2 lg:grid-cols-3">
          {
            FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="group bg-[#0a0a0a] p-7 hover:bg-[#0f0f0f]"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/4 group-hover:border-white/15 group-hover:bg-white/8">
                <Icon className="h-4 w-4 text-white/60 group-hover:text-blue-400/70" />
              </div>
              <p className="mb-2 text-sm font-semibold">{label}</p>
              <p className="text-sm leading-relaxed text-white/40">{desc}</p>
            </div>
            ))
          }
          </div>
        </section>

        {/* HOW IT WORKS */}
      <section className="px-4 pb-32 z-10">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <SectionLabel>How it works</SectionLabel>
          <SectionHeading gray="Four steps" blue="to a working app." />
        </div>

        <div className="mx-auto max-w-3xl">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex gap-6 text-left">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/4">
                  <span className="font-mono text-xs font-semibold text-white/50">
                    {step.number}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div className="mt-2 h-full w-px bg-white/6" />
                )}
              </div>

              <div className="pb-10 pt-1.5">
                <p className="mb-1.5 text-sm font-semibold sm:text-base">
                  {step.label}
                </p>

                <p className="text-sm leading-relaxed text-white/40">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 pb-32 z-10">
        <div className="mx-auto mb-14 max-w-5xl text-center">
          <SectionLabel>Simple pricing</SectionLabel>
          <SectionHeading gray="Start free," blue="scale when ready." />

          <p className="mx-auto mt-4 max-w-sm text-sm text-white/35">
            No credit card required. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <PricingTable 
            checkoutProps={{
              appearance:{
                elements:{
                  drawerRoot:{
                    zIndex: 2000,
                  }
                }
              }
            }}
          />
          
        </div>
      </section>

      </section>
      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      
      <section className="relative mx-auto mt-12 mb-32 max-w-5xl overflow-hidden rounded-2xl border border-white/8 px-10 py-24 text-center">
        {/* <HoleBackground
          strokeColor="rgba(255,255,255,0.05)" // blur
          numberOfLines={36}
          numberOfDiscs={36}
          particleRGBColor={[147, 197, 253]}
          className="absolute inset-0 h-full w-full"
          style={{
            maskImage:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
          }}
        /> */}
        

        <SectionHeading gray="Start building," blue="for free." />

        <p className="mb-8 text-sm leading-relaxed text-white/40">
          Get 7 free generations on sign up. No credit card required.
          <br />
          Upgrade when you&apos;re ready.
        </p>

        <SignInButton mode="modal">
          <Button
            size="lg"
            className="relative h-11 rounded-full bg-white px-8"
          >
            Get started free
            <ChevronRight className="h-4 w-4" />
          </Button>
        </SignInButton>
      </section>

      <footer className="relative z-10 border-t border-white/7 py-12 mx-auto px-6 flex flex-wrap items-center justify-center text-stone-400">
        Made with ❤️ by Ranjan
      </footer>
    </main>
  );
}
