import type {
  BundledLanguage,
  Highlighter,
  ThemedToken,
} from 'shiki';

const THEME = 'github-dark' as const;

/** Map file extensions to Shiki language IDs */
const EXT_TO_LANG: Record<string, BundledLanguage> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'fish',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  json: 'json',
  jsonc: 'jsonc',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  md: 'markdown',
  mdx: 'mdx',
  vue: 'vue',
  svelte: 'svelte',
  astro: 'astro',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  makefile: 'makefile',
  mk: 'makefile',
  tf: 'hcl',
  hcl: 'hcl',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hs: 'haskell',
  scala: 'scala',
  clj: 'clojure',
  lisp: 'lisp',
  pl: 'perl',
  ps1: 'powershell',
  psm1: 'powershell',
  ini: 'ini',
  cfg: 'ini',
  prisma: 'prisma',
  proto: 'proto',
  zig: 'zig',
  nim: 'nim',
  nix: 'nix',
  wgsl: 'wgsl',
  glsl: 'glsl',
  env: 'dotenv',
};

// Filenames without extensions that map to languages
const FILENAME_TO_LANG: Record<string, BundledLanguage> = {
  Dockerfile: 'dockerfile',
  Makefile: 'makefile',
  Gemfile: 'ruby',
  Rakefile: 'ruby',
  Vagrantfile: 'ruby',
  Brewfile: 'ruby',
  '.gitignore': 'ini',
  '.env': 'dotenv',
  '.env.local': 'dotenv',
  '.env.production': 'dotenv',
};

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<string>();

/**
 * Get or create the singleton Shiki highlighter.
 * Lazy-loads — only initializes on first call.
 */
async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then((shiki) =>
      shiki.createHighlighter({
        themes: [THEME],
        langs: [],
      }),
    );
  }
  return highlighterPromise;
}

/** Resolve a filename to a Shiki language ID, or null if unsupported */
export function resolveLanguage(filename: string): BundledLanguage | null {
  const basename = filename.split('/').pop() ?? filename;

  // Check exact filename matches first
  if (basename in FILENAME_TO_LANG) {
    return FILENAME_TO_LANG[basename];
  }

  const ext = basename.includes('.') ? basename.split('.').pop()?.toLowerCase() : null;
  if (!ext) return null;

  return EXT_TO_LANG[ext] ?? null;
}

/** Ensure a language grammar is loaded */
async function ensureLanguageLoaded(
  highlighter: Highlighter,
  lang: BundledLanguage,
): Promise<void> {
  if (loadedLangs.has(lang)) return;

  try {
    await highlighter.loadLanguage(lang);
    loadedLangs.add(lang);
  } catch {
    // Language grammar not available — will fall back to plaintext
  }
}

// Simple LRU-ish cache: Map preserves insertion order, we cap at 500 entries
const tokenCache = new Map<string, ThemedToken[][]>();
const CACHE_MAX = 500;

function getCacheKey(code: string, lang: string): string {
  return `${lang}:${code}`;
}

/**
 * Highlight a block of code and return themed tokens per line.
 * Falls back to unhighlighted tokens for unsupported languages.
 */
export async function highlightCode(
  code: string,
  language: string,
): Promise<ThemedToken[][]> {
  if (!code.trim()) {
    return code.split('\n').map(() => []);
  }

  const cacheKey = getCacheKey(code, language);
  const cached = tokenCache.get(cacheKey);
  if (cached) return cached;

  const lang = resolveLanguage(language) ?? (language as BundledLanguage);

  try {
    const highlighter = await getHighlighter();
    await ensureLanguageLoaded(highlighter, lang);

    const loadedLanguages = highlighter.getLoadedLanguages();
    const isLoaded = loadedLanguages.includes(lang);

    if (!isLoaded) {
      return makePlaintextTokens(code);
    }

    const result = highlighter.codeToTokensBase(code, {
      lang,
      theme: THEME,
    });

    // Cache management — evict oldest when full
    if (tokenCache.size >= CACHE_MAX) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey !== undefined) {
        tokenCache.delete(firstKey);
      }
    }
    tokenCache.set(cacheKey, result);

    return result;
  } catch {
    return makePlaintextTokens(code);
  }
}

/** Create unhighlighted tokens as a fallback */
function makePlaintextTokens(code: string): ThemedToken[][] {
  let offset = 0;
  return code.split('\n').map((line) => {
    const token: ThemedToken = { content: line, color: '#e1e4e8', offset };
    offset += line.length + 1; // +1 for the newline
    return [token];
  });
}

/**
 * Highlight individual diff lines, joining them into a single code block
 * for proper cross-line grammar state (e.g., multiline strings).
 * Returns one ThemedToken[] per input line.
 */
export async function highlightDiffLines(
  lines: { content: string }[],
  language: string,
): Promise<ThemedToken[][]> {
  if (lines.length === 0) return [];

  // Strip the leading +/-/space from diff content for highlighting,
  // but only if it's a diff prefix character
  const codeLines = lines.map((l) => {
    const first = l.content[0];
    if (first === '+' || first === '-' || first === ' ') {
      return l.content.slice(1);
    }
    return l.content;
  });

  const fullCode = codeLines.join('\n');
  const tokens = await highlightCode(fullCode, language);

  // Shiki may return fewer lines if trailing empty lines are collapsed
  // Pad with empty token arrays to match input length
  while (tokens.length < lines.length) {
    tokens.push([{ content: '', color: '#e1e4e8', offset: 0 }]);
  }

  return tokens;
}

/** Pre-warm the highlighter so it's ready when the first diff loads */
export async function preloadHighlighter(): Promise<void> {
  await getHighlighter();
}
