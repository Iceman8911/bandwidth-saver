import * as v from "valibot";
import { Base64Schema } from "@/models/shared";

export async function convertBlobToBase64(blob: Blob): Promise<Base64Schema> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onloadend = () => resolve(v.parse(Base64Schema, reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
