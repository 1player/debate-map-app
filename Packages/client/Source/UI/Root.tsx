import chroma from "chroma-js";
import {CreateLinkCommand, GetNodeDisplayText, GetNodeL3, Me, MeID, Polarity} from "dm_common";
import keycode from "keycode";
import {hasHotReloaded} from "Main";
import React from "react";
import * as ReactColor from "react-color";
import {store} from "Store";
import {GetUserBackground} from "Store/db_ext/users/$user";
import {GetPathNodeIDs} from "Store/main/maps/mapViews/$mapView.js";
import {DraggableInfo, DroppableInfo} from "Utils/UI/DNDStructures.js";
import {AddressBarWrapper, ErrorBoundary, LoadURL, Observer, RunInAction} from "web-vcore";
import {Assert, Clone, FromJSON, NN, Vector2} from "web-vcore/nm/js-vextensions.js";
import {makeObservable, observable, runInAction} from "web-vcore/nm/mobx.js";
import {AsyncTrunk} from "web-vcore/nm/mobx-sync.js";
import {DragDropContext as DragDropContext_Beautiful} from "web-vcore/nm/react-beautiful-dnd.js";
import ReactDOM from "web-vcore/nm/react-dom";
import {Button, ColorPickerBox, Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuLayer} from "web-vcore/nm/react-vmenu.js";
import {MessageBoxLayer, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import "../../Source/Utils/Styles/Main.scss"; // keep absolute-ish, since scss file not copied to Source_JS folder
import {graph} from "Utils/LibIntegrations/MobXGraphlink";
import {NavBar} from "../UI/@Shared/NavBar.js";
import {GlobalUI} from "../UI/Global.js";
import {HomeUI} from "../UI/Home.js";
import {MoreUI} from "../UI/More.js";
import {GADDemo} from "./@GAD/GAD.js";
import {HomeUI_GAD} from "./@GAD/Home_GAD.js";
import {NavBar_GAD} from "./@GAD/NavBar_GAD.js";
import {DatabaseUI} from "./Database.js";
import {UserProfileUI} from "./Database/Users/UserProfile.js";
import {DebatesUI} from "./Debates.js";
import {FeedbackUI} from "./Feedback.js";
import {ForumUI} from "./Forum.js";
import {SocialUI} from "./Social.js";
import {StreamPanel} from "./@Shared/NavBar/StreamPanel";
import {NodeDetailBoxesLayer} from "./@Shared/Maps/MapNode/DetailBoxes/NodeDetailBoxesLayer";

ColorPickerBox.Init(ReactColor, chroma);

// export class RootUIWrapper extends BaseComponentPlus({}, { storeReady: false }) {
@Observer
export class RootUIWrapper extends BaseComponent<{}, {}> {
	constructor(props) {
		super(props);
		makeObservable(this);
	}

	/* ComponentWillMount() {
		let startVal = g.storeRehydrated;
		// wrap storeRehydrated property, so we know when it's set (from CreateStore.ts callback)
		(g as Object)._AddGetterSetter('storeRehydrated',
			()=>g.storeRehydrated_,
			val=> {
				g.storeRehydrated_ = val;
				setTimeout(()=>this.mounted && this.Update());//
			});
		// trigger setter right now (in case value is already true)
		g.storeRehydrated = startVal;
	} */
	async ComponentWillMount() {
		// InitStore();

		// temp fix for "Illegal invocation" error in mst-persist
		/* window.localStorage.getItem = window.localStorage.getItem.bind(window.localStorage);
		window.localStorage.setItem = window.localStorage.setItem.bind(window.localStorage);
		persist('some', store, {
			// jsonify: false,
			// whitelist: ['name']
			blacklist: [],
		}).then(() => {
			Log('Loaded state:', getSnapshot(store));
			this.SetState({ storeReady: true });
		}); */

		const trunk = new AsyncTrunk(store, {storage: localStorage});
		if (startURL.GetQueryVar("clearState") == "true") {
			await trunk.clear();
		}

		await trunk.init();
		Log("Loaded state:", Clone(store));

		// start auto-runs, now that store+firelink are created (and store has initialized -- not necessary, but nice)
		//require("../Utils/AutoRuns");

		if (!hasHotReloaded) {
			LoadURL(startURL);
		}
		// UpdateURL(false);
		if (PROD && store.main.analyticsEnabled) {
			Log("Initialized Google Analytics.");
			//ReactGA.initialize("UA-21256330-33", {debug: true});
			//ReactGA.initialize("UA-21256330-33");

			/* let url = VURL.FromLocationObject(State().router).toString(false);
			ReactGA.set({page: url});
			ReactGA.pageview(url || "/"); */
		}

		// wrap with try, since it synchronously triggers rendering -- which breaks loading process below, when rendering fails
		/* try {
			this.SetState({ storeReady: true });
		} finally { */
		RunInAction("RootUIWrapper.ComponentWillMount.notifyStoreReady", ()=>this.storeReady = true);
		//console.log("Marked ready!:", this.storeReady);
	}
	// use observable field for this rather than react state, since setState synchronously triggers rendering -- which breaks loading process above, when rendering fails
	@observable storeReady = false;

	render() {
		// const { storeReady } = this.state;
		const {storeReady} = this;
		//console.log("StoreReady?:", storeReady);
		// if (!g.storeRehydrated) return <div/>;
		if (!storeReady) return null;
		//if (!store.main.userID_apollo_ready) return null; // wait for sign in to complete (so that restricted content loads, even if first content requested)
		//const userIDReady = store.main.userID_apollo_ready; // access mobx field; this way, once user-id is retrieved, RootUI reloads (may need something like this in lower levels too)

		return (
			<DragDropContext_Beautiful onDragEnd={this.OnDragEnd}>
				<RootUI/>
			</DragDropContext_Beautiful>
		);
	}

	OnDragEnd = async result=>{
		const sourceDroppableInfo = FromJSON(result.source.droppableId) as DroppableInfo;
		const sourceIndex = result.source.index as number;
		const targetDroppableInfo = result.destination && FromJSON(result.destination.droppableId) as DroppableInfo;
		const targetIndex = result.destination && result.destination.index as number;
		const draggableInfo = FromJSON(result.draggableId) as DraggableInfo;

		if (targetDroppableInfo == null) {
		} else if (targetDroppableInfo.type == "NodeChildHolder") {
			// we don't support setting the actual order for nodes through dnd right now, so ignore if dragging onto same list
			if (result.destination && result.source.droppableId == result.destination.droppableId) return;

			const {parentPath: newParentPath} = targetDroppableInfo;
			const newParentID = NN(GetPathNodeIDs(newParentPath).Last());
			const newParent = GetNodeL3.NN(newParentID);
			const polarity = targetDroppableInfo.subtype == "up" ? Polarity.supporting : Polarity.opposing;

			const {mapID, nodePath: draggedNodePath} = draggableInfo;
			Assert(draggedNodePath);
			const draggedNodeID = NN(GetPathNodeIDs(draggedNodePath!).Last());
			const draggedNode = GetNodeL3.NN(draggedNodeID);

			const copyCommand = CreateLinkCommand(mapID, draggedNodePath, newParentPath, polarity, true);
			const moveCommand = CreateLinkCommand(mapID, draggedNodePath, newParentPath, polarity, false);
			Assert(copyCommand && moveCommand);

			//if (copyCommand.Validate_Safe()) {
			if (await copyCommand.Validate_Async_Safe()) {
				ShowMessageBox({title: "Cannot copy/move node", message: `Reason: ${copyCommand.ValidateErrorStr}`});
				return;
			}

			const controller = ShowMessageBox({
				title: "Copy/move the dragged node?", okButton: false, cancelButton: false,
				message: `
					Are you sure you want to copy/move the dragged node?

					Destination (new parent): ${GetNodeDisplayText(newParent)}
					Dragged claim/argument: ${GetNodeDisplayText(draggedNode)}
				`.AsMultiline(0),
				extraButtons: ()=><>
					<Button text="Copy" onClick={async()=>{
						controller.Close();
						const {argumentWrapperID} = await copyCommand.RunOnServer();
						if (argumentWrapperID) {
							RunInAction("OnDragEnd.Copy.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
						}
					}}/>
					<Button ml={5} text="Move" enabled={moveCommand.Validate_Safe() == null} title={moveCommand.ValidateErrorStr} onClick={async()=>{
						controller.Close();
						const {argumentWrapperID} = await moveCommand.RunOnServer();
						if (argumentWrapperID) {
							RunInAction("OnDragEnd.Move.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
						}
					}}/>
					<Button ml={5} text="Cancel" onClick={()=>controller.Close()}/>
				</>,
			});
		} /*else if (targetDroppableInfo.type == "TimelineStepList") {
			// if we're moving an item to later in the same list, increment the target-index again (since react-beautiful-dnd pre-applies target-index adjustment, unlike the rest of our code that uses UpdateTimelineStepsOrder/Array.Move())
			if (sourceDroppableInfo.type == targetDroppableInfo.type && sourceIndex < targetIndex) {
				targetIndex++;
			}

			new UpdateTimelineStepOrder({timelineID: sourceDroppableInfo.timelineID, stepID: draggableInfo.stepID, newIndex: targetIndex}).RunOnServer();
		} else if (targetDroppableInfo.type == "TimelineStepNodeRevealList") {
			let path = draggableInfo.nodePath;
			const draggedNode = GetNode(GetNodeID(path));
			const parentNode = GetParentNode(path);
			// if dragged-node is the premise of a single-premise argument, use the argument-node instead (the UI for the argument and claim are combined, but user probably wanted the whole argument dragged)
			if (IsPremiseOfSinglePremiseArgument(draggedNode, parentNode)) {
				path = GetParentPath(path);
			}

			const step = GetTimelineStep(targetDroppableInfo.stepID);
			const newNodeReveal = new NodeReveal();
			newNodeReveal.path = path;
			newNodeReveal.show = true;
			const newNodeReveals = (step.nodeReveals || []).concat(newNodeReveal);
			new UpdateTimelineStep({stepID: step.id, stepUpdates: {nodeReveals: newNodeReveals}}).RunOnServer();
		}*/
	};

	ComponentDidMount() {
		/* if (DEV) {
			setTimeout(() => {
				G({ Perf: React.addons.Perf });
				React.addons.Perf.start();
			}, 100);
		} */

		// $(document).on('mousemove', '*', function(event, ui) {
		document.addEventListener("mousemove", event=>{
			if (event["handledGlobally"]) return;
			event["handledGlobally"] = true;

			g.mousePos = new Vector2(event.pageX, event.pageY);
		});

		document.addEventListener("keydown", event=>{
			if (event.which == keycode.codes.ctrl) g.ctrlDown = true;
			if (event.which == keycode.codes.shift) g.shiftDown = true;
			if (event.which == keycode.codes.alt) g.altDown = true;
		});
		document.addEventListener("keyup", event=>{
			if (event.which == keycode.codes.ctrl) g.ctrlDown = false;
			if (event.which == keycode.codes.shift) g.shiftDown = false;
			if (event.which == keycode.codes.alt) g.altDown = false;
		});

		// if in dev-mode, disable the body`s minHeight attribute
		if (DEV) {
			document.body.style.minHeight = null as any;
		}

		if (GADDemo) {
			const linkEl = <link href="//fonts.googleapis.com/css?family=Cinzel&display=swap" rel="stylesheet"/>;
			ReactDOM.render(ReactDOM.createPortal(linkEl, document.head), document.createElement("div")); // render directly into head

			//const linkEl2 = <link rel="stylesheet" media="screen" href="//fontlibrary.org/face/bebasneueregular" type="text/css"/>;
			//const linkEl2 = <link rel="stylesheet" media="screen" href="//cdn.jsdelivr.net/npm/@typopro/web-bebas-neue@3.7.5/TypoPRO-BebasNeue-Bold.css" type="text/css"/>;
			//const linkEl2 = <link rel="stylesheet" media="screen" href="//cdn.jsdelivr.net/npm/@typopro/web-bebas-neue@3.7.5/TypoPRO-BebasNeue-Regular.css" type="text/css"/>;
			//const linkEl2 = <link rel="stylesheet" media="screen" href="//cdn.jsdelivr.net/npm/@typopro/web-bebas-neue@3.7.5/TypoPRO-BebasNeue.css" type="text/css"/>;
			//const linkEl2 = <link rel="stylesheet" media="screen" href="//cdn.jsdelivr.net/npm/@typopro/web-bebas-neue@3.7.5/TypoPRO-BebasNeue-Thin.css" type="text/css"/>;
			const linkEl2 = <link href="//fonts.googleapis.com/css2?family=Quicksand:wght@500&display=swap" rel="stylesheet"/>;
			ReactDOM.render(ReactDOM.createPortal(linkEl2, document.head), document.createElement("div")); // render directly into head
		}
	}
}

declare global {
	var mousePos: Vector2;
	var ctrlDown: boolean;
	var shiftDown: boolean;
	var altDown: boolean;
}
g.mousePos = new Vector2(undefined, undefined);
G({ctrlDown: false, shiftDown: false, altDown: false});

@Observer
class RootUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		// const currentPage = State(a => a.main.page);
		const {page} = store.main;
		const background = GetUserBackground(MeID());
		return (
			<Column className='background'/* 'unselectable' */ style={{height: "100%"}}>
				{/* <div className='background' style={{
					position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: .5,
				}}/> */}
				<style>{`
				.background {
					background-color: ${background.color};
					background-image: url(${background.url_1920 || background.url_3840 || background.url_max});
					background-position: ${background.position || "center center"};
					background-size: ${background.size || "cover"};
				}
				@media (min-width: 1921px) {
					.background {
						background-image: url(${background.url_3840 || background.url_max});
					}
				}
				@media (min-width: 3841px) {
					.background {
						background-image: url(${background.url_max});
					}
				}
				`}</style>
				<ErrorBoundary>
					<AddressBarWrapper/>
					<OverlayUI/>
				</ErrorBoundary>
				<ErrorBoundary>
					{!GADDemo && <NavBar/>}
					{GADDemo && <NavBar_GAD/>}
				</ErrorBoundary>
				{/* <InfoButton_TooltipWrapper/> */}
				<ErrorBoundary
					key={page} // use key, so that error-message clears when user changes pages
				>
					<main style={{position: "relative", flex: 1, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "flex-start"}}>
						{/*{page == "stream" && <StreamPanel/>}
						<Route path='/chat'><ChatUI/></Route>
						<Route path='/reputation'><ReputationUI/></Route>*/}

						{page == "database" && <DatabaseUI/>}
						{page == "forum" && <ForumUI/>}
						{page == "feedback" && <FeedbackUI/>}
						{page == "more" && <MoreUI/>}
						{page == "home" && !GADDemo && <HomeUI/>}
						{page == "home" && GADDemo && <HomeUI_GAD/>}
						{page == "social" && <SocialUI/>}
						{page == "debates" && <DebatesUI/>}
						{page == "global" && <GlobalUI/>}

						{/*<Route path='/search'><SearchUI/></Route>
						<Route path='/guide'><GuideUI/></Route>*/}
						{page == "profile" && <UserProfileUI profileUser={Me()}/>}
					</main>
				</ErrorBoundary>
			</Column>
		);
	}
}

class OverlayUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<div style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden"}}>
				<NodeDetailBoxesLayer/>
				<MessageBoxLayer/>
				<VMenuLayer/>
			</div>
		);
	}
}