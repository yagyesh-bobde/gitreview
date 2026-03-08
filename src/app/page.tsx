import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/auth';
import { GitPullRequest } from 'lucide-react';
import './landing.css';

export default async function HomePage() {
  const session = await auth();

  // Defense-in-depth: middleware should handle this redirect,
  // but if it doesn't, catch it here at the page level.
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="landing">
      <div className="page">

        {/* NAV */}
        <nav>
          <a href="#" className="nav-logo">
            <div className="nav-logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3"/>
                <circle cx="6" cy="6" r="3"/>
                <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
                <line x1="6" x2="6" y1="9" y2="21"/>
              </svg>
            </div>
            GitReview
          </a>

          <ul className="nav-links">
            <li><a href="#">Features</a></li>
            <li><a href="#">Pricing</a></li>
            <li><a href="#">Docs</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Changelog</a></li>
          </ul>

          <div className="nav-cta">
            <Link href="/login" className="btn-nav">Sign in</Link>
            <Link href="/login" className="btn-nav-primary">Get started free</Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            AI-Powered Code Review
          </div>

          <h1 className="hero-headline">
            <span className="hl-light">The </span><span className="hl-serif">best way</span><span className="hl-normal"> to review</span><br/><span className="hl-bold">pull requests.</span>
          </h1>

          <p className="hero-sub">
            AI-powered code review that catches bugs, enforces patterns, and ships feedback
            in seconds — not hours.
          </p>

          <div className="hero-actions">
            <Link href="/login" className="btn-primary">
              {/* GitHub mark */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              Continue with GitHub
            </Link>
            <a href="#" className="btn-secondary">
              Watch demo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </a>
          </div>

          <p className="hero-social-proof">Free for open source &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Setup in 2 minutes</p>

          {/* PRODUCT MOCKUP */}
          <div className="mockup-wrapper">
            <div className="mockup-glow"></div>

            <div className="browser-window">

              {/* Browser Chrome */}
              <div className="browser-chrome">
                <div className="traffic-lights">
                  <div className="tl tl-red"></div>
                  <div className="tl tl-yellow"></div>
                  <div className="tl tl-green"></div>
                </div>
                <div className="browser-tabs">
                  <div className="browser-tab active">
                    <div className="tab-favicon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
                        <path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>
                      </svg>
                    </div>
                    GitReview — feat/auth-refactor #247
                  </div>
                  <div className="browser-tab">
                    <div className="tab-favicon tab-favicon-secondary">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                      </svg>
                    </div>
                    GitHub — octocat/app
                  </div>
                </div>
                <div className="browser-url-bar">
                  <span className="url-lock">🔒</span>
                  <span className="url-text">app.gitreview.dev/<span>octocat/app/pull/247</span></span>
                </div>
              </div>

              {/* App Shell */}
              <div className="app-shell">

                {/* PR Metadata Bar */}
                <div className="pr-meta-bar">
                  <div className="pr-meta-left">
                    <div className="pr-back-btn">&#8592;</div>
                    <div className="pr-title-row">
                      <span className="pr-title">refactor: migrate auth flow to JWT with refresh token rotation</span>
                      <span className="pr-number">#247</span>
                      <span className="badge badge-open">Open</span>
                    </div>
                  </div>
                  <div className="pr-meta-right">
                    <div className="branch-tag">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/>
                      </svg>
                      feat/auth-refactor
                      <span className="arrow">→</span>
                      main
                    </div>
                    <div className="diff-stats">
                      <span className="stat-add">+284</span>
                      <span className="stat-sep">/</span>
                      <span className="stat-del">-97</span>
                    </div>
                  </div>
                </div>

                {/* Main Layout: Sidebar + Diff + AI Panel */}
                <div className="app-main">

                  {/* File Tree Sidebar */}
                  <div className="sidebar">
                    <div className="sidebar-header">
                      <span className="sidebar-title">Files</span>
                      <span className="sidebar-count">12 / 12</span>
                    </div>
                    <div className="file-tree">

                      {/* src/components */}
                      <div className="tree-dir">
                        <div className="tree-dir-label">
                          <span className="tree-dir-icon">▾</span>
                          <span className="tree-dir-name">src / components</span>
                        </div>
                        <div className="tree-children">
                          <div className="tree-file">
                            <span className="file-status file-status-m">M</span>
                            <span className="tree-file-name">AuthProvider.tsx</span>
                            <span className="file-diff-count">+42</span>
                          </div>
                          <div className="tree-file">
                            <span className="file-status file-status-a">A</span>
                            <span className="tree-file-name">TokenRefresh.tsx</span>
                            <span className="file-diff-count">+88</span>
                          </div>
                          <div className="tree-file">
                            <span className="file-status file-status-m">M</span>
                            <span className="tree-file-name">LoginForm.tsx</span>
                            <span className="file-diff-count">+12</span>
                          </div>
                        </div>
                      </div>

                      {/* src/lib */}
                      <div className="tree-dir">
                        <div className="tree-dir-label">
                          <span className="tree-dir-icon">▾</span>
                          <span className="tree-dir-name">src / lib</span>
                        </div>
                        <div className="tree-children">
                          <div className="tree-file active">
                            <span className="file-status file-status-m">M</span>
                            <span className="tree-file-name">api.ts</span>
                            <span className="file-diff-count">+67</span>
                          </div>
                          <div className="tree-file">
                            <span className="file-status file-status-a">A</span>
                            <span className="tree-file-name">jwt.ts</span>
                            <span className="file-diff-count">+54</span>
                          </div>
                          <div className="tree-file">
                            <span className="file-status file-status-d">D</span>
                            <span className="tree-file-name">session.ts</span>
                            <span className="file-diff-count">-43</span>
                          </div>
                        </div>
                      </div>

                      {/* src/hooks */}
                      <div className="tree-dir">
                        <div className="tree-dir-label">
                          <span className="tree-dir-icon">▾</span>
                          <span className="tree-dir-name">src / hooks</span>
                        </div>
                        <div className="tree-children">
                          <div className="tree-file">
                            <span className="file-status file-status-m">M</span>
                            <span className="tree-file-name">useAuth.ts</span>
                            <span className="file-diff-count">+19</span>
                          </div>
                          <div className="tree-file">
                            <span className="file-status file-status-a">A</span>
                            <span className="tree-file-name">useToken.ts</span>
                            <span className="file-diff-count">+31</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Diff Viewer */}
                  <div className="diff-panel">
                    <div className="diff-file-header">
                      <div className="diff-file-path">
                        <span className="dir">src / lib /</span>
                        <span className="name">api.ts</span>
                      </div>
                      <div className="diff-file-actions">
                        <button className="diff-action-btn">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                          </svg>
                          Copy
                        </button>
                        <button className="diff-action-btn">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Open
                        </button>
                        <button className="diff-action-btn diff-action-btn-reviewed">
                          ✓ Mark reviewed
                        </button>
                      </div>
                    </div>

                    <div className="diff-viewer">

                      {/* Hunk 1 */}
                      <div className="diff-hunk-header">@@ -1,8 +1,10 @@ import type {'{'} RequestInit {'}'} from &apos;node-fetch&apos;</div>

                      <div className="diff-line diff-line-unchanged">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">1</div>
                          <div className="diff-line-num">1</div>
                        </div>
                        <div className="diff-line-sign"></div>
                        <div className="diff-line-code"><span className="kw">import</span> <span className="pun">{'{'}</span> <span className="prop">z</span> <span className="pun">{'}'}</span> <span className="kw">from</span> <span className="str">&apos;zod&apos;</span></div>
                      </div>

                      <div className="diff-line diff-line-del">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">2</div>
                          <div className="diff-line-num"></div>
                        </div>
                        <div className="diff-line-sign">-</div>
                        <div className="diff-line-code"><span className="kw">import</span> <span className="pun">{'{'}</span> <span className="prop">getSession</span><span className="pun">,</span> <span className="prop">destroySession</span> <span className="pun">{'}'}</span> <span className="kw">from</span> <span className="str">&apos;./session&apos;</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">2</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code"><span className="kw">import</span> <span className="pun">{'{'}</span> <span className="prop">signToken</span><span className="pun">,</span> <span className="prop">verifyToken</span><span className="pun">,</span> <span className="prop">refreshAccessToken</span> <span className="pun">{'}'}</span> <span className="kw">from</span> <span className="str">&apos;./jwt&apos;</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">3</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code"><span className="kw">import</span> <span className="kw">type</span> <span className="pun">{'{'}</span> <span className="type">JWTPayload</span><span className="pun">,</span> <span className="type">TokenPair</span> <span className="pun">{'}'}</span> <span className="kw">from</span> <span className="str">&apos;./jwt&apos;</span></div>
                      </div>

                      <div className="diff-line diff-line-unchanged">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">3</div>
                          <div className="diff-line-num">4</div>
                        </div>
                        <div className="diff-line-sign"></div>
                        <div className="diff-line-code"></div>
                      </div>

                      <div className="diff-line diff-line-del">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">4</div>
                          <div className="diff-line-num"></div>
                        </div>
                        <div className="diff-line-sign">-</div>
                        <div className="diff-line-code"><span className="kw">const</span> <span className="prop">TOKEN_EXPIRY</span> <span className="op">=</span> <span className="num">3600</span> <span className="cmt">// 1 hour in seconds</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">5</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code"><span className="kw">const</span> <span className="prop">ACCESS_TOKEN_TTL</span> <span className="op">=</span> <span className="num">900</span>  <span className="cmt">// 15 minutes</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">6</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code"><span className="kw">const</span> <span className="prop">REFRESH_TOKEN_TTL</span> <span className="op">=</span> <span className="num">604800</span> <span className="cmt">// 7 days</span></div>
                      </div>

                      {/* Hunk 2 */}
                      <div className="diff-hunk-header">@@ -28,14 +32,24 @@ export async function createAuthTokens(userId: string)</div>

                      <div className="diff-line diff-line-unchanged">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">28</div>
                          <div className="diff-line-num">32</div>
                        </div>
                        <div className="diff-line-sign"></div>
                        <div className="diff-line-code"><span className="kw">export async function</span> <span className="fn">createAuthTokens</span><span className="pun">(</span><span className="prop">userId</span><span className="op">:</span> <span className="type">string</span><span className="pun">)</span><span className="op">:</span> <span className="type">Promise</span><span className="pun">&lt;</span><span className="type">TokenPair</span><span className="pun">&gt;</span> <span className="pun">{'{'}</span></div>
                      </div>

                      <div className="diff-line diff-line-del">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">29</div>
                          <div className="diff-line-num"></div>
                        </div>
                        <div className="diff-line-sign">-</div>
                        <div className="diff-line-code">{'  '}<span className="kw">const</span> <span className="prop">token</span> <span className="op">=</span> <span className="kw">await</span> <span className="fn">signToken</span><span className="pun">({'{'}</span> <span className="prop">sub</span><span className="op">:</span> <span className="prop">userId</span><span className="pun">,</span> <span className="prop">exp</span><span className="op">:</span> <span className="prop">TOKEN_EXPIRY</span> <span className="pun">{'}'})</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">33</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'  '}<span className="kw">const</span> <span className="pun">[</span><span className="prop">accessToken</span><span className="pun">,</span> <span className="prop">refreshToken</span><span className="pun">]</span> <span className="op">=</span> <span className="kw">await</span> <span className="type">Promise</span><span className="pun">.</span><span className="fn">all</span><span className="pun">([</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">34</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'    '}<span className="fn">signToken</span><span className="pun">{'({'}</span><span className="prop">sub</span><span className="op">:</span> <span className="prop">userId</span><span className="pun">,</span> <span className="prop">type</span><span className="op">:</span> <span className="str">&apos;access&apos;</span><span className="pun">,</span> <span className="prop">exp</span><span className="op">:</span> <span className="prop">ACCESS_TOKEN_TTL</span><span className="pun">{'}'}</span><span className="pun">),</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">35</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'    '}<span className="fn">signToken</span><span className="pun">{'({'}</span><span className="prop">sub</span><span className="op">:</span> <span className="prop">userId</span><span className="pun">,</span> <span className="prop">type</span><span className="op">:</span> <span className="str">&apos;refresh&apos;</span><span className="pun">,</span> <span className="prop">exp</span><span className="op">:</span> <span className="prop">REFRESH_TOKEN_TTL</span><span className="pun">{'}'}</span><span className="pun">),</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">36</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'  '}<span className="pun">])</span></div>
                      </div>

                      <div className="diff-line diff-line-unchanged">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">30</div>
                          <div className="diff-line-num">37</div>
                        </div>
                        <div className="diff-line-sign"></div>
                        <div className="diff-line-code">{'  '}<span className="kw">return</span> <span className="pun">{'{'}</span> <span className="prop">accessToken</span><span className="pun">,</span> <span className="prop">refreshToken</span> <span className="pun">{'}'}</span></div>
                      </div>

                      {/* Hunk 3 with inline comment */}
                      <div className="diff-hunk-header">@@ -56,6 +68,18 @@ export async function handleTokenRefresh(token: string)</div>

                      <div className="diff-line diff-line-unchanged">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">56</div>
                          <div className="diff-line-num">68</div>
                        </div>
                        <div className="diff-line-sign"></div>
                        <div className="diff-line-code"><span className="kw">export async function</span> <span className="fn">handleTokenRefresh</span><span className="pun">(</span><span className="prop">token</span><span className="op">:</span> <span className="type">string</span><span className="pun">)</span> <span className="pun">{'{'}</span></div>
                      </div>

                      <div className="diff-line diff-line-del">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">57</div>
                          <div className="diff-line-num"></div>
                        </div>
                        <div className="diff-line-sign">-</div>
                        <div className="diff-line-code">{'  '}<span className="kw">const</span> <span className="prop">payload</span> <span className="op">=</span> <span className="fn">verifyToken</span><span className="pun">(</span><span className="prop">token</span><span className="pun">)</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">69</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'  '}<span className="kw">const</span> <span className="prop">payload</span> <span className="op">=</span> <span className="kw">await</span> <span className="fn">verifyToken</span><span className="pun">(</span><span className="prop">token</span><span className="pun">)</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">70</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'  '}<span className="kw">if</span> <span className="pun">(!</span><span className="prop">payload</span> <span className="op">||</span> <span className="prop">payload</span><span className="pun">.</span><span className="prop">type</span> <span className="op">!==</span> <span className="str">&apos;refresh&apos;</span><span className="pun">)</span> <span className="pun">{'{'}</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">71</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'    '}<span className="kw">throw new</span> <span className="type">Error</span><span className="pun">(</span><span className="str">&apos;Invalid or expired refresh token&apos;</span><span className="pun">)</span></div>
                      </div>

                      {/* Inline AI Comment Thread */}
                      <div className="diff-comment-thread">
                        <div className="diff-comment">
                          <div className="diff-comment-avatar diff-comment-ai-avatar">AI</div>
                          <div className="diff-comment-body">
                            <div className="diff-comment-meta">
                              <span className="diff-comment-author">GitReview AI</span>
                              <span className="badge badge-ai" style={{ fontSize: '10px', padding: '1px 6px' }}>Security</span>
                              <span className="diff-comment-time">just now</span>
                            </div>
                            <div className="diff-comment-text">
                              Throwing a generic <code>Error</code> here leaks implementation details to the client. Consider using a typed <code>AuthError</code> class with a stable error code (e.g. <code>ERR_INVALID_REFRESH_TOKEN</code>) that you can safely serialize in API responses without exposing internals.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">72</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'  '}<span className="pun">{'}'}</span></div>
                      </div>

                      <div className="diff-line diff-line-add">
                        <div className="diff-line-nums">
                          <div className="diff-line-num"></div>
                          <div className="diff-line-num">73</div>
                        </div>
                        <div className="diff-line-sign">+</div>
                        <div className="diff-line-code">{'  '}<span className="kw">return</span> <span className="fn">refreshAccessToken</span><span className="pun">(</span><span className="prop">payload</span><span className="pun">.</span><span className="prop">sub</span><span className="pun">)</span></div>
                      </div>

                      <div className="diff-line diff-line-unchanged">
                        <div className="diff-line-nums">
                          <div className="diff-line-num">58</div>
                          <div className="diff-line-num">74</div>
                        </div>
                        <div className="diff-line-sign"></div>
                        <div className="diff-line-code"><span className="pun">{'}'}</span></div>
                      </div>

                    </div>
                  </div>

                  {/* AI Panel */}
                  <div className="ai-panel">
                    <div className="ai-panel-header">
                      <div className="ai-panel-title">
                        <div className="ai-icon">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-secondary)' }}>
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                          </svg>
                        </div>
                        AI Review
                      </div>
                      <div className="ai-panel-actions">
                        <button className="ai-action-btn">Re-run</button>
                        <button className="ai-action-btn">Export</button>
                      </div>
                    </div>

                    <div className="ai-panel-content">

                      {/* Summary Card */}
                      <div className="ai-summary-card">
                        <div className="ai-card-header">
                          <span className="ai-card-title">SUMMARY</span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                        </div>
                        <div className="ai-card-body">
                          <p className="ai-summary-text">
                            This PR migrates from <strong>session-based auth</strong> to <strong>JWT with refresh token rotation</strong>. The access/refresh token split is correctly implemented. Main concern is error handling — several <code style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11px', padding: '1px 4px', background: 'var(--bg-overlay)', borderRadius: '3px', color: 'var(--text-primary)' }}>throw new Error()</code> calls should use typed errors.
                          </p>
                        </div>
                      </div>

                      {/* Issues */}
                      <div className="ai-summary-card">
                        <div className="ai-card-header">
                          <span className="ai-card-title">ISSUES FOUND</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>3 total</span>
                        </div>
                        <div className="ai-card-body" style={{ padding: '6px 4px' }}>

                          <div className="ai-issue">
                            <div className="issue-dot issue-critical"></div>
                            <div className="issue-content">
                              <div className="issue-title">Generic error leaks internals</div>
                              <div className="issue-detail">api.ts · L71</div>
                            </div>
                            <div className="issue-line-ref">L71</div>
                          </div>

                          <div className="ai-issue">
                            <div className="issue-dot issue-warning"></div>
                            <div className="issue-content">
                              <div className="issue-title">Refresh token not invalidated on use</div>
                              <div className="issue-detail">jwt.ts · L34–42</div>
                            </div>
                            <div className="issue-line-ref">L34</div>
                          </div>

                          <div className="ai-issue">
                            <div className="issue-dot issue-warning"></div>
                            <div className="issue-content">
                              <div className="issue-title">Missing rate limiting on refresh endpoint</div>
                              <div className="issue-detail">api.ts · L88</div>
                            </div>
                            <div className="issue-line-ref">L88</div>
                          </div>

                        </div>
                      </div>

                      {/* Suggestion Card */}
                      <div className="ai-suggestion">
                        <div className="ai-suggestion-header">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                          </svg>
                          Suggested fix · L71
                        </div>
                        <div className="ai-suggestion-code"><span className="del">- throw new Error(&apos;Invalid or expired refresh token&apos;)</span>{'\n'}<span className="add">+ throw new AuthError(</span>{'\n'}<span className="add">+   &apos;ERR_INVALID_REFRESH_TOKEN&apos;,</span>{'\n'}<span className="add">+   {'{'} statusCode: 401 {'}'}</span>{'\n'}<span className="add">+ )</span></div>
                        <div className="ai-suggestion-actions">
                          <button className="sug-btn sug-btn-accept">Apply fix</button>
                          <button className="sug-btn sug-btn-reject">Dismiss</button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>{/* /app-main */}

              </div>{/* /app-shell */}

              <div className="mockup-fade"></div>

            </div>{/* /browser-window */}
          </div>{/* /mockup-wrapper */}

        </section>{/* /hero */}

        {/* Features strip */}
        <div className="features-strip">
          <div className="feature-item">
            <span className="feature-icon">
              {/* sparkles / AI */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </span>
            AI-powered review summaries
          </div>
          <div className="feature-divider"></div>
          <div className="feature-item">
            <span className="feature-icon">
              {/* search */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            Instant file search
          </div>
          <div className="feature-divider"></div>
          <div className="feature-item">
            <span className="feature-icon">
              {/* users */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            Multi-account support
          </div>
          <div className="feature-divider"></div>
          <div className="feature-item">
            <span className="feature-icon">
              {/* message square with code */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            Inline diff comments
          </div>
          <div className="feature-divider"></div>
          <div className="feature-item">
            <span className="feature-icon">
              {/* keyboard */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
              </svg>
            </span>
            Keyboard-first navigation
          </div>
        </div>

      </div>{/* /page */}
    </div>
  );
}
