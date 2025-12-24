import { JSXElement, onMount } from 'solid-js'
import { Chart, Title, Tooltip, Legend, Colors } from 'chart.js'
import { Line, Pie } from 'solid-chartjs'
import { ComponentAcceptingClassesProps } from '@/shared/types'
import { DEFAULT_SINGLE_ASSET_STATISTICS } from '@/models/storage'

type BaseCardProps = {
  class?:string|undefined, children:JSXElement, title: string
}

function BaseCard(props: BaseCardProps){
  return <div class={`card card-border bg-base-200 ${props.class}`}>
    <div class="card-body">
      <h2 class="card-title">{props.title}</h2>

      <div class="card-body">
        {props.children}
      </div>
  </div>
          </div>
}

export type OptionsPageBandwidthUsageOverTimeProps = ComponentAcceptingClassesProps & {
  /** Only 28 ~ 31 entries are needed */
  usage: ReadonlyArray<{date:Date,
    /** In bytes */
    dataUsed:number}>
}

export function OptionsPageBandwidthUsageOverTime(props:OptionsPageBandwidthUsageOverTimeProps){
  onMount(() => {
          Chart.register(Title, Tooltip, Legend, Colors)
      })


  return <BaseCard title='Bandwidth Usage Over Time'  class={props.class} ><Line data={{labels: props.usage.map(usage=>usage.date.toDateString()),datasets:[]}} options={{}} /></BaseCard>
}

type OptionsPageBandwidthUsageBreakdownProps = ComponentAcceptingClassesProps & {
  usage: Readonly<typeof DEFAULT_SINGLE_ASSET_STATISTICS>
}

export function OptionsPageBandwidthUsageBreakdown(props:OptionsPageBandwidthUsageBreakdownProps){
  return <BaseCard title='Bandwidth Usage Breakdown' class={props.class} ><Pie /></BaseCard>
}
