import type { JSXElement } from "solid-js";
import OptionsPageNavigationBar from "./components/nav-bar";

type OptionsPageLayoutProps = { children?: JSXElement };

export default function OptionsPageLayout(props: OptionsPageLayoutProps) {
	return (
		<div class="h-screen w-screen">
			<OptionsPageNavigationBar />

			{props.children}
		</div>
	);
}
