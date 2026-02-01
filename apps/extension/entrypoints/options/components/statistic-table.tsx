import type { UrlSchema } from "@bandwidth-saver/shared";
import { createAsync } from "@solidjs/router";
import { For } from "solid-js";
import type { DetailedStatisticsSchema } from "@/models/storage";
import { getSiteSpecificStatisticsStorageItem } from "@/shared/storage";
import type { ComponentAcceptingClassesProps } from "@/shared/types";
import { getSumOfValuesInObject } from "@/utils/object";
import { convertBytesToAppropriateNotation } from "@/utils/size";
import { getSiteUrlOrigins } from "@/utils/storage";
import { getUrlSchemaHost } from "@/utils/url";
import { getDailyStatisticsForWeek } from "../shared/utils";

const convertBytesToAppropriateNotationString = (bytes: number) =>
	convertBytesToAppropriateNotation(bytes).join(" ");

type OptionsPageStatisticSummaryTableProps =
	ComponentAcceptingClassesProps & {};

export function OptionsPageStatisticSummaryTable(
	props: OptionsPageStatisticSummaryTableProps,
) {
	const allStatistics = createAsync(
		async () => {
			const statisticValuePromises: Promise<
				[UrlSchema, DetailedStatisticsSchema]
			>[] = [];

			for (const url of await getSiteUrlOrigins()) {
				statisticValuePromises.push(
					getSiteSpecificStatisticsStorageItem(url)
						.getValue()
						.then((stats) => [url, stats] as const),
				);
			}

			return Promise.all(statisticValuePromises);
		},
		{ initialValue: [] },
	);

	return (
		<div class={`overflow-x-auto ${props.class ?? ""}`}>
			<table class="table-zebra table-pin-rows table">
				<thead>
					<tr class="*:text-center">
						<th>Site</th>
						<th>
							<p>Data Used</p>

							<p class="text-xs">(Over a week)</p>
						</th>
						<th>
							<p>Data Saved</p>

							<p class="text-xs">(Over a week)</p>
						</th>
						<th>
							<p>Data Used</p>

							<p class="text-xs">(Total)</p>
						</th>
						<th>
							<p>Data Saved</p>

							<p class="text-xs">(Total)</p>
						</th>
					</tr>
				</thead>
				<tbody>
					<For each={allStatistics.latest}>
						{(val) => {
							return (
								<tr>
									<th class="max-w-40 overflow-auto text-primary">
										{getUrlSchemaHost(val[0])}
									</th>
									<th>
										{convertBytesToAppropriateNotationString(
											getDailyStatisticsForWeek(
												val[1].bytesUsed.dailyStats,
											).reduce((total, { used }) => total + used, 0),
										)}
									</th>
									<th>
										{convertBytesToAppropriateNotationString(
											getDailyStatisticsForWeek(
												val[1].bytesSaved.dailyStats,
											).reduce((total, { used }) => total + used, 0),
										)}
									</th>
									<th>
										{convertBytesToAppropriateNotationString(
											getSumOfValuesInObject(val[1].bytesUsed),
										)}
									</th>
									<th>
										{convertBytesToAppropriateNotationString(
											getSumOfValuesInObject(val[1].bytesSaved),
										)}
									</th>
								</tr>
							);
						}}
					</For>
				</tbody>
			</table>
		</div>
	);
}
