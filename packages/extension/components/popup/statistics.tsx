import {
	getDayStartInMillisecondsUTC,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { createMemo } from "solid-js";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_STATISTICS } from "@/models/storage";
import {
	getSiteSpecificStatisticsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";
import { getSumOfValuesInObject } from "@/utils/object";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { convertBytesToAppropriateNotation } from "@/utils/size";
import { DEFAULT_SITE_SPECIFIC_STATISTICS } from "../../models/storage";

export function PopupStatistics(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
}) {
	const day = getDayStartInMillisecondsUTC();

	const siteSpecificStatisticsStorageItem = () =>
		getSiteSpecificStatisticsStorageItem(props.tabUrl);

	const siteSpecificStatisticsSignal = convertStorageItemToReactiveSignal(
		siteSpecificStatisticsStorageItem,
		DEFAULT_SITE_SPECIFIC_STATISTICS,
	);

	const defaultStatisticsSignal = convertStorageItemToReactiveSignal(
		() => statisticsStorageItem,
		DEFAULT_STATISTICS,
	);

	const statistics = createMemo(() =>
		props.scope === "default"
			? defaultStatisticsSignal()
			: siteSpecificStatisticsSignal(),
	);

	const bytesSaved = createMemo(() =>
		getSumOfValuesInObject(statistics()?.bytesSaved.dailyStats[day] ?? {}),
	);
	const bytesUsed = createMemo(() =>
		getSumOfValuesInObject(statistics()?.bytesUsed.dailyStats[day] ?? {}),
	);
	const percentageOfBytesSaved = createMemo(() => {
		const ratio = bytesSaved() / (bytesUsed() + bytesSaved());

		if (Number.isNaN(ratio)) return 0;

		return ratio * 100;
	});

	return (
		<div class="grid grid-cols-2 grid-rows-2 gap-4 text-info">
			<Suspense>
				<div>
					Requests Made today:{" "}
					{getSumOfValuesInObject(
						statistics()?.requestsMade.dailyStats[day] ?? {},
					)}
				</div>

				<div>
					Requests Compressed today:{" "}
					{getSumOfValuesInObject(
						statistics()?.requestsCompressed.dailyStats[day] ?? {},
					)}
				</div>

				<div>
					Data Consumed today:{" "}
					{convertBytesToAppropriateNotation(bytesUsed()).join(" ")}{" "}
				</div>

				<div>Data Saved today: {percentageOfBytesSaved()}% </div>
			</Suspense>
		</div>
	);
}
