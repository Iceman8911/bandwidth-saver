import type { UrlSchema } from "@bandwidth-saver/shared";
import type { SettingsScope } from "@/models/context";
import {
	getSiteScopedStatisticsStorageItem,
	statisticsStorageItem,
} from "@/shared/storage";
import { getSumOfValuesInObject } from "@/utils/object";

function convertBytesToMB(bytes: number): number {
	return Math.round((bytes * 100) / (1024 * 1024)) / 100;
}

export function PopupStatistics(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
}) {
	const siteStatisticsStorageItem = () =>
		getSiteScopedStatisticsStorageItem(props.tabUrl);

	const _resolvedGlobalStatistics = convertStorageItemToReadonlySignal(
		statisticsStorageItem,
	);

	const _resolvedSiteStatisticsAccessor = createMemo(() =>
		convertStorageItemToReadonlySignal(siteStatisticsStorageItem()),
	);

	const statistics = createMemo(() =>
		props.scope === "global"
			? _resolvedGlobalStatistics()
			: _resolvedSiteStatisticsAccessor()(),
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
