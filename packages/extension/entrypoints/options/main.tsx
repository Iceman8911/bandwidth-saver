import { render } from "solid-js/web";

import "@/shared/app.css";
import { HashRouter } from "@solidjs/router";
import OptionsPageLayout from "./layout";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

render(() => <HashRouter root={OptionsPageLayout}></HashRouter>, root);
