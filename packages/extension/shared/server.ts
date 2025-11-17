import type { ElysiaApp } from "@bandwidth-saver/proxy";
import { getExtensionEnv } from "@bandwidth-saver/shared";
import { treaty } from "@elysiajs/eden";

const env = getExtensionEnv();

//@ts-expect-error - Elysia version mismatch between @elysiajs/eden and @bandwidth-saver/proxy dependencies
export const clientProxy = treaty<ElysiaApp>(
	`https://${env.VITE_SERVER_HOST}:${env.VITE_SERVER_PORT}`,
);
