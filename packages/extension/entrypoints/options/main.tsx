import { render } from "solid-js/web";
import "@/shared/app.css";
import { HashRouter, Route } from "@solidjs/router";
import OptionsPageLayout from "./layout";
import OptionsPageAboutRoute from "./routes/about";
import OptionsPageBlockRoute from "./routes/block";
import OptionsPageCompressionRoute from "./routes/compression";
import OptionsPageOverviewRoute from "./routes/overview";
import OptionsPageProxyRoute from "./routes/proxy";
import { OptionsPageRoute } from "./shared/constants";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

render(
	() => (
		<HashRouter root={OptionsPageLayout}>
			<Route
				component={OptionsPageOverviewRoute}
				path={OptionsPageRoute.OVERVIEW}
			/>
			<Route
				component={OptionsPageCompressionRoute}
				path={OptionsPageRoute.COMPRESSION}
			/>
			<Route component={OptionsPageBlockRoute} path={OptionsPageRoute.BLOCK} />
			<Route component={OptionsPageProxyRoute} path={OptionsPageRoute.PROXY} />
			<Route component={OptionsPageAboutRoute} path={OptionsPageRoute.ABOUT} />
		</HashRouter>
	),
	root,
);
