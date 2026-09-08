// Native Next.js / Netlify runtime. Sites replaces this module through Vite.
export function runtimeValues():Record<string,string|undefined>{return process.env}
