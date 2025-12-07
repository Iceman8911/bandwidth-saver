import type { JSXElement } from "solid-js";

const TOOLTIP_DIRECTION_MAPPING = {
	bottom: "tooltip-bottom",
	left: "tooltip-left",
	right: "tooltip-right",
	top: "tooltip-top",
} as const;

type BaseTooltipProps = {
	/** The content to display in the tooltip */
	tip: JSXElement;
	/** What the tooltip will wrap around */
	children: JSXElement;
	/** The direction of the tooltip
	 *
	 * @default "top"
	 */
	dir?: keyof typeof TOOLTIP_DIRECTION_MAPPING;
};

export function BaseTooltip(props: BaseTooltipProps) {
	return (
		<div class={`tooltip ${TOOLTIP_DIRECTION_MAPPING[props.dir ?? "top"]}`}>
			<div class="tooltip-content">{props.tip}</div>

			{props.children}
		</div>
	);
}

export function InformativeTooltip(props: Omit<BaseTooltipProps, "children">) {
	return <BaseTooltip {...props}>ⓘ</BaseTooltip>;
}
