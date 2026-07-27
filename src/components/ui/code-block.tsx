'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

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
 * Cobalt syntax palette. Five roles, all from tokens: cobalt for keywords and
 * properties, green for strings, amber for literals, muted grey for comments
 * and punctuation, plain ink for everything else. A sixth colour would turn a
 * code card into a fruit bowl — if a Prism token needs a hue it doesn't have,
 * fold it into one of these five rather than inventing a value here.
 */
const TOK = {
  key: { color: 'var(--color-tok-key)' },
  str: { color: 'var(--color-tok-str)' },
  num: { color: 'var(--color-tok-num)' },
  com: { color: 'var(--color-tok-com)' },
  dim: { color: 'var(--color-on-graphite-3)' },
} as const;

const cobaltCode: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: 'var(--color-on-graphite)' },
  'pre[class*="language-"]': { color: 'var(--color-on-graphite)' },
  comment: { ...TOK.com, fontStyle: 'italic' },
  prolog: TOK.com,
  doctype: TOK.com,
  cdata: TOK.com,
  punctuation: TOK.dim,
  operator: TOK.dim,
  entity: TOK.dim,
  url: TOK.str,
  property: TOK.key,
  tag: TOK.key,
  keyword: TOK.key,
  'attr-name': TOK.key,
  selector: TOK.key,
  'class-name': TOK.key,
  function: TOK.key,
  variable: { color: 'var(--color-on-graphite)' },
  string: TOK.str,
  char: TOK.str,
  'attr-value': TOK.str,
  regex: TOK.str,
  inserted: TOK.str,
  boolean: TOK.num,
  number: TOK.num,
  constant: TOK.num,
  symbol: TOK.num,
  builtin: TOK.num,
  deleted: { color: 'var(--color-bad)' },
  important: { fontWeight: 600 },
  bold: { fontWeight: 600 },
};

/**
 * Bloque de código con resaltado de sintaxis y botón de copiar. Vive siempre
 * sobre grafito — la única superficie oscura que `design.md` permite en la doc.
 */
export function CodeBlock({
  code,
  language,
  maxHeight = 360,
  showCopy = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-graphite-rule)] bg-[var(--color-graphite)] ${className ?? ''}`}
    >
      {showCopy ? (
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Código copiado' : 'Copiar código'}
          className="absolute right-2 top-2 z-10 rounded-[var(--radius-sm)] border border-[var(--color-graphite-rule)] bg-[var(--color-graphite-2)] p-1.5 text-[var(--color-on-graphite-2)] opacity-0 transition-[opacity,color] duration-[var(--dur-fast)] hover:text-[var(--color-on-graphite)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          {copied ? (
            <Check size={13} className="text-[var(--color-tok-str)]" />
          ) : (
            <Copy size={13} />
          )}
        </button>
      ) : null}
      <SyntaxHighlighter
        language={language}
        style={cobaltCode}
        customStyle={{
          margin: 0,
          padding: '14px 16px',
          fontSize: '11.5px',
          lineHeight: 1.65,
          maxHeight,
          background: 'transparent',
          borderRadius: 0,
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
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
    react: 'jsx',
    python: 'python',
    php: 'php',
    html: 'markup',
    vue: 'markup',
    json: 'json',
    bash: 'bash',
  };
  return map[lang] ?? 'text';
}
