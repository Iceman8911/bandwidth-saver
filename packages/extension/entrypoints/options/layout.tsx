import type { JSXElement } from "solid-js";

type OptionsPageLayoutProps = { children?: JSXElement };

export default function OptionsPageLayout(props: OptionsPageLayoutProps) {
	return (
		<div class="h-screen w-screen">
			{/* Top level navigation bar here */}

			{props.children}
		</div>
	);
}
