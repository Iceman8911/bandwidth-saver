import type { ComponentProps } from "solid-js";

export function BaseButton(props: ComponentProps<"button">) {
	return (
		<button
			{...props}
			class={`btn ${props.class || ""}`}
			type={props.type ?? "button"}
		>
			{props.children}
		</button>
	);
}
