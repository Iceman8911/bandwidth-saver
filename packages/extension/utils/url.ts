import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";

export function getUrlSchemaOrigin(url: UrlSchema): UrlSchema {
	return v.parse(UrlSchema, new URL(url).origin);
}
