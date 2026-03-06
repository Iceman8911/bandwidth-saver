import { describe, expect, it } from "vitest";
import { getBrowserMajorVersion } from "./browser-info";

describe(getBrowserMajorVersion.name, () => {
	it("should properly extract the browser major versions from the given user agent string", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0 Firefox/123",
		);

		expect(chrome).toBe(145);
		expect(firefox).toBe(123);
		expect(webkit).toBe(537);
	});

	it("should extract version from Chrome on Windows", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		);

		expect(chrome).toBe(120);
		expect(firefox).toBe(1);
		expect(webkit).toBe(537);
	});

	it("should extract version from Firefox on macOS", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
		);

		expect(chrome).toBe(1);
		expect(firefox).toBe(121);
		expect(webkit).toBe(1);
	});

	it("should extract version from Safari on macOS", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
		);

		expect(chrome).toBe(1);
		expect(firefox).toBe(1);
		expect(webkit).toBe(605);
	});

	it("should extract version from Edge on Windows", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
		);

		expect(chrome).toBe(120);
		expect(firefox).toBe(1);
		expect(webkit).toBe(537);
	});

	it("should return 1 for all versions when user agent is empty string", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion("");

		expect(chrome).toBe(1);
		expect(firefox).toBe(1);
		expect(webkit).toBe(1);
	});

	it("should return 1 for all versions when user agent is undefined", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(undefined);

		expect(chrome).toBe(1);
		expect(firefox).toBe(1);
		expect(webkit).toBe(1);
	});

	it("should handle user agent with only Chrome version", () => {
		const { chrome, firefox, webkit } =
			getBrowserMajorVersion("Chrome/115.0.0.0");

		expect(chrome).toBe(115);
		expect(firefox).toBe(1);
		expect(webkit).toBe(1);
	});

	it("should handle user agent with only Firefox version", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion("Firefox/110.0");

		expect(chrome).toBe(1);
		expect(firefox).toBe(110);
		expect(webkit).toBe(1);
	});

	it("should handle user agent with only WebKit version", () => {
		const { chrome, firefox, webkit } =
			getBrowserMajorVersion("AppleWebKit/537.36");

		expect(chrome).toBe(1);
		expect(firefox).toBe(1);
		expect(webkit).toBe(537);
	});

	it("should handle case-insensitive version strings", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"CHROME/100.0 FIREFOX/95.0 APPLEWEBKIT/600.0",
		);

		expect(chrome).toBe(100);
		expect(firefox).toBe(95);
		expect(webkit).toBe(600);
	});

	it("should extract first occurrence when multiple versions present", () => {
		const { chrome } = getBrowserMajorVersion("Chrome/100.0 Chrome/200.0");

		expect(chrome).toBe(100);
	});

	it("should handle malformed user agent with random text", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Random text without version numbers",
		);

		expect(chrome).toBe(1);
		expect(firefox).toBe(1);
		expect(webkit).toBe(1);
	});

	it("should handle user agent with zero as version", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Chrome/0.0 Firefox/0.0 AppleWebKit/0.0",
		);

		expect(chrome).toBe(0);
		expect(firefox).toBe(0);
		expect(webkit).toBe(0);
	});

	it("should extract version from Android Chrome", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
		);

		expect(chrome).toBe(119);
		expect(firefox).toBe(1);
		expect(webkit).toBe(537);
	});

	it("should extract version from iOS Safari", () => {
		const { chrome, firefox, webkit } = getBrowserMajorVersion(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		);

		expect(chrome).toBe(1);
		expect(firefox).toBe(1);
		expect(webkit).toBe(605);
	});
});
