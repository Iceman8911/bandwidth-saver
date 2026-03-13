import { describe, expect, test } from "bun:test";
import * as v from "valibot";
import { type ProxyEnvInput, ProxyEnvSchema } from "./env";

describe("ProxyEnvSchema", () => {
	test("applies defaults when values are missing", () => {
		const input: ProxyEnvInput = {};
		const parsed = v.parse(ProxyEnvSchema, input);

		expect(parsed.VITE_SERVER_HOST).toBe("localhost");
		expect(parsed.VITE_SERVER_PORT).toBe(8080);
		expect(parsed.DEPLOYMENT_PLATFORM).toBe("server");
		expect(parsed.NODE_ENV).toBe("development");
	});

	test("parses VITE_SERVER_PORT string into a number", () => {
		const input: ProxyEnvInput = {
			VITE_SERVER_HOST: "example.com",
			VITE_SERVER_PORT: "1234",
		};
		const parsed = v.parse(ProxyEnvSchema, input);

		expect(parsed.VITE_SERVER_HOST).toBe("example.com");
		expect(parsed.VITE_SERVER_PORT).toBe(1234);
	});

	test("accepts valid DEPLOYMENT_PLATFORM values", () => {
		for (const platform of [
			"server",
			"vercel",
			"cloudflare",
			"deno",
		] as const) {
			const input: ProxyEnvInput = { DEPLOYMENT_PLATFORM: platform };
			const parsed = v.parse(ProxyEnvSchema, input);

			expect(parsed.DEPLOYMENT_PLATFORM).toBe(platform);
		}
	});

	test("accepts valid NODE_ENV values", () => {
		for (const nodeEnv of ["development", "production", "test"] as const) {
			const input: ProxyEnvInput = { NODE_ENV: nodeEnv };
			const parsed = v.parse(ProxyEnvSchema, input);

			expect(parsed.NODE_ENV).toBe(nodeEnv);
		}
	});
});
