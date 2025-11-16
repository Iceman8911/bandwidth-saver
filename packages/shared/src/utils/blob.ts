import * as v from "valibot";
import { DataUrlSchema } from "../models/shared";

export async function convertBlobToDataUrl(blob: Blob): Promise<DataUrlSchema> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onloadend = () => resolve(v.parse(DataUrlSchema, reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
