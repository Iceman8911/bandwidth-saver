import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { StorageAreaSchema } from "@/models/storage";
import { StorageKey } from "@/shared/constants";

const { SITE_SCOPE_SETTINGS_GLOBAL_PREFIX } = StorageKey;

export async function getSiteUrlOriginsFromStorage(): Promise<
	ReadonlyArray<UrlSchema>
> {
	const storageArea = v.parse(
		StorageAreaSchema,
		SITE_SCOPE_SETTINGS_GLOBAL_PREFIX.split(":")[0],
	);

	const storageKeys = await browser.storage[storageArea].getKeys();

	return storageKeys.reduce<UrlSchema[]>((urls, key) => {
		const [_, possibleUrl] = key.split(SITE_SCOPE_SETTINGS_GLOBAL_PREFIX);

		if (possibleUrl) {
			urls.push(v.parse(UrlSchema, possibleUrl));
		}

		return urls;
	}, []);
}
