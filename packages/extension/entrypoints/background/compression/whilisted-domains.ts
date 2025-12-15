import * as v from "valibot";
import DEFAULT_COMPRESSION_WHITELISTED_DOMAIN_JSON from "@/data/compression-whilelisted-domains.json";
import { CompressionWhitelistedDomainSchema } from "@/models/external-data";
import { UPDATE_INTERVAL_IN_MS } from "@/shared/constants";

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

setInterval(async () => {
	whitelistedDomains = await getUpToDateWhitelistedDomains();
}, UPDATE_INTERVAL_IN_MS);

export function getWhitelistedDomains(): ReadonlyArray<string> {
	return whitelistedDomains;
}
