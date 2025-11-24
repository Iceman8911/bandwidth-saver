import { DeclarativeNetRequestRuleIds } from "@/shared/constants";

const { ADD_SAVE_DATA_HEADER } = DeclarativeNetRequestRuleIds;

const resourceTypes = Object.values(browser.declarativeNetRequest.ResourceType);

export function enableSaveDataForAllRequests() {
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
					resourceTypes,
					urlFilter: "*",
				},
				id: ADD_SAVE_DATA_HEADER,
			},
		],
		removeRuleIds: [ADD_SAVE_DATA_HEADER],
	});
}
