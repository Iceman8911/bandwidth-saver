import * as v from "valibot";

const SharedEnvSchema = v.object({
	VITE_SERVER_HOST: v.optional(v.pipe(v.string()), "localhost"),
	VITE_SERVER_PORT: v.optional(v.pipe(v.string(), v.transform(Number)), "3000"),
});

/**
 * Environment variable schema for the proxy service
 */
export const ProxyEnvSchema = v.looseObject({
	...SharedEnvSchema.entries,
	NODE_ENV: v.optional(
		v.picklist(["development", "production", "test"]),
		"development",
	),
});

/**
 * Environment variable schema for the browser extension
 */
export const ExtensionEnvSchema = v.looseObject({
	...SharedEnvSchema.entries,
	VITE_BROWSER: v.optional(v.string()),
	VITE_COMMAND: v.optional(v.picklist(["serve", "build"]), "serve"),
	VITE_DEV: v.optional(v.boolean(), true),
	VITE_MANIFEST_VERSION: v.optional(
		v.pipe(
			v.string(),
			v.transform(Number),
			v.union([v.literal(2), v.literal(3)]),
		),
	),
	VITE_MODE: v.optional(
		v.picklist(["development", "production"]),
		"development",
	),
	VITE_PROD: v.optional(v.boolean(), false),
	VITE_PROXY_BASE_URL: v.pipe(v.string(), v.url()),
});

export type ProxyEnv = v.InferOutput<typeof ProxyEnvSchema>;
export type ExtensionEnv = v.InferOutput<typeof ExtensionEnvSchema>;

export function getProxyEnv(): ProxyEnv {
	return v.parse(ProxyEnvSchema, process.env);
}

export function getExtensionEnv(): ExtensionEnv {
	return v.parse(ExtensionEnvSchema, import.meta.env);
}
