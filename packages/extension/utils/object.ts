export function getSumOfValuesInObject(obj: Record<string, unknown>) {
	let sum = 0;
	let key: keyof typeof obj;

	for (key in obj) {
		sum += Number(obj[key]);
	}

	return sum;
}
