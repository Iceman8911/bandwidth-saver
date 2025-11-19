import { JSXElement } from "solid-js"

const TOOLTIP_DIRECTION_MAPPING = {
  left: "tooltip-left",
  right: "tooltip-right",
  bottom: "tooltip-bottom",
  top: "tooltip-top"
} as const


export function Tooltip(props:{
  /** The content to display in the tooltip */
  tip:JSXElement,
  /** What the tooltip will wrap around */
  children:JSXElement
  /** The direction of the tooltip
   *
   * @default "top"
   */
  dir?: keyof typeof TOOLTIP_DIRECTION_MAPPING
}){

  return <div class={`tooltip ${TOOLTIP_DIRECTION_MAPPING[props.dir ?? "top"]}`}>
    <div class="tooltip-content">
      {props.tip}
    </div>

    {props.children}
  </div>
}
