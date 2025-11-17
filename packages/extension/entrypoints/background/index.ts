import { checkIfUrlReturnsValidResponse } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { RuntimeMessageSchema } from "@/models/message";
import { MessageType } from "@/shared/constants";

const ADD_SAVE_DATA_HEADER_RULE_ID = 1;

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

	checkIfCompressionUrlFromContentScriptIsValid();
});
