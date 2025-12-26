import type { UrlSchema } from "@bandwidth-saver/shared";
import { createMemo } from "solid-js";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_STATISTICS } from "@/models/storage";
import {
	getSiteSpecificStatisticsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";
import { getSumOfValuesInObject } from "@/utils/object";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { convertBytesToMB } from "@/utils/size";
import { DEFAULT_SITE_SPECIFIC_STATISTICS } from "../../models/storage";

export function PopupStatistics(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
}) {
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
		getSumOfValuesInObject(statistics()?.bytesSaved ?? {}),
	);
	const bytesUsed = createMemo(() =>
		getSumOfValuesInObject(statistics()?.bytesUsed ?? {}),
	);
	const percentageOfBytesSaved = createMemo(() => {
		const ratio = bytesSaved() / (bytesUsed() + bytesSaved());

		if (Number.isNaN(ratio)) return 0;

		return convertBytesToMB(ratio);
	});

	return (
		<div class="grid grid-cols-2 grid-rows-2 gap-4 text-info">
			<Suspense>
				<div>
					Requests Processed:{" "}
					{getSumOfValuesInObject(statistics()?.requestsCompressed ?? {})}
				</div>

				<div>
					Requests Blocked:{" "}
					{getSumOfValuesInObject(statistics()?.requestsBlocked ?? {})}
				</div>

				<div>Data Consumed: {convertBytesToMB(bytesUsed())} MB</div>

				<div>Data Saved: {percentageOfBytesSaved()}% </div>
			</Suspense>
		</div>
	);
}
