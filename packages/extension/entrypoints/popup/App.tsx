import { createSignal } from "solid-js";
import solidLogo from "@/assets/solid.svg";
import wxtLogo from "/wxt.svg";

function App() {
	const [count, setCount] = createSignal(0);

	return (
		<div class="mx-auto max-w-7xl px-8 text-center">
			<div class="flex justify-center">
				<a href="https://wxt.dev" rel="noopener" target="_blank">
					<img
						alt="WXT logo"
						class="h-24 px-6 transition-[filter] duration-300 will-change-[filter] hover:drop-shadow-[0_0_2em_rgba(84,188,74,0.88)]"
						src={wxtLogo}
					/>
				</a>
				<a href="https://solidjs.com" rel="noopener" target="_blank">
					<img
						alt="Solid logo"
						class="h-24 px-6 transition-[filter] duration-300 will-change-[filter] hover:drop-shadow-[0_0_2em_rgba(97,218,251,0.67)]"
						src={solidLogo}
					/>
				</a>
			</div>
			<h1 class="text-5xl leading-tight">WXT + Solid</h1>
			<div class="p-8">
				<button
					class="btn btn-primary btn-soft"
					onClick={() => setCount((count) => count + 1)}
					type="button"
				>
					count is {count()}
				</button>
				<p>
					Edit <code>popup/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p class="text-[#888]">Click on the WXT and Solid logos to learn more</p>
		</div>
	);
}

export default App;
