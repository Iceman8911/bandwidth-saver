import type { JSXElement } from "solid-js";
import OptionsPageNavigationBar from "./components/nav-bar";

type OptionsPageLayoutProps = { children?: JSXElement };

export default function OptionsPageLayout(props: OptionsPageLayoutProps) {
	return (
		<div class="h-screen w-screen">
			<OptionsPageNavigationBar />

			<div class="size-full p-4">{props.children}</div>
		</div>
	);
}
