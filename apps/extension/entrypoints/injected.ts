import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import runSpoofSlowNetworkCode from "./injected/spoof-slow-network";

export default defineUnlistedScript(() => {
	runSpoofSlowNetworkCode();
});
