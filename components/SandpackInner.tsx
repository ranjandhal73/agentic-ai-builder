import { FileData, StatusStep } from "@/types/workspace";
import { SandpackCodeEditor, SandpackFileExplorer, SandpackLayout, SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AlertTriangle, ArrowUp, Code2, Download, Eye, Loader2, Wand2 } from "lucide-react";
import { RingLoader} from "react-spinners"
import { Button } from "./ui/button";
import PricingModal from "./PricingModal";
import JSZip from "jszip"



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

const SandpackInner = ({
  fileData,
  isGenerating,
  activeTab,
  setActiveTab,
  isImproving,
  statusLog,
  onFixError,
  isProUser,
  appTitle,
  onImprove
}: {
  fileData: FileData | null;
  isGenerating: boolean;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  isImproving: boolean 
  statusLog: StatusStep[];
  onFixError: (error: string) => Promise<void>;
  isProUser: boolean;
  appTitle: string | null;
  onImprove: (userRequest: string) => Promise<void>
}) => {
  const { sandpack, listen } = useSandpack();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [improveInput, setImproveInput] = useState("");
  const [showImproveInput, setShowImproveInput] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportZip = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const filesToZip =
        Object.keys(sandpack.files).length > 0
          ? sandpack.files
          : (fileData?.files ?? {});

      const dependencies = {
        ...BASE_DEPENDENCIES,
        ...(fileData?.dependencies ?? {}),
      };

      const packageJson = {
        name: appTitle ?? "agentic-app-builder",
        version: "1.0.0",
        private: true,
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "react-scripts": "5.0.1",
          ...dependencies,
        },
        scripts: {
          start: "react-scripts start",
          build: "react-scripts build",
        },
        browserslist: {
          production: [">0.2%", "not dead", "not op_mini all"],
          development: ["last 1 chrome version"],
        },
      };
      const zip = new JSZip();
      zip.file("package.json", JSON.stringify(packageJson, null, 2));

      zip.file(
        "public/index.html",
        `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>${appTitle ?? "Agentic App Builder"}</title>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body>
              <div id="root"></div>
            </body>
          </html>`,
      );

      for (const [filePath, fileObj] of Object.entries(filesToZip)) {
        const code =
          typeof fileObj === "object" && fileObj !== null && "code" in fileObj
            ? (fileObj as { code: string }).code
            : "";
        const zipPath = filePath.startsWith("/")
          ? `src${filePath}`
          : `src/${filePath}`;
        zip.file(zipPath, code);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const zipName = appTitle
        ? `${appTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}.zip`
        : "agent-app-builder.zip";
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(url);


    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImproveSubmit = async () => {
    const trimmed = improveInput.trim();
    if(!trimmed || isImproving) return;

    setImproveInput("");
    setShowImproveInput(false);
    await onImprove(trimmed);
  }

  useEffect(() => {
    unsubscribeRef.current = listen((msg)=>{
      if(msg.type === "action" &&
        "action" in msg && msg.action === "show-error"
      ){
        const errMsg = "message" in msg && typeof msg.message === "string"
        ? msg.message
        : "An error occurred in the preview"
        setPreviewError(errMsg);
        return;
      }

      if(msg.type === "compile" && "error" in msg){
        const errMsg = "message" in msg && typeof msg.message === "string"
          ? msg.message
          : "Compile error in preview."
        setPreviewError(errMsg);
        return;
      }

      if(msg.type === "success"){
        setPreviewError(null);
      }
    });

    return () => unsubscribeRef.current?.();
  },[listen]);

  useEffect(()=>{
    if(isGenerating) setPreviewError(null);
  }, [isGenerating])

  // Push file content updates into Sandpack without remounting.
  // This runs whenever fileData changes (e.g. after improve completes).
  // SandpackProvider key only changes when the file path set changes,
  // so this is the safe way to update existing file contents.

  const prevFilesRef = useRef<Record<string, { code: string }>>({});
  useEffect(() => {
    if (!fileData?.files) return;

    const prev = prevFilesRef.current;

    for (const [path, { code }] of Object.entries(fileData.files)) {
      if (prev[path]?.code !== code) {
        sandpack.updateFile(path, code);
      }
    }
    prevFilesRef.current = fileData.files;
  }, [fileData?.files]);
  
  useEffect(() => {
    if(fileData){
      setActiveTab("preview");
    }
  }, [fileData])

  return (
    <Tabs
      defaultValue={activeTab}
      onValueChange={(v) => setActiveTab(v as ActiveTab)}
      className="flex h-full flex-col gap-0"
    >
      <div className=" flex items-center justify-between border-b border-white/6 px-2">
        <TabsList
          variant="line"
          className="h-auto gap-0 rounded-none bg-transparent p-0"
        >
          <TabsTrigger value="code" className="border-b-2 pt-2 cursor-pointer">
            <Code2 className="h-3.5 w-3.5" />
            Code
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="border-b-2 pt-2 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-1.5">
          {isProUser ? (
            showImproveInput ? (
              <div className="flex items-center gap-1.5">
                <input 
                  autoFocus
                  value={improveInput}
                  onChange={(e) => setImproveInput(e.target.value)}
                  onKeyDown={(e) => {
                    if(e.key === "Enter") handleImproveSubmit();
                    if(e.key === "Escape") setShowImproveInput(false);
                  }}
                  placeholder="What should I improve?"
                  className="h-7 w-52 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/80 placeholder:text-white/25 focus:border-white/20 focus:outline-none"
                />
                <Button
                  size="icon"
                  onClick={handleImproveSubmit}
                  disabled={!improveInput.trim() || isImproving}
                  className="h-7 w-7 rounded-lg bg-white text-black hover:bg-white/90"
                >
                  {isImproving ? (
                    <Loader2 className="h-3 w-3 animate-spin"/>
                  ):(
                    <ArrowUp className="h-3 w-3"/>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImproveInput(true)}
                disabled={isImproving || !fileData}
                className="h-7 gap-1.5 text-xs text-white/40 hover:text-white/70 cursor-pointer"
              >
                <Wand2 className="h03.5 w-3.5" />
                {isImproving ? "Improving..." : "Improve with Agent"}
              </Button>)):(
                <PricingModal reason="upgrade">
                  <span className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs test-white/40 hover:text-white/70">
                  <Wand2 className="h-3.5 w-3.5" />
                    Improve
                  </span>
                </PricingModal>
              ) }
        </div>

        {/* Download ZIP button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportZip}
          disabled={isExporting || !fileData}
          className="h-7 gap-1.5 text-xs text-white/40 hover:text-white/70 cursor-pointer"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin"/>
          ) : (
            <Download className="h-3.5 w-3.5"/>
          )}
          Download
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {
          (isGenerating || isImproving) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a]/85 backdrop-blur-sm">
              <RingLoader color="#60a5fa" size={64} speedMultiplier={0.8} />
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-medium text-white/60">
                  { isImproving
                   ? "Improving with Agent..."
                   : (statusLog[statusLog.length -1]?.label ?? "Generating...")
                  }
                </p>
                <p className="text-xs text-white/20">
                  This usually takes 20-30 seconds
                </p>
              </div>
            </div>
          )
        }
        <SandpackLayout
          style={{
            height: "100vh",
            border: "none",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          <TabsContent 
            value="preview"
            keepMounted
            className="mt-0 h-full w-full"
          >
            <SandpackPreview 
              style={{height: "89%"}}
              showOpenInCodeSandbox={false}
            />
          </TabsContent>
          <TabsContent 
            value="code"
            keepMounted
            className="mt-0 flex h-full w-full"
          >
            <SandpackFileExplorer
              style={{
                height: "90%",
                width: "180px",
                borderRight: "0.5px solid rgba(255,255,255,0.08)"
              }}
            />
            <SandpackCodeEditor
              style={{ height: "90%", flex: 1}}
              showTabs
              showLineNumbers
              showInlineErrors
              closableTabs
              readOnly
            />
          </TabsContent>
        </SandpackLayout>
      </div>
              {
          previewError && !isGenerating && !isImproving && activeTab === "preview" && (
            <div className="absolute inset-x-0 -bottom-3 z-20 border-t border-red-500/20 bg-red-950/99 p-4 pb-6">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-red-400/80">Preview error</p>
                <p className="break-all text-[11px] text-red-300/50">{previewError}</p>
              </div>
              <Button
                onClick={() => onFixError(previewError)}
                variant="destructive"
                size="sm"
              >
                <Wand2 className="h-3 w-3"/>
                Fix with Agent
              </Button>
            </div>
        </div>
          )
        }
    </Tabs>
  );
};

export default SandpackInner;
