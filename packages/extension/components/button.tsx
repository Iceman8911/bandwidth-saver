import { Button } from "@kobalte/core/button";
import type { ComponentProps } from "solid-js";

export function BaseButton(props: ComponentProps<"button">) {
	return (
		<Button
			{...props}
			class={`btn ${props.class || ""}`}
			type={props.type ?? "button"}
		>
			{props.children}
		</Button>
	);
}
