import {GetNode, GetNodeChildLinks, GetNodeChildren, GetNodeChildrenL3, GetNodeL2, GetNodeRevisions, GetNodeTags, GetRatings, MapNodeType, MapNodeView, NodeRatingType} from "dm_common";
import {CatchBail, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetMapView} from "../maps/mapViews/$mapView";

export const GetNodeIDsVisibleInNodeViewExpansionState = CreateAccessor((nodeView: MapNodeView, nodeID: string, includeOneLevelInCollapsed = false)=>{
	if (nodeView == null) return [];
	const result = new Set<string>();
	result.add(nodeID);
	const descendantsToAdd =
		nodeView.expanded ? Object.entries(nodeView.children).SelectMany(([childID, childView])=>GetNodeIDsVisibleInNodeViewExpansionState(childView, childID, includeOneLevelInCollapsed)) :
		includeOneLevelInCollapsed ? Object.keys(nodeView.children) :
		[];
	for (const descendantID of descendantsToAdd) {
		result.add(descendantID);
	}
	return Array.from(result);
});

export const GetPreloadData_ForMapLoad = CreateAccessor((mapID: string)=>{
	//console.log("Starting");

	const mapView = GetMapView(mapID);
	if (mapView == null) return;

	let nodeIDs = Object.entries(mapView.rootNodeViews).SelectMany(([id, nodeView])=>{
		return GetNodeIDsVisibleInNodeViewExpansionState(nodeView, id, true);
	}).Distinct();

	for (const nodeID of nodeIDs) {
		// catch bails, so that all requests are made at once

		const node = GetNode.CatchBail(null, nodeID);
		GetNodeL2.CatchBail(null, nodeID);
		GetNodeRevisions.CatchBail(null, nodeID);
		GetNodeTags.CatchBail(null, nodeID);
		
		/*if (node) {
			if (node.type == MapNodeType.claim) {
			}
		}*/
		//GetRatings.CatchBail(null, nodeID, NodeRatingType.truth);
		//GetRatings.CatchBail(null, nodeID, NodeRatingType.relevance);

		GetNodeChildLinks.CatchBail(null, nodeID);
		CatchBail(null, ()=>GetNodeChildrenL3.CatchItemBails(null, nodeID));
	}

	//console.log("Done @nodeCount:", nodeIDs.length, "@nodeIDs:", nodeIDs);
});