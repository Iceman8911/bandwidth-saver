import * as v from "valibot";
import { RuntimeMessageSchema } from "@/models/message";
import { MessageType } from "@/shared/constants";
import { checkIfUrlReturnsValidResponse } from "@/utils/fetch";

function appendSaveDataToAllRequests() {
	const ADD_SAVE_DATA_HEADER_RULE_ID = 1;

	browser.declarativeNetRequest.updateDynamicRules({
		removeRuleIds: [ADD_SAVE_DATA_HEADER_RULE_ID], // Remove existing rule if present
		addRules: [
			{
				id: ADD_SAVE_DATA_HEADER_RULE_ID,
				action: {
					type: "modifyHeaders",
					requestHeaders: [
						{
							header: "Save-Data",
							operation: "set",
							value: "on",
						},
					],
				},
				condition: {
					urlFilter: "*",
					resourceTypes: Object.values(
						browser.declarativeNetRequest.ResourceType,
					),
				},
			},
		],
	});
}

function checkIfCompressionUrlFromContentScriptIsValid() {
	browser.runtime.onMessage.addListener((message, _, sendResponse) => {
		const parsedMessage = v.parse(RuntimeMessageSchema, message);

		if (parsedMessage.type === MessageType.VALIDATE_COMPRESSION_URL) {
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

	checkIfCompressionUrlFromContentScriptIsValid();
});
