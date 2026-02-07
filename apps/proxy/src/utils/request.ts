/** Creates a new request based off a given request's url. For consistency, since all the relevant data is in the query string anyway. */
export function normaliseRequestByUrl(req: Request): Request {
	return new Request(req.url);
}
