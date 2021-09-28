import chroma from "chroma-js";
import {AssertWarn, emptyArray, emptyArray_forLoading, E} from "web-vcore/nm/js-vextensions.js";
import {Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM, UseCallback, UseEffect, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {GADDemo, GADMainFont} from "UI/@GAD/GAD.js";
import {ES, HSLA, Observer, RunInAction} from "web-vcore";
import {ACTMapNodeExpandedSet, GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {MapNodeL3, ChildGroup, GetParentNodeL3, IsPremiseOfSinglePremiseArgument, IsMultiPremiseArgument, GetFillPercent_AtPath, GetMarkerPercent_AtPath, GetRatings, ArgumentType, MapNodeType, NodeRatingType, Map} from "dm_common";
import {GetNodeColor} from "Store/db_ext/nodes";
import {RatingsPanel} from "../DetailBoxes/Panels/RatingsPanel.js";
import {NodeChildHolder} from "./NodeChildHolder.js";
import {NodeChildCountMarker} from "./NodeChildCountMarker.js";
import {NodeUI_Menu_Stub} from "../NodeUI_Menu.js";
import {Squiggle} from "../NodeConnectorBackground.js";
import {ExpandableBox} from "../ExpandableBox.js";
import {nodeBottomPanel_minWidth} from "../DetailBoxes/NodeUI_BottomPanel.js";

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeChildren: MapNodeL3[], nodeChildrenToShow: MapNodeL3[],
	group: ChildGroup, widthOfNode: number, widthOverride?: number, onHeightOrDividePointChange?: (dividePoint: number)=>void,
};

@WarnOfTransientObjectProps
@Observer
export class NodeChildHolderBox extends BaseComponentPlus({} as Props, {innerBoxOffset: 0, lineHolderHeight: 0, hovered: false, hovered_button: false}) {
	static ValidateProps(props: Props) {
		const {node, nodeChildren} = props;
		// ms only asserts in dev for now (and only as warning); causes error sometimes when cut+pasting otherwise (firebase doesn`t send DB updates atomically?)
		/*if (DEV) {
			AssertWarn(nodeChildren.every(a=>a == null || (a.parents || {})[node.id] != null), "Supplied node is not a parent of all the supplied node-children!");
		}*/
	}
	lineHolder: HTMLDivElement|n;
	render() {
		const {map, node, path, nodeChildren, nodeChildrenToShow, group, widthOfNode, widthOverride} = this.props;
		const {innerBoxOffset, lineHolderHeight, hovered, hovered_button} = this.state;

		// const nodeView = GetNodeView(map.id, path) ?? new MapNodeView();
		// const nodeView = GetNodeView(map.id, path, true);
		const nodeView = GetNodeView(map.id, path);
		const parent = GetParentNodeL3(path);
		const combineWithParentArgument = IsPremiseOfSinglePremiseArgument(node, parent);

		//const backgroundFillPercent = GetFillPercent_AtPath(node, path, group);
		const backgroundFillPercent = 100;
		const markerPercent = GetMarkerPercent_AtPath(node, path, group);

		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		let text = group == ChildGroup.truth ? "True?" : "Relevant?";
		if (isMultiPremiseArgument) {
			//text = "When taken together, are these claims relevant?";
			if (node.argumentType == ArgumentType.all) text = "If all these claims were true, would they be relevant?";
			else if (node.argumentType == ArgumentType.any) text = "If 1 (or more) of these claims were true, would they be relevant?";
			else if (node.argumentType == ArgumentType.anyTwo) text = "If 2 (or more) of these claims were true, would they be relevant?";
		}
		// let backgroundColor = chroma(`rgb(40,60,80)`) as Color;
		const backgroundColor = GetNodeColor({type: MapNodeType.claim} as any as MapNodeL3);
		// let lineColor = GetNodeColor(node, "raw");
		const lineColor = GetNodeColor({type: MapNodeType.claim} as any as MapNodeL3, "raw");

		const lineOffset = 50.0.KeepAtMost(innerBoxOffset);
		// let expandKey = type == ChildGroup.truth ? "expanded_truth" : "expanded_relevance";
		const childGroupStr = ChildGroup[group].toLowerCase();
		const expandKey = `expanded_${childGroupStr}`;
		const expanded = nodeView[expandKey]; // this.Expanded

		const separateChildren = node.type == MapNodeType.claim || node.type == MapNodeType.argument;
		const showArgumentsControlBar = /* (node.type == MapNodeType.claim || combineWithChildClaim) && */ expanded && nodeChildrenToShow != emptyArray_forLoading;

		let {width, height} = this.GetMeasurementInfo();
		if (widthOverride) {
			width = widthOverride;
		}

		const hovered_main = hovered && !hovered_button;
		const ratingPanelShow = (nodeView && nodeView[`selected_${childGroupStr}`]) || hovered_main; // || local_selected;

		UseEffect(()=>{
			if (this.expandableBox?.DOM == null) return; // can be null if, for example, an error occurred during the box's rendering
			this.expandableBox!.DOM!.addEventListener("mouseenter", ()=>document.querySelectorAll(".scrolling").length == 0 && this.SetState({hovered: true}));
			this.expandableBox!.DOM!.addEventListener("mouseleave", ()=>this.SetState({hovered: false}));
			this.expandableBox!.expandButton!.DOM.addEventListener("mouseenter", ()=>document.querySelectorAll(".scrolling").length == 0 && this.SetState({hovered_button: true}));
			this.expandableBox!.expandButton!.DOM.addEventListener("mouseleave", ()=>this.SetState({hovered_button: false}));
		});

		return (
			<Row className="clickThrough" style={E(
				{position: "relative", alignItems: "flex-start"},
				//! isMultiPremiseArgument && {alignSelf: "flex-end"},
				!isMultiPremiseArgument && {left: `calc(${widthOfNode}px - ${width}px)`},
				isMultiPremiseArgument && {marginTop: 10, marginBottom: 5},
				// if we don't know our inner-box-offset yet, render still (so we can measure ourself), but make self invisible
				expanded && nodeChildrenToShow.length && innerBoxOffset == 0 && {opacity: 0, pointerEvents: "none"},
			)}>
				<Row className="clickThrough" style={E(
					{/* position: "relative", /* removal fixes */ alignItems: "flex-start", /* marginLeft: `calc(100% - ${width}px)`, */ width},
				)}>
					<div ref={c=>this.lineHolder = c} className="clickThroughChain" style={{position: "absolute", width: "100%", height: "100%"}}>
						{group == ChildGroup.truth &&
							<Squiggle start={[0, lineHolderHeight + 2]} startControl_offset={[0, -lineOffset]}
								end={[(width / 2) - 2, innerBoxOffset + height - 2]} endControl_offset={[0, lineOffset]} color={lineColor}/>}
						{group == ChildGroup.relevance && !isMultiPremiseArgument &&
							<Squiggle start={[0, -2]} startControl_offset={[0, lineOffset]}
								end={[(width / 2) - 2, innerBoxOffset + 2]} endControl_offset={[0, -lineOffset]} color={lineColor}/>}
						{group == ChildGroup.relevance && isMultiPremiseArgument &&
							<div style={{position: "absolute", right: "100%", width: 10, top: innerBoxOffset + (height / 2) - 2, height: 3, backgroundColor: lineColor.css()}}/>}
					</div>
					<ExpandableBox {...{width, widthOverride, expanded}} innerWidth={width}
						ref={c=>this.expandableBox = c}
						style={{marginTop: innerBoxOffset}}
						padding="3px 5px 2px"
						text={<span style={ES(
							{position: "relative", fontSize: 13},
							GADDemo && {
								color: HSLA(222, 0.33, 0.25, 1), fontFamily: GADMainFont, //fontSize: 11, letterSpacing: 1
							},
						)}>{text}</span>}
						{...E(
							{backgroundFillPercent: backgroundFillPercent ?? 0, backgroundColor, markerPercent},
							GADDemo && {backgroundFillPercent: 100, backgroundColor: chroma(HSLA(0, 0, 1)) as chroma.Color},
						)}
						toggleExpanded={UseCallback(e=>{
							const newExpanded = !nodeView[expandKey];
							const recursivelyCollapsing = !newExpanded && e.altKey;
							RunInAction("NodeChildHolderBox_toggleExpanded", ()=>{
								if (group == ChildGroup.truth) {
									ACTMapNodeExpandedSet({
										mapID: map.id, path, resetSubtree: recursivelyCollapsing,
										[expandKey]: newExpanded,
									});
								} else {
									ACTMapNodeExpandedSet({
										mapID: map.id, path, resetSubtree: false,
										[expandKey]: newExpanded,
									});
									if (recursivelyCollapsing) {
										for (const child of nodeChildrenToShow) {
											ACTMapNodeExpandedSet({
												mapID: map.id, path: `${path}/${child.id}`, resetSubtree: true,
												[expandKey]: newExpanded,
											});
										}
									}
								}
							});
							e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
							// return false;
							if (nodeView[expandKey]) {
								this.CheckForChanges();
							}
						}, [expandKey, map.id, nodeChildrenToShow, nodeView, path, group])}
						afterChildren={<>
							{ratingPanelShow &&
								<div ref={c=>this.ratingPanelHolder = c} style={{
									position: "absolute", left: 0, top: "calc(100% + 1px)",
									width, minWidth: (widthOverride ?? 0).KeepAtLeast(nodeBottomPanel_minWidth), zIndex: hovered_main ? 6 : 5,
									padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
								}}>
									<RatingsPanel node={node} path={path} ratingType={childGroupStr as NodeRatingType}/>
								</div>}
							<NodeUI_Menu_Stub {...{map, node, path}} childGroup={group}/>
						</>}
					/>
					{nodeChildrenToShow != emptyArray && !expanded && nodeChildrenToShow.length != 0 &&
						<NodeChildCountMarker childCount={nodeChildrenToShow.length}/>}
					{/*! nodeView.expanded && (addedDescendants > 0 || editedDescendants > 0) &&
						<NodeChangesMarker {...{addedDescendants, editedDescendants, textOutline, limitBarPos}}/> */}
				</Row>
				{nodeView[expandKey] &&
					<NodeChildHolder ref={c=>this.childHolder = c}
						{...{map, node, path, nodeChildrenToShow, group, separateChildren, showArgumentsControlBar}}
						linkSpawnPoint={innerBoxOffset + (height / 2)}
						onHeightOrDividePointChange={this.CheckForChanges}/>}
			</Row>
		);
	}

	get Expanded() {
		const {map, path, group} = this.props;
		const expandKey = `expanded_${ChildGroup[group].toLowerCase()}`;
		const nodeView = GetNodeView(map.id, path);
		return nodeView[expandKey];
	}

	expandableBox: ExpandableBox|n;
	ratingPanelHolder: HTMLDivElement|n;
	ratingPanel: RatingsPanel|n;
	childHolder: NodeChildHolder|n;

	PostRender() {
		this.CheckForChanges();
	}

	lastLineHolderHeight = 0;
	lastHeight = 0;
	lastDividePoint = 0;
	CheckForChanges = ()=>{
		if (this.lineHolder == null) return;
		const {onHeightOrDividePointChange} = this.props;

		//const lineHolderHeight = $(this.lineHolder).outerHeight();
		//const lineHolderHeight = this.lineHolder.height.height + /*this.lineHolder.marginTop + this.lineHolder.marginBottom*/ + document.body.borderTop + document.body.borderBottom;
		const lineHolderHeight = this.lineHolder.getBoundingClientRect().height;
		if (lineHolderHeight != this.lastLineHolderHeight) {
			this.SetState({lineHolderHeight});
		}
		this.lastLineHolderHeight = lineHolderHeight;

		//const height = $(GetDOM(this)).outerHeight();
		const height = GetDOM(this)!.getBoundingClientRect().height;
		const dividePoint = this.childHolder && this.Expanded ? this.childHolder.GetDividePoint() : 0;
		if (height != this.lastHeight || dividePoint != this.lastDividePoint) {
			/* if (height != this.lastHeight) {
				this.OnHeightChange();
			} */
			if (dividePoint != this.lastDividePoint) {
				const {height} = this.GetMeasurementInfo();
				const distFromInnerBoxTopToMainBoxCenter = height / 2;
				const innerBoxOffset = (dividePoint - distFromInnerBoxTopToMainBoxCenter).NaNTo(0).KeepAtLeast(0);
				this.SetState({innerBoxOffset});
			}

			if (onHeightOrDividePointChange) onHeightOrDividePointChange(dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = dividePoint;
	};

	GetMeasurementInfo() {
		// return {width: 90, height: 26};
		return {width: 90, height: 22};
	}
}