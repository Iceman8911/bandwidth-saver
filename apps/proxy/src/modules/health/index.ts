import { ServerAPIEndpoint } from "@bandwidth-saver/shared";
import Elysia from "elysia";

export const healthRoute = new Elysia().get(
	`/${ServerAPIEndpoint.HEALTH}`,
	({ status }) => status(200),
);
