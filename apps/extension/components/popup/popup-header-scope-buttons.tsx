import { Globe, Target } from "lucide-solid";
import { createSelector, type JSXElement, useContext } from "solid-js";
import { BaseButton } from "../button";
import { BaseTooltip } from "../tooltip";
import { PopupContext } from "./context";

type HeaderButtonProps = {
	class: string;
	onClick: () => void;
	tip: JSXElement;
	children: JSXElement;
};

function HeaderButton(props: HeaderButtonProps) {
	return (
		<BaseButton class={props.class} onClick={props.onClick}>
			<BaseTooltip dir="bottom" tip={<span class="text-sm">{props.tip}</span>}>
				<div class="flex items-center gap-2">{props.children}</div>
			</BaseTooltip>
		</BaseButton>
	);
}

export default function PopupHeaderScopeButtons() {
	const [context, setContext] = useContext(PopupContext);

	const isScopeSelected = createSelector(() => context.scope);

	const setScope = (scope: typeof context.scope) => setContext("scope", scope);

	return (
		<header class="flex size-full">
			<HeaderButton
				class={`w-1/2 rounded-r-none ${isScopeSelected("default") ? "btn-primary" : "btn-soft"}`}
				onClick={() => setScope("default")}
				tip={
					<>
						Show <span class="text-info">default</span> settings.
					</>
				}
			>
				<Globe />
				Default
			</HeaderButton>

			<HeaderButton
				class={`w-1/2 rounded-l-none ${isScopeSelected("site") ? "btn-primary" : "btn-soft"}`}
				onClick={() => setScope("site")}
				tip={
					<>
						Show <span class="text-info">site-scoped</span> settings.
					</>
				}
			>
				<Target />
				Site-Scoped
			</HeaderButton>
		</header>
	);
}
