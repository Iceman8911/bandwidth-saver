import { NavigationMenu } from "@kobalte/core/navigation-menu";
import { A } from "@solidjs/router";
import type { JSXElement } from "solid-js";
import Logo from "@/assets/icon.png";
import { OptionsPageRoute } from "../shared/constants";

function ExtensionLogoAndName() {
	return (
		<div class="flex items-center justify-center gap-4">
			<div class="avatar">
				<div class="size-10 rounded">
					<img alt="Bandwidth Saver and Monitor Logo" src={Logo} />
				</div>
			</div>

			<h1 class="font-bold text-base">Bandwidth Saver And Monitor</h1>
		</div>
	);
}

type NavigationBarLinkProps = {
	href: `/${string}`;
	children: JSXElement;
};

function NavigationBarLink(props: NavigationBarLinkProps) {
	return (
		<NavigationMenu.Trigger
			activeClass="menu-active"
			as={A}
			end={true}
			href={props.href}
		>
			{props.children}
		</NavigationMenu.Trigger>
	);
}

function NavigationBarLinks() {
	return (
		<NavigationMenu
			class="navbar menu menu-horizontal *:text-base"
			orientation="horizontal"
		>
			<NavigationMenu.Menu>
				<NavigationBarLink href={OptionsPageRoute.OVERVIEW}>
					Overview
				</NavigationBarLink>

				<NavigationBarLink href={OptionsPageRoute.COMPRESSION}>
					Compression
				</NavigationBarLink>

				<NavigationBarLink href={OptionsPageRoute.BLOCK}>
					Blocking
				</NavigationBarLink>

				<NavigationBarLink href={OptionsPageRoute.PROXY}>
					Proxy
				</NavigationBarLink>

				<NavigationBarLink href={OptionsPageRoute.ABOUT}>
					About
				</NavigationBarLink>
			</NavigationMenu.Menu>
		</NavigationMenu>
	);
}

export default function OptionsPageNavigationBar() {
	return (
		<div class="flex h-16 items-center justify-around bg-base-300 p-4">
			<ExtensionLogoAndName />

			<NavigationBarLinks />
		</div>
	);
}
