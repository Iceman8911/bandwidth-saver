import type { ElysiaApp } from "@bandwidth-saver/proxy";
import { treaty } from "@elysiajs/eden";
import type { DEFAULT_PROXY_SETTINGS } from "@/models/storage";

export function getEdenClient({ host, port }: typeof DEFAULT_PROXY_SETTINGS) {
	//@ts-expect-error - Elysia version mismatch between @elysiajs/eden and @bandwidth-saver/proxy dependencies
	return treaty<ElysiaApp>(`http://${host}:${port}`);
}
