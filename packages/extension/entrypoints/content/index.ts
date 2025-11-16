import ky from "ky";
import { getCompressedImageUrlWithFallback } from "@/utils/image-optimization/adapter";

function patchWindowFetchToUseCompression() {
	window.fetch = async (...args: Parameters<typeof fetch>) => {
		const [input, init] = args;

		if (!(input instanceof Request)) {
			// Determine img urls
			return fetch(await getCompressedImageUrlWithFallback(input), init);
		}

		return fetch(input, init);
	};
}

export default defineContentScript({
	matches: ["<all_urls>"],
	runAt: "document_start",

	main() {
		const processedImages = new WeakSet<HTMLImageElement>();
		const pendingCompressions = new Map<string, Promise<string>>();

		const compressImage = async (imgUrl: string): Promise<string> => {
			const pendingCompression = pendingCompressions.get(imgUrl);
			if (pendingCompression) return pendingCompression;

			const compressionPromise = (async () => {
				try {
					return await getCompressedImageUrlWithFallback(imgUrl);
				} catch (error) {
					console.error("Compression failed:", error);
					return imgUrl;
				} finally {
					pendingCompressions.delete(imgUrl);
				}
			})();

			pendingCompressions.set(imgUrl, compressionPromise);
			return compressionPromise;
		};

		const handleImage = async (img: HTMLImageElement) => {
			if (processedImages.has(img) || !img.src || img.src.startsWith("data:")) {
				return;
			}

			processedImages.add(img);
			const originalSrc = img.src;

			img.removeAttribute("src");

			const compressed = await compressImage(originalSrc);
			img.src = compressed;
		};

		// Only compress images when they're near the viewport
		const imageObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const img = entry.target as HTMLImageElement;
						imageObserver.unobserve(img);
						handleImage(img);
					}
				}
			},
			{
				rootMargin: "200px", // Start loading 200px before entering viewport
			},
		);

		// Watch for new images being added to the DOM
		const mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (node instanceof HTMLImageElement && node.src) {
						imageObserver.observe(node);
					} else if (node instanceof Element) {
						node.querySelectorAll("img[src]").forEach((img) => {
							imageObserver.observe(img);
						});
					}
				}
			}
		});

		mutationObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	},
});
