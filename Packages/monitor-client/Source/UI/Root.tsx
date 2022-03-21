import React from "react";
import * as ReactColor from "react-color";
import ReactDOM from "react-dom";
import {store} from "Store";
import {AddressBarWrapper, Chroma, ErrorBoundary, LoadURL, Observer, RunInAction} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {Clone} from "web-vcore/nm/js-vextensions";
import {AsyncTrunk} from "web-vcore/nm/mobx-sync";
import {makeObservable, observable} from "web-vcore/nm/mobx.js";
import {ColorPickerBox, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuLayer} from "web-vcore/nm/react-vmenu.js";
import {MessageBoxLayer} from "web-vcore/nm/react-vmessagebox.js";
import "../../Source/Utils/Styles/Main.scss"; // keep absolute-ish, since scss file not copied to Source_JS folder
import {SideBar} from "./@Shared/SideBar";
import {DBUI} from "./DB";
import {HomeUI} from "./Home";

ColorPickerBox.Init(ReactColor, chroma);

// export class RootUIWrapper extends BaseComponentPlus({}, { storeReady: false }) {
@Observer
export class RootUIWrapper extends BaseComponent<{}, {}> {
	constructor(props) {
		super(props);
		makeObservable(this);
	}

	async ComponentWillMount() {
		const trunk = new AsyncTrunk(store, {storage: localStorage});
		if (startURL.GetQueryVar("clearState") == "true") {
			await trunk.clear();
		}

		await trunk.init();
		console.log("Loaded state:", Clone(store));

		// start auto-runs, now that store+firelink are created (and store has initialized -- not necessary, but nice)
		//require("../Utils/AutoRuns");

		//if (!hasHotReloaded) {
		LoadURL(startURL);

		RunInAction("RootUIWrapper.ComponentWillMount.notifyStoreReady", ()=>this.storeReady = true);
	}
	// use observable field for this rather than react state, since setState synchronously triggers rendering -- which breaks loading process above, when rendering fails
	@observable storeReady = false;

	render() {
		const {storeReady} = this;
		if (!storeReady) return null;

		return (
			<RootUI />
		);
	}

	ComponentDidMount() {
		// if in dev-mode, disable the body`s minHeight attribute
		if (DEV) {
			document.body.style.minHeight = null as any;
		}

		// add Quicksand font
		const linkEl = <link href="//fonts.googleapis.com/css2?family=Quicksand:wght@500&display=swap" rel="stylesheet" />;
		ReactDOM.render(ReactDOM.createPortal(linkEl, document.head), document.createElement("div")); // render directly into head
	}
}

/*declare global {
	var mousePos: Vector2;
	var ctrlDown: boolean;
	var shiftDown: boolean;
	var altDown: boolean;
}
g.mousePos = new Vector2(undefined, undefined);
G({ctrlDown: false, shiftDown: false, altDown: false});*/

@Observer
class RootUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		// const currentPage = State(a => a.main.page);
		const {page} = store.main;

		return (
			<Row className='background'/* 'unselectable' */ style={{height: "100%"}}>
				<RootStyles/>
				<ErrorBoundary>
					<AddressBarWrapper />
					<OverlayUI />
				</ErrorBoundary>
				<ErrorBoundary>
					<SideBar/>
				</ErrorBoundary>
				<ErrorBoundary
					key={page} // use key, so that error-message clears when user changes pages
				>
					<main style={{position: "relative", flex: 1, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "flex-start"}}>
						{page == "home" && <HomeUI/>}
						{page == "db" && <DBUI/>}
					</main>
				</ErrorBoundary>
			</Row>
		);
	}
}

export class RootStyles extends BaseComponent<{}, {}> {
	render() {
		return (
			<style>{`
			html, body:not(.neverMatch) {
				font-family: 'Quicksand', sans-serif;
				color: ${
					//Chroma("rgba(255,255,255,.7)").css()
					Chroma("rgb(50,50,50)").css()
				};
			}
			`}</style>
		);
	}
}

class OverlayUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<div className="clickThrough" style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden"}}>
				<MessageBoxLayer/>
				<VMenuLayer/>
			</div>
		);
	}
}