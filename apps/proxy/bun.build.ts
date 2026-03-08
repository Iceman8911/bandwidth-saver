import { rm } from "node:fs/promises";

await rm("./.output", { force: true, recursive: true });

const build = await Bun.build({
	entrypoints: ["./src/index.ts"],
	env: "inline",
	external: ["cloudflare:workers", "@jsquash/webp"],
	outdir: "./.output",
	target: "node",
});

console.log(
	"Build successful. Outputs are:\n\n",
	build.outputs
		.map((output) => `${output.path} => ${output.size} bytes`)
		.join("\n"),
);
