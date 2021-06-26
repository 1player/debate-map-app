import chroma from "chroma-js";
import {emptyArray_forLoading} from "web-vcore/nm/js-vextensions";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetPlayingTimeline, GetPlayingTimelineRevealNodes_UpToAppliedStep, GetPlayingTimelineStepIndex} from "Store/main/maps/mapStates/$mapState";
import {MapNodeL3, MapNodeType, Polarity, GetNodeChildrenL2, GetNodeL3, GetUserAccessLevel, MeID} from "dm_common";

export function GetNodeColor(node: MapNodeL3, type: "raw" | "background" = "background"): chroma.Color {
	let result;
	if (node.type == MapNodeType.Category) result = chroma("rgb(40,60,80)");
	else if (node.type == MapNodeType.Package) result = chroma("rgb(30,120,150)");
	else if (node.type == MapNodeType.MultiChoiceQuestion) result = chroma("rgb(90,50,180)");
	else if (node.type == MapNodeType.Claim) result = chroma("rgb(0,80,150)");
	else if (node.type == MapNodeType.Argument) {
		if (node.displayPolarity == Polarity.Supporting) result = chroma("rgb(30,100,30)");
		else result = chroma("rgb(100,30,30)");
	}

	if (type == "background") {
		result = chroma.mix(result, "black", 0.3); // mix background-color with black some
		result = result.alpha(0.9);
	}

	return result;
}

export const GetNodeChildrenL3_Advanced = StoreAccessor(s=>(nodeID: string, path: string, mapID: string, includeMirrorChildren = true, tagsToIgnore?: string[], applyAccessLevels = false, applyTimeline = false, emptyForLoading = false): MapNodeL3[]=>{
	path = path || nodeID;

	const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
	let nodeChildrenL3 = nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child.id}`) : null));
	if (applyAccessLevels) {
		nodeChildrenL3 = nodeChildrenL3.filter(child=>{
			// if null, keep (so receiver knows there's an entry here, but it's still loading)
			if (child == null) return true;
			// filter out any nodes whose access-level is higher than our own
			if (child.current.accessLevel > GetUserAccessLevel(MeID())) return false;
			// hide nodes that don't have the required premise-count
			// if (!IsNodeVisibleToNonModNonCreators(child, GetNodeChildren(child)) && !IsUserCreatorOrMod(MeID(), child)) return false;
			return true;
		});
	}
	if (applyTimeline) {
		const playingTimeline = GetPlayingTimeline(mapID);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(mapID);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map.id);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map.id, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(mapID);
		if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			// nodeChildrenToShow = nodeChildrenToShow.filter(child => playingTimelineVisibleNodes.Contains(`${path}/${child.id}`));
			// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
			nodeChildrenL3 = nodeChildrenL3.filter(child=>child != null && playingTimelineVisibleNodes.Any(a=>a.startsWith(`${path}/${child.id}`)));
		}
	}
	if (emptyForLoading) {
		nodeChildrenL3 = nodeChildrenL3.Any(a=>a == null) ? emptyArray_forLoading : nodeChildrenL3; // only pass nodeChildren when all are loaded
	}
	return nodeChildrenL3;
});