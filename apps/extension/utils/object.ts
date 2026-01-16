export function getSumOfValuesInObject(obj: Record<string, unknown>) {
	let sum = 0;
	let key: keyof typeof obj;

	for (key in obj) {
		const value = obj[key];

		if (typeof value === "object" && value) {
			//@ts-expect-error This should be fine enough for my use cases
			sum += getSumOfValuesInObject(value);
		} else {
			sum += Number(obj[key]);
		}
	}

	return sum;
}
