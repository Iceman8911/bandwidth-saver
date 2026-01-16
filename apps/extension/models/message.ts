import * as v from "valibot";
import { MessageType } from "@/shared/constants";
import { UrlSchema } from "../../shared/src/models/shared";

const ValidateCompressedUrlMessageSchema = v.pipe(
	v.object({
		type: v.literal(MessageType.VALIDATE_URL),
		/** The url to the compressed remote  */
		url: UrlSchema,
	}),
	v.readonly(),
);

export const RuntimeMessageSchema = v.variant("type", [
	ValidateCompressedUrlMessageSchema,
]);
export type RuntimeMessageSchema = v.InferOutput<typeof RuntimeMessageSchema>;
