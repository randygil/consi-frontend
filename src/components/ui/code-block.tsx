'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language: string;
  /** Máxima altura del área de scroll en px. */
  maxHeight?: number;
  /** Muestra el botón de copiar flotante (aparece en hover). */
  showCopy?: boolean;
  className?: string;
}

/**
 * Bloque de código con resaltado de sintaxis (Prism + tema One Dark) y
 * botón de copiar. Pensado para reutilizarse en la documentación de la API.
 */
export function CodeBlock({ code, language, maxHeight = 360, showCopy = true, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`group relative overflow-hidden rounded-lg border border-white/5 ${className ?? ''}`}>
      {showCopy ? (
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar código"
          className="absolute right-2 top-2 z-10 rounded-md border border-white/10 bg-white/5 p-1.5 text-white/70 opacity-0 backdrop-blur transition-all hover:bg-white/15 hover:text-white group-hover:opacity-100"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
        </button>
      ) : null}
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '14px 16px',
          fontSize: '11.5px',
          lineHeight: 1.6,
          maxHeight,
          background: 'var(--ink-950)',
          borderRadius: 0,
        }}
        codeTagProps={{
          style: { fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/** Mapea los lenguajes "lógicos" de la doc a los identificadores de Prism. */
export function toPrismLang(lang: string): string {
  const map: Record<string, string> = {
    curl: 'bash',
    js: 'javascript',
    jsx: 'jsx',
    tsx: 'tsx',
    ts: 'typescript',
    react: 'tsx',
    python: 'python',
    php: 'php',
    html: 'markup',
    vue: 'markup',
    json: 'json',
    bash: 'bash',
  };
  return map[lang] ?? 'text';
}
