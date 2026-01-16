const SIZE_DESCRIPTORS = ["KB", "MB", "GB"] as const;

const SIZE_CONVERTER = 1024;

/** Convrts bytes to their kb, mb, gb notations */
export function convertBytesToAppropriateNotation(
	bytes: number,
	sizeDescriptorIndex = 0,
): Readonly<[number, (typeof SIZE_DESCRIPTORS)[number]]> {
	if (!SIZE_DESCRIPTORS[sizeDescriptorIndex]) {
		return [
			bytes * SIZE_CONVERTER,
			// biome-ignore lint/style/noNonNullAssertion: <Typescript isn't smart enough :p>
			SIZE_DESCRIPTORS[SIZE_DESCRIPTORS.length - 1]!,
		];
	}

	const convertedBytes = bytes / SIZE_CONVERTER;

	if (convertedBytes >= 1024) {
		return convertBytesToAppropriateNotation(
			convertedBytes,
			sizeDescriptorIndex + 1,
		);
	}

	return [
		Math.round(convertedBytes * 100) / 100,
		SIZE_DESCRIPTORS[sizeDescriptorIndex],
	];
}

export function convertBytesToMB(bytes: number): number {
	return Math.round((bytes * 100) / (SIZE_CONVERTER * SIZE_CONVERTER)) / 100;
}
