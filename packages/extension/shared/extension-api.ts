export async function declarativeNetRequestSafeUpdateDynamicRules(
	opts: Browser.declarativeNetRequest.UpdateRuleOptions,
) {
	try {
		await browser.declarativeNetRequest.updateDynamicRules(opts);
	} catch (err) {
		console.error("updateDynamicRules failed", err, opts);
	}
}
