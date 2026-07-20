// ─── Placeholder ──────────────────────────────────────────────────────────────
"use client"

import { FileData, StatusStep } from "@/types/workspace";
import { useState } from "react";
import {SandpackProvider} from "@codesandbox/sandpack-react"
import {dracula} from "@codesandbox/sandpack-themes"
import SandpackInner from "./SandpackInner";

const PLACEHOLDER_FILES = {
  "/App.js": {
    code: `export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
        <p style={{ fontSize: 14 }}>Your app will appear here</p>
      </div>
    </div>
  );
}`,
  },
};

// ─── Base dependencies ────────────────────────────────────────────────────────

const BASE_DEPENDENCIES: Record<string, string> = {
  "react-is": "latest",
  "react-router-dom": "latest",
  "lucide-react": "latest",
  recharts: "latest",
  "date-fns": "latest",
  "framer-motion": "latest",
  "react-hook-form": "latest",
  "@hookform/resolvers": "latest",
  zod: "latest",
  "@radix-ui/react-dialog": "latest",
  "@radix-ui/react-dropdown-menu": "latest",
  "@radix-ui/react-tabs": "latest",
  "@radix-ui/react-tooltip": "latest",
  "@radix-ui/react-accordion": "latest",
  "@radix-ui/react-select": "latest",
  axios: "latest",
  clsx: "latest",
  "class-variance-authority": "latest",
  "tailwind-merge": "latest",
};

type ActiveTab = "preview" | "code";

interface CodePanelProps {
    fileData: FileData | null;
    isGenerating: boolean;
    statusLog: StatusStep[];
    onFilePatch: (patches: FileData) => void;
    isImproving: boolean
    onFixError: (error: string) => Promise<void>;
    isProUser: boolean;
    appTitle: string | null;
    onImprove: (userRequest: string) => Promise<void>
}

export const CodePanel = ({
    fileData,
    isGenerating,
    statusLog,
    onFilePatch: _onFilePatch,
    isImproving,
    onFixError,
    appTitle,
    isProUser,
    onImprove
}: CodePanelProps) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

    const files = fileData?.files ?? PLACEHOLDER_FILES;
    const dependencies = {
        ...BASE_DEPENDENCIES,
        ...(fileData?.dependencies ?? {})
    };

    const filePathKey = Object.keys(files).sort().join("|");

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <SandpackProvider 
                key={filePathKey}
                template="react"
                theme={dracula}
                files={files}
                customSetup={{dependencies}}
                options={{
                    externalResources: ["https://cdn.tailwindcss.com"],
                    recompileMode: "delayed",
                    recompileDelay: 500
                }}
            >
                <SandpackInner 
                    fileData={fileData}
                    isGenerating={isGenerating}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    statusLog={statusLog}
                    isImproving={isImproving}
                    onFixError={onFixError}
                    appTitle={appTitle}
                    isProUser={isProUser}
                    onImprove={onImprove}
                />
            </SandpackProvider>
        </div>
    )
}