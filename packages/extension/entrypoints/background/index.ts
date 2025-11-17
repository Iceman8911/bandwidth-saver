import {
	checkIfUrlReturnsValidResponse,
	ImageCompressorEndpoint,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import { RuntimeMessageSchema } from "@/models/message";
import { CompressionMode, MessageType } from "@/shared/constants";
import { compressionSettingsStorageItem } from "@/shared/storage";

const ADD_SAVE_DATA_HEADER_RULE_ID = 1;
const REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID = 2;

function appendSaveDataToAllRequests() {
	browser.declarativeNetRequest.updateDynamicRules({
		addRules: [
			{
				action: {
					requestHeaders: [
						{
							header: "Save-Data",
							operation: "set",
							value: "on",
						},
					],
					type: "modifyHeaders",
				},
				condition: {
					resourceTypes: Object.values(
						browser.declarativeNetRequest.ResourceType,
					),
					urlFilter: "*",
				},
				id: ADD_SAVE_DATA_HEADER_RULE_ID,
			},
		],
		removeRuleIds: [ADD_SAVE_DATA_HEADER_RULE_ID], // Remove existing rule if present
	});
}

async function redirectToFirstCompressorEndpointIfPossible() {
	const { enabled, mode, quality, format } =
		await compressionSettingsStorageItem.getValue();

	if (!enabled || mode !== CompressionMode.SIMPLE) {
		await browser.declarativeNetRequest.updateDynamicRules({
			addRules: [],
			removeRuleIds: [REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID],
		});
		return;
	}

	const host = ImageCompressorEndpoint.DEFAULT;
	const hostWithoutProtocol = host.replace(/^https?:\/\//, "");
	const scheme = host.startsWith("http://") ? "http" : "https";

	await browser.declarativeNetRequest.updateDynamicRules({
		addRules: [
			{
				action: {
					redirect: {
						transform: {
							host: hostWithoutProtocol,
							path: "/",
							queryTransform: {
								addOrReplaceParams: [
									{
										key: "url",
										value: "{url}",
									},
									{
										key: "q",
										value: `${quality}`,
									},
									{
										key: "output",
										value: format,
									},
								],
							},
							scheme,
						},
					},
					type: "redirect",
				},
				condition: {
					excludedInitiatorDomains: [hostWithoutProtocol],
					excludedRequestDomains: [hostWithoutProtocol],
					resourceTypes: ["image"],
					urlFilter: "*",
				},
				id: REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID,
			},
		],
		removeRuleIds: [REDIRECT_TO_SIMPLE_COMPRESSION_PROXY_RULE_ID],
	});
}

function watchCompressionSettingsChanges() {
	compressionSettingsStorageItem.watch(() => {
		redirectToFirstCompressorEndpointIfPossible();
	});
}

function checkIfCompressionUrlFromContentScriptIsValid() {
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
	appendSaveDataToAllRequests();

	redirectToFirstCompressorEndpointIfPossible();
	watchCompressionSettingsChanges();

	checkIfCompressionUrlFromContentScriptIsValid();
});
