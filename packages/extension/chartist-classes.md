| Element                  | Class Name(s)                          | Common Targets / Notes |
|--------------------------|----------------------------------------|------------------------|
| Root container           | `ct-chart`                             | Outer wrapper (add your own classes here too) |
| Chart type-specific      | `ct-chart-line`, `ct-chart-bar`, `ct-chart-pie`, `ct-chart-donut` | `.ct-chart-line` for line charts, etc. |
| Series groups            | `ct-series` + `ct-series-a`, `ct-series-b`, etc. (a-z) | Per-series styling; add `className: 'my-custom-class'` to series data for extras |
| Lines                    | `ct-line`                              | `.ct-series-a .ct-line { stroke: ... }` |
| Points                   | `ct-point`                             | `.ct-point` for markers |
| Areas                    | `ct-area`                              | Filled areas under lines |
| Bars                     | `ct-bar`                               | Bars in bar charts |
| Pie/Donut slices         | `ct-slice-pie`, `ct-slice-donut`, `ct-slice-donut-solid` | For pie/donut charts |
| Labels (all)             | `ct-label`                             | Generic label |
| Label groups             | `ct-labels`                            | Container for all labels |
| Horizontal labels        | `ct-horizontal.ct-label`               | x-axis labels |
| Vertical labels          | `ct-vertical.ct-label`                 | y-axis labels |
| Grids (lines)            | `ct-grid`                              | Individual grid lines |
| Grid groups              | `ct-grids`                             | Container for grids |
| Grid background          | `ct-grid-background`                   | Optional background fill |
| Grid orientation         | `ct-horizontal`, `ct-vertical`         | `.ct-horizontal.ct-grid` |
| Grid start/end           | `ct-start`, `ct-end`                   | For axis ends |
