import type { JSXElement } from "solid-js";
import OptionsPageNavigationBar from "./components/nav-bar";

type OptionsPageLayoutProps = { children?: JSXElement };

export default function OptionsPageLayout(props: OptionsPageLayoutProps) {
	return (
		<div class="flex h-screen w-screen flex-col">
			<OptionsPageNavigationBar />

			<div class="grow overflow-auto p-4 contain-strict">{props.children}</div>
		</div>
	);
}
