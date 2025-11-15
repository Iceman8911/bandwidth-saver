import { createSignal } from "solid-js";
import solidLogo from "@/assets/solid.svg";
import wxtLogo from "/wxt.svg";

function App() {
	const [count, setCount] = createSignal(0);

	return (
		<div class="max-w-7xl mx-auto px-8 text-center">
			<div class="flex justify-center">
				<a href="https://wxt.dev" target="_blank" rel="noopener">
					<img
						src={wxtLogo}
						class="h-24 px-6 will-change-[filter] transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_rgba(84,188,74,0.88)]"
						alt="WXT logo"
					/>
				</a>
				<a href="https://solidjs.com" target="_blank" rel="noopener">
					<img
						src={solidLogo}
						class="h-24 px-6 will-change-[filter] transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_rgba(97,218,251,0.67)]"
						alt="Solid logo"
					/>
				</a>
			</div>
			<h1 class="text-5xl leading-tight">WXT + Solid</h1>
			<div class="p-8">
				<button
					type="button"
					onClick={() => setCount((count) => count + 1)}
					class="rounded-lg border border-transparent px-5 py-2.5 text-base font-medium font-inherit bg-[#1a1a1a] cursor-pointer transition-colors duration-250 hover:border-[#646cff] focus:outline-4 focus:outline-[-webkit-focus-ring-color] focus-visible:outline-4 focus-visible:outline-[-webkit-focus-ring-color] dark:bg-[#1a1a1a] light:bg-[#f9f9f9]"
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
