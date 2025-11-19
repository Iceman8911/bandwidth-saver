export default defineContentScript({
	main() {},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
