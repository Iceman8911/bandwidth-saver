import * as v from "valibot";
import { type Browser, browser } from "wxt/browser";
import DEFAULT_COMPRESSION_WHITELISTED_DOMAIN_JSON from "@/data/compression-whilelisted-domains.json";
import { CompressionWhitelistedDomainSchema } from "@/models/external-data";
import { ALARM_NAME, UPDATE_INTERVAL_IN_MINUTES } from "@/shared/constants";

const REMOTE_COMPRESSION_WHITELISTED_DOMAIN_URL =
	"https://raw.githubusercontent.com/iceman8911/bandwidth-saver/main/packages/extension/data/compression-whilelisted-domains.json";

let whitelistedDomains: ReadonlyArray<string> =
	DEFAULT_COMPRESSION_WHITELISTED_DOMAIN_JSON.domains;

async function getUpToDateWhitelistedDomains(): Promise<ReadonlyArray<string>> {
	try {
		const possibleUpdatedJson = v.parse(
			CompressionWhitelistedDomainSchema,
			await (await fetch(REMOTE_COMPRESSION_WHITELISTED_DOMAIN_URL)).json(),
		);

		if (
			possibleUpdatedJson.version >
			DEFAULT_COMPRESSION_WHITELISTED_DOMAIN_JSON.version
		)
			return possibleUpdatedJson.domains;

		return whitelistedDomains;
	} catch {
		return whitelistedDomains;
	}
}

const alarms = browser.alarms;

alarms.create(ALARM_NAME.WHITELISTED_DOMAIN_SYNC, {
	periodInMinutes: UPDATE_INTERVAL_IN_MINUTES,
});

async function whitelistedDomainsSyncListener(alarm: Browser.alarms.Alarm) {
	if (alarm.name !== ALARM_NAME.WHITELISTED_DOMAIN_SYNC) return;

	whitelistedDomains = await getUpToDateWhitelistedDomains();
}

alarms.onAlarm.removeListener(whitelistedDomainsSyncListener);
alarms.onAlarm.addListener(whitelistedDomainsSyncListener);

export function getWhitelistedDomains(): ReadonlyArray<string> {
	return whitelistedDomains;
}
