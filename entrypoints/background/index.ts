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

export default defineBackground(() => {
	appendSaveDataToAllRequests();
});
