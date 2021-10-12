import {AccessLevel, ChangeType, GetNodeChildrenL3, GetParentNodeL3, GetParentPath, ChildGroup, IsMultiPremiseArgument, IsNodeL2, IsNodeL3, IsPremiseOfSinglePremiseArgument, IsRootNode, IsSinglePremiseArgument, Map, MapNode, MapNodeL3, MapNodeType, MeID, Polarity, GetNodeForm, ClaimForm} from "dm_common";
import React from "react";
import {GetPathsToChangedDescendantNodes_WithChangeTypes} from "Store/db_ext/mapNodeEdits.js";
import {GetNodeChildrenL3_Advanced, GetNodeColor} from "Store/db_ext/nodes";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {NodeChildHolder} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolder.js";
import {NodeChildHolderBox} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolderBox.js";
import {logTypes} from "Utils/General/Logging.js";
import {EB_ShowError, EB_StoreError, ES, GetSize, GetSize_Method, MaybeLog, Observer, ShouldLog, WaitXThenRun_Deduped} from "web-vcore";
import {Assert, AssertWarn, CreateStringEnum, E, EA, ea, emptyArray_forLoading, IsNaN, nl, ObjectCE, Vector2, VRect, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetInnerComp, RenderSource, ShallowEquals, UseCallback, UseEffect, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {ChildBoxInfo, ChildConnectorBackground} from "./ChildConnectorBackground.js";
import {ExpandableBox} from "./ExpandableBox.js";
import {NodeChangesMarker} from "./NodeUI/NodeChangesMarker.js";
import {NodeChildCountMarker} from "./NodeUI/NodeChildCountMarker.js";
import {GetMeasurementInfoForNode} from "./NodeUI/NodeMeasurer.js";
import {NodeUI_Inner} from "./NodeUI_Inner.js";
import {NodeUI_Menu_Stub} from "./NodeUI_Menu.js";

// @ExpensiveComponent
@WarnOfTransientObjectProps
@Observer
export class NodeUI extends BaseComponentPlus(
	{} as {
		indexInNodeList: number, map: Map, node: MapNodeL3, path: string, style?,
		leftMarginForLines?: number|n,
		widthOverride?: number|n, // this is set by parent NodeChildHolder, once it determines the width that all children should use
		onHeightOrPosChange?: ()=>void
		ref_innerUI?: (c: NodeUI_Inner|n)=>any,
	},
	{
		expectedBoxWidth: 0, expectedBoxHeight: 0, dividePoint: null as number|n, selfHeight: 0,
		lastChildBoxOffsets: null as {[key: string]: Vector2}|n,
	},
) {
	/* static renderCount = 0;
	static lastRenderTime = -1; */
	static ValidateProps(props) {
		const {node} = props;
		Assert(IsNodeL2(node), "Node supplied to NodeUI is not level-2!");
		Assert(IsNodeL3(node), "Node supplied to NodeUI is not level-3!");
	}
	static ValidateState(state) {
		const {dividePoint, selfHeight} = state;
		Assert(!IsNaN(dividePoint) && !IsNaN(selfHeight));
	}

	nodeUI: HTMLDivElement|n;
	innerUI: NodeUI_Inner|n;
	rightColumn: Column|n;
	childBoxes: {[key: string]: NodeChildHolderBox|n} = {};
	nodeChildHolder_direct: NodeChildHolder|n;
	componentDidCatch(message, info) { EB_StoreError(this as any, message, info); }
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {indexInNodeList, map, node, path, widthOverride, style, onHeightOrPosChange, ref_innerUI, children} = this.props;
		const {expectedBoxWidth, expectedBoxHeight, dividePoint, selfHeight, lastChildBoxOffsets} = this.state;

		performance.mark("NodeUI_1");
		//path = path || node.id.toString();

		const nodeChildren = GetNodeChildrenL3(node.id, path);
		// let nodeChildrenToShow: MapNodeL3[] = nodeChildren.Any(a => a == null) ? emptyArray_forLoading : nodeChildren; // only pass nodeChildren when all are loaded
		const nodeChildrenToShow = GetNodeChildrenL3_Advanced(node.id, path, map.id, true, undefined, true, true);

		/* let subnodes = GetSubnodesInEnabledLayersEnhanced(MeID(), map, node.id);
		subnodes = subnodes.Any(a => a == null) ? emptyArray : subnodes; // only pass subnodes when all are loaded */

		//const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
		const sinceTime = 0;
		const pathsToChangedDescendantNodes_withChangeTypes = GetPathsToChangedDescendantNodes_WithChangeTypes(map.id, sinceTime, path);
		const addedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.add).length;
		const editedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.edit).length;

		const parent = GetParentNodeL3(path);
		const parentPath = GetParentPath(path);
		// const parentNodeView = GetNodeView(map.id, parentPath) || new MapNodeView();
		// const parentNodeView = Watch(() => GetNodeView(map.id, parentPath) || new MapNodeView(), [map.id, parentPath]);
		const parentNodeView = GetNodeView(map.id, parentPath);

		const isSinglePremiseArgument = IsSinglePremiseArgument(node);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		const argumentNode = node.type == MapNodeType.argument ? node : isPremiseOfSinglePremiseArg ? parent : null;
		const nodeForm = GetNodeForm(node, path);

		/* const initialChildLimit = State(a => a.main.initialChildLimit);
		const form = GetNodeForm(node, GetParentNodeL2(path)); */
		/* const nodeView_early = GetNodeView(map.id, path) || new MapNodeView();
		const nodeView = CachedTransform('nodeView_transform1', [map.id, path], nodeView_early.ExcludeKeys('focused', 'viewOffset', 'children'), () => nodeView_early); */
		// const nodeView = Watch(() => GetNodeView(map.id, path) || new MapNodeView(), [map.id, path]);
		const nodeView = GetNodeView(map.id, path);
		const boxExpanded = (isPremiseOfSinglePremiseArg ? parentNodeView?.expanded : nodeView?.expanded) ?? false;

		/*const playingTimeline = GetPlayingTimeline(map.id);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(map.id);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map.id);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map.id, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map.id);*/

		performance.mark("NodeUI_2");
		if (ShouldLog(a=>a.nodeRenders)) {
			if (logTypes.nodeRenders_for) {
				if (logTypes.nodeRenders_for == node.id) {
					Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges(), "\nStateChanged:", this.GetStateChanges());
				}
			} else {
				Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges().map(a=>a.key), "\nStateChanged:", this.GetStateChanges().map(a=>a.key));
			}
		}
		// NodeUI.renderCount++;
		// NodeUI.lastRenderTime = Date.now();

		// if single-premise arg, combine arg and premise into one box, by rendering premise box directly (it will add-in this argument's child relevance-arguments)
		if (isSinglePremiseArgument) {
			const premises = nodeChildren.filter(a=>a && a.type == MapNodeType.claim);
			if (premises.length) {
				AssertWarn(premises.length == 1, `Single-premise argument #${node.id} has more than one premise! (${premises.map(a=>a.id).join(",")})`);
				const premise = premises[0];

				// if has child-limit bar, correct its path
				const firstChildComp = this.FlattenedChildren[0] as any;
				if (firstChildComp && firstChildComp.props.path == path) {
					firstChildComp.props.path = `${firstChildComp.props.path}/${premise.id}`;
				}

				return (
					<NodeUI ref={c=>this.proxyDisplayedNodeUI = c} {...this.props} key={premise.id} map={map} node={premise} path={`${path}/${premise.id}`}>
						{children}
					</NodeUI>
				);
			}

			// if there are not-yet-loaded children that *might* be the premise, wait for them to finish loading before showing the "no premise" message
			if (nodeChildren.Any(a=>a == null)) {
				//return <div title={`Loading premise "${node.children.VKeys()[0]}"...`}>...</div>;
				return <div/>;
			}

			// placeholder, so user can add the base-claim
			// const backgroundColor = GetNodeColor(node).desaturate(0.5).alpha(0.8);
			return (
				<Column>
					<Row /* mt={indexInNodeList === 0 ? 0 : 5} */ className="cursorSet"
						style={{
							padding: 5, borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)",
							background: /* backgroundColor.css() */ "rgba(0, 0, 0, 0.7)",
							margin: "5px 0", // emulate usual internal NodeUI
							fontSize: 14, // emulate usual internal NodeUI_Inner
						}}
					>
						<span style={{opacity: 0.5}}>(single-premise arg lacks base-claim; right-click to add)</span>
						{/* <NodeUI_Menu_Helper {...{map, node}}/> */}
						<NodeUI_Menu_Stub {...{map, node, path}} childGroup={ChildGroup.generic}/>
					</Row>
				</Column>
			);
		}

		const separateChildren = node.type == MapNodeType.claim;

		const parentChildren = parent && parentPath ? GetNodeChildrenL3(parent.id, parentPath) : EA<MapNodeL3>();
		let relevanceArguments: MapNodeL3[] = [];
		if (isPremiseOfSinglePremiseArg) {
			const argument = parent;
			const argumentPath = SlicePath(path, 1);
			relevanceArguments = parentChildren.filter(a=>a && a.type == MapNodeType.argument);
			// Assert(!relevanceArguments.Any(a=>a.type == MapNodeType.claim), "Single-premise argument has more than one premise!");
			/*if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
				// relevanceArguments = relevanceArguments.filter(child => playingTimelineVisibleNodes.Contains(`${argumentPath}/${child.id}`));
				// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
				relevanceArguments = relevanceArguments.filter(child=>playingTimelineVisibleNodes.Any(a=>a.startsWith(`${argumentPath}/${child.id}`)));
			}*/
		}

		const {width} = this.GetMeasurementInfo();

		const showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
		const limitBar_above = argumentNode && argumentNode.displayPolarity == Polarity.supporting;
		const limitBarPos = showLimitBar ? (limitBar_above ? LimitBarPos.above : LimitBarPos.below) : LimitBarPos.none;

		//this.childBoxes = {};
		// only clear this.childBoxes when first mounting // actually, no need to clear; the ref-funcs already clear their own entries
		/*UseEffect(()=>{
			console.log("Clearing childBoxes. @old:", this.childBoxes);
			this.childBoxes = {};
		}, []);*/
		const nodeChildHolderBox_truth = (node.type == MapNodeType.claim && nodeForm != ClaimForm.question) && //boxExpanded &&
			<NodeChildHolderBox {...{map, node, path}} group={ChildGroup.truth}
				ref={UseCallback(c=>this.childBoxes["truth"] = c, [])}
				ref_expandableBox={UseCallback(c=>WaitXThenRun_Deduped(this, "UpdateChildBoxOffsets", 0, ()=>this.UpdateChildBoxOffsets()), [])}
				widthOfNode={widthOverride || width} heightOfNode={selfHeight}
				nodeChildren={nodeChildren} nodeChildrenToShow={nodeChildrenToShow}
				onHeightOrDividePointChange={UseCallback(dividePoint=>this.CheckForChanges(), [])}/>;
		const nodeChildHolderBox_relevance = (node.type == MapNodeType.argument || isPremiseOfSinglePremiseArg) && //boxExpanded &&
			<NodeChildHolderBox {...{map, node: parent!, path: parentPath!}} group={ChildGroup.relevance}
				ref={UseCallback(c=>this.childBoxes["relevance"] = c, [])}
				ref_expandableBox={UseCallback(c=>WaitXThenRun_Deduped(this, "UpdateChildBoxOffsets", 0, ()=>this.UpdateChildBoxOffsets()), [])}
				widthOfNode={widthOverride || width} heightOfNode={selfHeight}
				nodeChildren={parentChildren} nodeChildrenToShow={relevanceArguments!}
				onHeightOrDividePointChange={UseCallback(dividePoint=>this.CheckForChanges(), [])}/>;
		const usingBox = !!nodeChildHolderBox_truth || !!nodeChildHolderBox_relevance;
		let childConnectorBackground: JSX.Element|n;
		if (usingBox /*&& linkSpawnPoint > 0*/ && Object.entries(lastChildBoxOffsets ?? {}).length) {
			childConnectorBackground = (
				<ChildConnectorBackground node={node} path={path}
					linkSpawnPoint={new Vector2(0, selfHeight / 2)} straightLines={false}
					shouldUpdate={true}
					childBoxInfos={([
						!!nodeChildHolderBox_truth && {
							offset: lastChildBoxOffsets?.["truth"],
							color: GetNodeColor({type: "claim"} as any, "raw"),
						},
						!!nodeChildHolderBox_relevance && {
							offset: lastChildBoxOffsets?.["relevance"],
							color: GetNodeColor({type: "claim"} as any, "raw"),
						},
					] as ChildBoxInfo[]).filter(a=>a)}/>
			);
		}
		let nodeChildHolder_direct: JSX.Element|n;
		if ((!usingBox || isMultiPremiseArgument) && boxExpanded) {
			const showArgumentsControlBar = (node.type == MapNodeType.claim || isSinglePremiseArgument) && boxExpanded && nodeChildrenToShow != emptyArray_forLoading;
			nodeChildHolder_direct = <NodeChildHolder {...{map, node, path, nodeChildren, nodeChildrenToShow, separateChildren, showArgumentsControlBar}}
				ref={c=>this.nodeChildHolder_direct = c}
				// type={node.type == MapNodeType.claim && node._id != demoRootNodeID ? ChildGroup.truth : null}
				group={node.type == MapNodeType.claim ? ChildGroup.truth : ChildGroup.generic}
				usesGenericExpandedField={true}
				linkSpawnPoint={dividePoint || (selfHeight / 2)}
				belowNodeUI={isMultiPremiseArgument}
				minWidth={isMultiPremiseArgument && widthOverride ? widthOverride - 20 : 0}
				//childrenWidthOverride={isMultiPremiseArgument && widthOverride ? widthOverride - 20 : null}
				onHeightOrDividePointChange={UseCallback(dividePoint=>{
					// if multi-premise argument, divide-point is always at the top (just far enough down that the self-ui can center to the point, so self-height / 2)
					if (!isMultiPremiseArgument) {
						this.SetState({dividePoint});
					}
					this.CheckForChanges();
				}, [isMultiPremiseArgument])}/>;
		}

		// const hasExtraWrapper = subnodes.length || isMultiPremiseArgument;

		performance.mark("NodeUI_3");
		performance.measure("NodeUI_Part1", "NodeUI_1", "NodeUI_2");
		performance.measure("NodeUI_Part2", "NodeUI_2", "NodeUI_3");
		this.Stash({nodeChildrenToShow}); // for debugging

		// useEffect(() => CheckForChanges());

		/* return (
			<>
				{...}
				{hasExtraWrapper && <>
					{subnodes.map((subnode, index) => (
						<NodeUI key={index} indexInNodeList={index} map={map} node={subnode} asSubnode={true} style={E({ marginTop: -5 })}
							path={`${path}/L${subnode.id}`} widthOverride={widthOverride} onHeightOrPosChange={onHeightOrPosChange}/>
					))}
					<div className="clickThrough" style={E({ marginTop: -5 })}>
						{isMultiPremiseArgument
							&& nodeChildHolder_direct}
					</div>
					{!limitBar_above && children}
				</>}
			</>
		); */
		return (
			<>
			<div ref={c=>{
				this.nodeUI = c;
				//WaitXThenRun_Deduped([this, "checkForChanges"], 0, ()=>this.CheckForChanges());
				if (c) requestAnimationFrame(()=>this.CheckForChanges());
			}} className="NodeUI clickThrough" style={E(
				{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0},
				style,
			)}>
				<Column className="innerBoxColumn clickThrough" style={ES(
					{position: "relative"},
					/* useAutoOffset && {display: "flex", height: "100%", flexDirection: "column", justifyContent: "center"},
					!useAutoOffset && {paddingTop: innerBoxOffset}, */
					// {paddingTop: innerBoxOffset},
					{marginTop: boxExpanded && !isMultiPremiseArgument ? (dividePoint! - (selfHeight / 2)).NaNTo(0).KeepAtLeast(0) : 0},
				)}>
					{limitBar_above && children}

					{/*node.current.accessLevel != AccessLevel.basic &&
					<div style={{position: "absolute", right: "calc(100% + 5px)", top: 0, bottom: 0, display: "flex", fontSize: 10}}>
						<span style={{margin: "auto 0"}}>{AccessLevel[node.current.accessLevel][0].toUpperCase()}</span>
					</div>*/}
					<NodeUI_Inner ref={c=>{
						this.innerUI = GetInnerComp(c);
						if (ref_innerUI) ref_innerUI(c);
					}} {...{indexInNodeList, map, node, path, width, widthOverride}}/>
					{/* these are for components shown just to the right of the NodeUI_Inner box */}
					{nodeChildrenToShow == emptyArray_forLoading &&
						<div style={{margin: "auto 0 auto 10px"}}>...</div>}
					{IsRootNode(node) && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 && /*playingTimeline == null &&*/
						<div style={{margin: "auto 0 auto 10px", background: "rgba(0,0,0,.7)", padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
					{!boxExpanded &&
						<NodeChildCountMarker {...{limitBarPos}} childCount={nodeChildrenToShow.length + (relevanceArguments ? relevanceArguments.length : 0)}/>}
					{!boxExpanded && (addedDescendants > 0 || editedDescendants > 0) &&
						<NodeChangesMarker {...{addedDescendants, editedDescendants, limitBarPos}}/>}

					{!limitBar_above && children}
				</Column>
				{boxExpanded &&
				<Column ref={c=>this.rightColumn = c} className="rightColumn clickThrough" style={{position: "relative"}}>
					{childConnectorBackground}
					{nodeChildHolderBox_truth}
					{!isMultiPremiseArgument && nodeChildHolder_direct}
					{nodeChildHolderBox_relevance}
				</Column>}
			</div>
			{isMultiPremiseArgument && nodeChildHolder_direct}
			</>
		);
	}
	proxyDisplayedNodeUI: NodeUI|n;
	get NodeUIForDisplayedNode() {
		return this.proxyDisplayedNodeUI || this;
	}

	/*PostRender() {
		this.CheckForChanges();
	}*/

	// don't actually check for changes until re-rendering has stopped for 500ms
	// CheckForChanges = _.debounce(() => {
	CheckForChanges = ()=>{
		const {node, onHeightOrPosChange, dividePoint} = this.PropsState;
		const isMultiPremiseArgument = IsMultiPremiseArgument.CatchBail(false, node);
		if (this.DOM_HTML == null) return;

		// if (this.lastRender_source == RenderSource.SetState) return;

		// see UseSize_Method for difference between offsetHeight and the alternatives
		const height = this.DOM_HTML.offsetHeight
			// if multi-premise-arg, the nodeChildHolder_direct element is not "within" this.DOM_HTML; so add its height manually
			+ (isMultiPremiseArgument && this.nodeChildHolder_direct != null ? this.nodeChildHolder_direct.DOM_HTML.offsetHeight : 0);
		if (height != this.lastHeight) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewHeight:${height}`);

			// this.UpdateState(true);
			// this.UpdateState();
			this.UpdateChildBoxOffsets();
			if (onHeightOrPosChange) onHeightOrPosChange();
		}
		this.lastHeight = height;

		const selfHeight = this.SafeGet(a=>a.innerUI!.DOM_HTML.offsetHeight, 0);
		if (selfHeight != this.lastSelfHeight) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnSelfHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewSelfHeight:${selfHeight}`);

			// this.UpdateState(true);
			// this.UpdateState();
			// setSelfHeight(selfHeight);
			this.UpdateChildBoxOffsets();
			this.SetState({selfHeight});
			// if (onHeightOrPosChange) onHeightOrPosChange();
		}
		this.lastSelfHeight = selfHeight;

		if (dividePoint != this.lastDividePoint) {
			if (onHeightOrPosChange) onHeightOrPosChange();
		}

		/* else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
			this.ReportChildrenCenterYChange();
		} */
	};

	/* ComponentDidMount() {
		const { node, userViewedNodes } = this.props;
		if (MeID() == null) return;

		const userViewedNodes_doneLoading = userViewedNodes !== undefined;
		if (userViewedNodes_doneLoading && !(userViewedNodes || {}).VKeys().Contains(node.id)) {
			new NotifyNodeViewed({ nodeID: node.id }).RunOnServer();
		}
	} */

	OnChildHeightOrPosChange_updateStateQueued = false;
	OnChildHeightOrPosChange = ()=>{
		// wait one frame, so that if multiple calls to this method occur in the same frame, we only have to call OnHeightOrPosChange() once
		if (this.OnChildHeightOrPosChange_updateStateQueued) return;
		this.OnChildHeightOrPosChange_updateStateQueued = true;
		requestAnimationFrame(()=>{
			this.OnChildHeightOrPosChange_updateStateQueued = false;
			if (!this.mounted) return;
			this.UpdateChildBoxOffsets();
		});
	};
	UpdateChildBoxOffsets(forceUpdate = false) {
		const newState = {} as any;

		if (this.rightColumn) {
			const holderRect = VRect.FromLTWH(this.rightColumn.DOM.getBoundingClientRect());

			const lastChildBoxOffsets = this.childBoxes.Pairs().ToMapObj(pair=>pair.key, pair=>{
				const childBox = pair.value?.expandableBox?.DOM;
				if (childBox == null) return null; // can be null in certain cases (eg. while inner-ui still data-loading)

				let childBoxOffset = VRect.FromLTWH(childBox.getBoundingClientRect()).Position.Minus(holderRect.Position);
				Assert(childBoxOffset.x < 100, "Something is wrong. X-offset should never be more than 100.");
				childBoxOffset = childBoxOffset.Plus(new Vector2(0, childBox.getBoundingClientRect().height / 2));
				return childBoxOffset;
			});
			newState.lastChildBoxOffsets = lastChildBoxOffsets;
		}

		const cancelIfStateSame = !forceUpdate;
		const changedState = this.SetState(newState, undefined, cancelIfStateSame, true);
		//Log(`Changed state? (${this.props.node.id}): ` + changedState);
	}

	lastHeight = 0;
	lastSelfHeight = 0;
	lastDividePoint = 0;

	// GetMeasurementInfo(/*props: Props, state: State*/) {
	measurementInfo_cache: MeasurementInfo;
	measurementInfo_cache_lastUsedProps;
	/* ComponentWillReceiveProps(newProps) {
		this.GetMeasurementInfo(newProps, false); // refresh measurement-info when props change
	} */
	// GetMeasurementInfo(useCached: boolean) {
	GetMeasurementInfo(): MeasurementInfo {
		if (this.proxyDisplayedNodeUI) return this.proxyDisplayedNodeUI.GetMeasurementInfo();

		const {props} = this;
		const props_used = this.props.IncludeKeys("map", "node", "path", "leftMarginForLines") as typeof props;
		// Log("Checking whether should remeasure info for: " + props_used.node._id);
		if (this.measurementInfo_cache && ShallowEquals(this.measurementInfo_cache_lastUsedProps, props_used)) return this.measurementInfo_cache;

		const {map, node, path, leftMarginForLines} = props_used;
		//const subnodes = GetSubnodesInEnabledLayersEnhanced(MeID(), map.id, node.id);
		let {expectedBoxWidth, width, expectedHeight} = GetMeasurementInfoForNode.CatchBail({} as ReturnType<typeof GetMeasurementInfoForNode>, node, path, leftMarginForLines);
		if (expectedBoxWidth == null) return {expectedBoxWidth: 100, width: 100}; // till data is loaded, just return this

		/*for (const subnode of subnodes) {
			const subnodeMeasurementInfo = GetMeasurementInfoForNode(subnode, `${subnode.id}`);
			expectedBoxWidth = Math.max(expectedBoxWidth, subnodeMeasurementInfo.expectedBoxWidth);
		}*/

		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		if (isMultiPremiseArgument) {
			// expectedBoxWidth = expectedBoxWidth.KeepAtLeast(350);
			width = width.KeepAtLeast(350);
			// expectedBoxWidth += 20;
			//width += 20; // give extra space for left-margin
		}

		this.measurementInfo_cache = {expectedBoxWidth, width/* , expectedHeight */};
		this.measurementInfo_cache_lastUsedProps = props_used;
		return this.measurementInfo_cache;
	}
}
type MeasurementInfo = {expectedBoxWidth: number, width: number};

export enum LimitBarPos {
	above = "above",
	below = "below",
	none = "none",
}