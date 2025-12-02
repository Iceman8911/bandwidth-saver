import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import type { DEFAULT_COMPRESSION_SETTINGS } from "@/models/storage";
import {
	ACTIVE_TAB_URL,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";
import {
	compressionSettingsStorageItem,
	getSiteScopedCompressionSettingsStorageItem,
} from "@/shared/storage";

const IMAGE_URL_REGEX =
	"^https?://.+\\.(?:png|jpg|jpeg|gif|webp|avif)(\\?.*)?$";

function getGlobalCompressionRules(
	config: Omit<typeof DEFAULT_COMPRESSION_SETTINGS, "mode">,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	const { enabled, format, preferredEndpoint, preserveAnim, quality } = config;

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	return {
		addRules: enabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: urlConstructor({
									format,
									preserveAnim,
									quality,
									//@ts-expect-error The first capturing group from the regex result will be the entire url
									url: "\\0",
								}),
							},
							type: "redirect",
						},
						condition: {
							excludedInitiatorDomains: [preferredEndpointDomain],
							excludedRequestDomains: [preferredEndpointDomain],
							regexFilter: IMAGE_URL_REGEX,
							resourceTypes: ["image"],
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: [],
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PATCH,
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_MV2,
		],
	};
}

type SiteCompressionOption = { url: UrlSchema; enabled: boolean };

async function getSiteCompressionRules(
	urlOptions: ReadonlyArray<SiteCompressionOption>,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const [activeTabUrl, oldSiteCompressionRules] = await Promise.all([
		ACTIVE_TAB_URL(),
		browser.declarativeNetRequest
			.getDynamicRules()
			.then((rules) =>
				rules.filter(
					(rule) =>
						rule.id ===
							DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD ||
						rule.id ===
							DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_REMOVE,
				),
			),
	]);

	const [_oldEnabledSites, _oldDisabledSites] = oldSiteCompressionRules.reduce<
		[UrlSchema[], UrlSchema[]]
	>(
		(sites, { id, condition: { initiatorDomains } }) => {
			if (
				rule.id ===
				DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD
			)
				sites[0].push();

			return sites;
		},
		[[], []],
	);

	/** We use most of the config from the active tab, otherwise, we'd need to make hundreds to thousands of rules which would be really clunky */
	const { format, preferredEndpoint, preserveAnim, quality } =
		await getSiteScopedCompressionSettingsStorageItem(activeTabUrl).getValue();

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

	const [enabledSites, disabledSites] = urlOptions.reduce<
		[UrlSchema[], UrlSchema[]]
	>(
		(sites, { enabled, url }) => {
			if (enabled) sites[0].push(url);
			else sites[1].push(url);

			return sites;
		},
		[[], []],
	);

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];

	if (enabledSites.length)
		rulesToAdd.push({
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
				initiatorDomains: enabledSites,
				regexFilter: IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			},
			id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD,
			priority: DeclarativeNetRequestPriority.LOW,
		});

	if (disabledSites.length)
		rulesToAdd.push({
			action: {
				type: "allow",
			},
			condition: {
				initiatorDomains: disabledSites,
				regexFilter: IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			},
			id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_REMOVE,
			priority: DeclarativeNetRequestPriority.LOW,
		});

	return {
		addRules: rulesToAdd,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_REMOVE,

			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PATCH_ADD,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PATCH_REMOVE,

			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_ADD,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_REMOVE,

			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_MV2_REMOVE,
		],
	};
}

async function toggleCompressionOnStartup() {
	const globalCompressionSettings =
		await compressionSettingsStorageItem.getValue();

	const globalPromise = declarativeNetRequestSafeUpdateDynamicRules(
		getGlobalCompressionRules(globalCompressionSettings),
	);

	const siteCompressionOptionPromises: Promise<SiteCompressionOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		const compressionOptionPromise: Promise<SiteCompressionOption> =
			getSiteScopedCompressionSettingsStorageItem(url)
				.getValue()
				.then(({ enabled }) => ({ enabled, url }));

		siteCompressionOptionPromises.push(compressionOptionPromise);
	}

	const sitePromise = declarativeNetRequestSafeUpdateDynamicRules(
		await getSiteCompressionRules(
			await Promise.all(siteCompressionOptionPromises),
		),
	);

	await Promise.all([globalPromise, sitePromise]);
}

