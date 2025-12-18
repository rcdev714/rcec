import React, { useState } from 'react';

// Code block component with copy button
export const CodeBlock = ({ children }: { children?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const text = Array.isArray(children) ? children.join('') : (children as string) || '';
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { }
  };
  return (
    <div className="relative group">
      <pre className="rounded-md border border-gray-200 bg-gray-50 p-3 overflow-auto text-sm">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="absolute top-2 right-2 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-xs text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition"
      >
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
};

export const createMarkdownComponents = (
  setCopiedInline: (text: string | null) => void,
  copiedInline: string | null
) => ({
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline"
    >
      {children}
    </a>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 last:mb-0">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-normal mb-4 mt-6 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-normal mb-3 mt-5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-normal mb-2 mt-4 first:mt-0">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-normal mb-2 mt-3 first:mt-0">{children}</h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="ml-4">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-gray-300">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-gray-100">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-gray-300 px-4 py-2 text-left font-normal">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-gray-300 px-4 py-2">{children}</td>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => {
    const text = Array.isArray(children) ? children.join('') : (children as string) || '';
    if (inline) {
      return (
        <code
          onClick={async () => {
            setCopiedInline(text);
            try {
              await navigator.clipboard.writeText(text);
            } catch { }
            setTimeout(() => setCopiedInline(null), 1200);
          }}
          title={copiedInline === text ? 'Copiado' : 'Click para copiar'}
          className="cursor-pointer rounded bg-gray-100 px-1.5 py-0.5 text-gray-800 hover:bg-gray-200"
        >
          {children}
        </code>
      );
    }
    // For code blocks, just return the code element and let pre handle the styling
    return <code>{children}</code>;
  },
  pre: ({ children }: { children?: React.ReactNode }) => {
    // Extract text from children
    const getTextFromChildren = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (Array.isArray(node)) return node.map(getTextFromChildren).join('');
      if (node && typeof node === 'object' && 'props' in node) {
        const nodeWithProps = node as { props?: { children?: React.ReactNode } };
        return getTextFromChildren(nodeWithProps.props?.children);
      }
      return '';
    };
    const text = getTextFromChildren(children);
    return <CodeBlock>{text}</CodeBlock>;
  },
});



