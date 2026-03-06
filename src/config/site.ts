export const siteConfig = {
  name: 'GitReview',
  description: 'AI-powered code review tool for GitHub pull requests',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  githubRepo: 'https://github.com/gitreview/gitreview',
} as const;
