export function convertBytesToMB(bytes: number): number {
	return Math.round((bytes * 100) / (1024 * 1024)) / 100;
}
