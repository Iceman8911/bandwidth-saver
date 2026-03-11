export const CAN_PERFORM_MANUAL_COMPRESSION: boolean = (() => {
	switch (process.env.DEPLOYMENT_PLATFORM) {
		case "cloudflare":
			return false;
		default:
			return true;
	}
})();
