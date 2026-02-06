import { defineWindowMessaging } from "@webext-core/messaging/page";
import { ExtensionData } from "../constants";
import type { MessagingProtocolMap } from "./shared";

export const { onMessage: onWindowMessage, sendMessage: sendWindowMessage } =
	defineWindowMessaging<MessagingProtocolMap>({
		namespace: ExtensionData.NAME as string,
	});
