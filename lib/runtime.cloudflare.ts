import {env} from 'cloudflare:workers';
export function runtimeValues():Record<string,string|undefined>{return env as unknown as Record<string,string|undefined>}
