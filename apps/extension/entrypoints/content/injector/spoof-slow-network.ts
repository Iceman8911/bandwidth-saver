import { injectScript } from "wxt/utils/inject-script";
import { MessageType } from "@/shared/constants";
import {
	onExtensionMessage,
	sendExtensionMessage,
} from "@/shared/messaging/extension";
import { sendWindowMessage } from "@/shared/messaging/injected";
import type { ContentScriptTogglerPayload } from "../shared";

export async function injectScriptForSpoofingSlowNetwork({
	origin,
}: ContentScriptTogglerPayload) {
	await injectScript("/spoof-slow-network.js", {
		keepInDom: true,
	});

	onExtensionMessage(MessageType.SPOOF_SLOW_NETWORK, ({ data }) =>
		sendWindowMessage(MessageType.SPOOF_SLOW_NETWORK, data),
	);

	await sendExtensionMessage(MessageType.SPOOF_SLOW_NETWORK, {
		origin,
		target: "background",
	});
}
