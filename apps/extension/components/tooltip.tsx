import { Tooltip } from "@kobalte/core/tooltip";
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
		<Tooltip placement={props.dir ?? "top"}>
			<Tooltip.Trigger>{props.children}</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="origin-(--kb-tooltip-content-transform-origin) animate-content-hide ui-expanded:animate-content-show rounded bg-neutral px-2 py-1 text-neutral-content">
					<Tooltip.Arrow />
					{props.tip}
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip>
	);
}

export function InformativeTooltip(props: Omit<BaseTooltipProps, "children">) {
	return <BaseTooltip {...props}>ⓘ</BaseTooltip>;
}
