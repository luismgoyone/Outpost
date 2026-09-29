import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Release notes renderer. Raw HTML is dropped (skipHtml) and unsafe URLs (javascript: etc.)
 * are stripped, so untrusted Markdown from GitHub is safe to display.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground flex flex-col gap-2 text-[13px] leading-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <p className="text-foreground font-semibold">{children}</p>,
          h2: ({ children }) => <p className="text-foreground font-semibold">{children}</p>,
          h3: ({ children }) => <p className="text-foreground font-medium">{children}</p>,
          ul: ({ children }) => <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>,
          ol: ({ children }) => (
            <ol className="flex list-decimal flex-col gap-1 pl-5">{children}</ol>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-panel text-foreground rounded-sm px-1 font-mono text-[12px]">
              {children}
            </code>
          ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
