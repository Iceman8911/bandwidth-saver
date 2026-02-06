import { defineExtensionMessaging } from "@webext-core/messaging";
import type { MessagingProtocolMap } from "./shared";

export const {
	onMessage: onExtensionMessage,
	sendMessage: sendExtensionMessage,
} = defineExtensionMessaging<MessagingProtocolMap>();
