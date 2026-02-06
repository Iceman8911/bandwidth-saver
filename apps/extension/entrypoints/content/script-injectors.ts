import { injectScriptForSpoofingSlowNetwork } from "./injector/spoof-slow-network";
import type { ContentScriptTogglerPayload } from "./shared";

export async function injectMainWorldScriptsViaContentScript(
	payload: ContentScriptTogglerPayload,
) {
	await injectScriptForSpoofingSlowNetwork(payload);
}
