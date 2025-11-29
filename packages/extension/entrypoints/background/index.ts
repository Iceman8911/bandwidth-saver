import {
	checkIfUrlReturnsValidResponse,
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import { RuntimeMessageSchema } from "@/models/message";
import {
	ACTIVE_TAB_URL,
	CompressionMode,
	MessageType,
} from "@/shared/constants";
import {
	compressionSettingsStorageItem,
	getSiteScopedCompressionSettingsStorageItem,
} from "@/shared/storage";
import { saveDataToggleWatcher } from "./compression/save-data";
import { processMonitoredBandwidthData } from "./statistics/bandwidth-calculation";
import { monitorBandwidthUsageViaBackground } from "./statistics/bandwidth-monitoring";

const REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID = 2;

async function redirectToFirstCompressorEndpointIfPossible() {
	const { enabled, mode, quality, format, preserveAnim, preferredEndpoint } =
		(await getSiteScopedCompressionSettingsStorageItem(
			await ACTIVE_TAB_URL(),
		).getValue()) ?? (await compressionSettingsStorageItem.getValue());

	if (!enabled || mode !== CompressionMode.SIMPLE) {
		await browser.declarativeNetRequest.updateDynamicRules({
			addRules: [],
			removeRuleIds: [REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID],
		});
		return;
	}

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

	const host = preferredEndpoint;
	const hostWithoutProtocol = host.replace(/^https?:\/\//, "");

	await browser.declarativeNetRequest.updateDynamicRules({
		addRules: [
			{
				action: {
					redirect: {
						regexSubstitution: urlConstructor({
							format,
							preserveAnim,
							quality,
							//@ts-expect-error This will slot in the url here
							url: "\\0",
						}),
					},
					type: "redirect",
				},
				condition: {
					excludedInitiatorDomains: [hostWithoutProtocol],
					excludedRequestDomains: [hostWithoutProtocol],
					regexFilter:
						"^https?://.*.(png|jpe?g|webp|gif|svg|bmp|ico|avif)([?#].*)?$",
					resourceTypes: ["image"],
				},
				id: REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID,
			},
		],
		removeRuleIds: [REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID],
	});
}

function watchCompressionSettingsChanges() {
	compressionSettingsStorageItem.watch(() => {
		redirectToFirstCompressorEndpointIfPossible().catch((error) => {
			console.error("Failed to update compression redirect rule:", error);
		});
	});
}

function _checkIfCompressionUrlFromContentScriptIsValid() {
	browser.runtime.onMessage.addListener((message, _, sendResponse) => {
		const parsedMessage = v.parse(RuntimeMessageSchema, message);

		if (parsedMessage.type === MessageType.VALIDATE_URL) {
			checkIfUrlReturnsValidResponse(parsedMessage.url)
				.then(sendResponse)
				.catch((error) => sendResponse({ error: error.message }));

			return true;
		}

		return false;
	});
}

export default defineBackground(() => {
	monitorBandwidthUsageViaBackground();
	processMonitoredBandwidthData();

	saveDataToggleWatcher();

	redirectToFirstCompressorEndpointIfPossible();
	watchCompressionSettingsChanges();

	// checkIfCompressionUrlFromContentScriptIsValid();
});
