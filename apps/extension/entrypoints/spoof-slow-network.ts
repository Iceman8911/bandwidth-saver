import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import type { GeneralSettingsSchema } from "@/models/storage";
import { MessageType } from "@/shared/constants";
import { onWindowMessage } from "@/shared/messaging/injected";

interface OriginalConnectionData {
	readonly type: GeneralSettingsSchema["spoofSlowNetwork"];
	readonly saveData: boolean;
	readonly downlink: number;
}

interface SpoofSlowNetworkPayload {
	newMode: GeneralSettingsSchema["spoofSlowNetwork"];
	originals: OriginalConnectionData;
	connection: OriginalConnectionData;
}

// TODO: restore the original connection values (since they may change whilist the page is active)
function spoofSlowNetwork({
	connection,
	newMode,
	originals,
}: SpoofSlowNetworkPayload) {
	const shouldUseOriginalValues = newMode === "default";

	const effectiveType = shouldUseOriginalValues ? originals.type : newMode;
	const saveData = shouldUseOriginalValues ? originals.saveData : true;
	const downlink = shouldUseOriginalValues ? originals.downlink : 0.5;

	Object.defineProperty(Object.getPrototypeOf(connection), "effectiveType", {
		get: () => effectiveType,
	});

	Object.defineProperty(Object.getPrototypeOf(connection), "saveData", {
		get: () => saveData,
	});

	// Reduce downlink speed (Mbps) to trick heuristic algorithms
	Object.defineProperty(Object.getPrototypeOf(connection), "downlink", {
		get: () => downlink,
	});
}

export default defineUnlistedScript(() => {
	if (!("connection" in navigator)) return;

	const connection = navigator.connection as OriginalConnectionData;

	const originalConnectionData: OriginalConnectionData = {
		downlink: connection.downlink,
		saveData: connection.saveData,
		type: connection.type,
	};

	onWindowMessage(MessageType.SPOOF_SLOW_NETWORK, ({ data }) => {
		// Forwarded from the content script
		if (data.target === "content") {
			spoofSlowNetwork({
				connection,
				newMode: data.mode,
				originals: originalConnectionData,
			});
		}
	});
});