export async function compressionModeSimpleToggleWatcher() {
	await toggleCompressionOnStartup();

	compressionSettingsStorageItem.watch((settings) => {
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalCompressionRules(settings),
		);
	});

	watchChangesToSiteSpecificSettings(async (changes) => {
		const options = changes.reduce<SiteCompressionOption[]>(
			(options, settingsChange) => {
				if (settingsChange.type === "compression") {
					options.push({
						enabled: settingsChange.change.newValue?.enabled ?? false,
						url: settingsChange.url,
					});
				}

				return options;
			},
			[],
		);

		console.log(await getSiteCompressionRules(options));

		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteCompressionRules(options),
		);
	});
}

// async function redirectToFirstCompressorEndpointIfPossible() {
// 	const { enabled, mode, quality, format, preserveAnim, preferredEndpoint } =
// 		(await getSiteScopedCompressionSettingsStorageItem(
// 			await ACTIVE_TAB_URL(),
// 		).getValue()) ?? (await compressionSettingsStorageItem.getValue());

// 	if (!enabled || mode !== CompressionMode.SIMPLE) {
// 		await browser.declarativeNetRequest.updateDynamicRules({
// 			addRules: [],
// 			removeRuleIds: [
// 				DeclarativeNetRequestRuleIds.REDIRECT_TO_SIMPLE_COMPRESSION_ENDPOINT,
// 			],
// 		});
// 		return;
// 	}

// 	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

// 	const host = preferredEndpoint;
// 	const hostWithoutProtocol = host.replace(/^https?:\/\//, "");

// 	await browser.declarativeNetRequest.updateDynamicRules({
// 		addRules: [
// 			{
// 				action: {
// 					redirect: {
// 						regexSubstitution: urlConstructor({
// 							format,
// 							preserveAnim,
// 							quality,
// 							//@ts-expect-error This will slot in the url here
// 							url: "\\0",
// 						}),
// 					},
// 					type: "redirect",
// 				},
// 				condition: {
// 					excludedInitiatorDomains: [hostWithoutProtocol],
// 					excludedRequestDomains: [hostWithoutProtocol],
// 					regexFilter:
// 						"^https?://.*.(png|jpe?g|webp|gif|svg|bmp|ico|avif)([?#].*)?$",
// 					resourceTypes: ["image"],
// 				},
// 				id: DeclarativeNetRequestRuleIds.REDIRECT_TO_SIMPLE_COMPRESSION_ENDPOINT,
// 			},
// 		],
// 		removeRuleIds: [
// 			DeclarativeNetRequestRuleIds.REDIRECT_TO_SIMPLE_COMPRESSION_ENDPOINT,
// 		],
// 	});
// }

// function watchCompressionSettingsChanges() {
// 	compressionSettingsStorageItem.watch(() => {
// 		redirectToFirstCompressorEndpointIfPossible().catch((error) => {
// 			console.error("Failed to update compression redirect rule:", error);
// 		});
// 	});
// }

// function _checkIfCompressionUrlFromContentScriptIsValid() {
// 	browser.runtime.onMessage.addListener((message, _, sendResponse) => {
// 		const parsedMessage = v.parse(RuntimeMessageSchema, message);

// 		if (parsedMessage.type === MessageType.VALIDATE_URL) {
// 			checkIfUrlReturnsValidResponse(parsedMessage.url)
// 				.then(sendResponse)
// 				.catch((error) => sendResponse({ error: error.message }));

// 			return true;
// 		}

// 		return false;
// 	});
// }
