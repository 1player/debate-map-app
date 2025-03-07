import {GetMap, GetNodeChildLinks, GetNodeL2, MapView, Me} from "dm_common";
import {GetOpenMapID} from "Store/main";
import {ACTEnsureMapStateInit} from "Store/main/maps";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {ACTMapNodeExpandedSet, GetFocusedNodePath, GetMapView, GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {ACTSetFocusNodeAndViewOffset, MapUI} from "UI/@Shared/Maps/MapUI.js";
import {RunInAction} from "web-vcore";
import {Assert, NN, Vector2} from "web-vcore/nm/js-vextensions.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {AutoRun_HandleBail} from "./@Helpers.js";

//let lastMapID: string|n;
AutoRun_HandleBail(()=>{
	Me(); // watch for user-login-data changes

	const mapID = GetOpenMapID();
	if (mapID) {
		StartInitForNewlyLoadedMap(mapID);
	}
}, {name: "InitForNewlyLoadedMap"});

/** Returns true if the map state (including map-view) was successfully initialized. */
async function StartInitForNewlyLoadedMap(mapID: string) {
	Assert(mapID != null, "mapID cannot be null.");
	let mapState = GetMapState(mapID);
	if (mapState?.initDone && GetMapView(mapID) != null) return true; // 2nd-check for version-clearing
	const map = await GetAsync(()=>GetMap(mapID));
	//Assert(map);
	if (map == null) return false; // map must be private/deleted

	//ACTEnsureMapStateInit(action.payload.id);
	let mapView: MapView|n;
	RunInAction("StartInitForNewlyLoadedMap_part1", ()=>{
		({mapState, mapView} = ACTEnsureMapStateInit(mapID));
		/*if (map.defaultTimelineID) {
			mapState.timelinePanelOpen = true;
			mapState.timelineOpenSubpanel = TimelineSubpanel.playing;
			mapState.selectedTimeline = map.defaultTimelineID;
		}*/
	});

	let pathsToExpand = [map.rootNode];
	for (let depth = 0; depth < map.defaultExpandDepth; depth++) {
		const newPathsToExpand = [] as string[];
		for (const path of pathsToExpand) {
			const nodeID = path.split("/").Last();
			const node = await GetAsync(()=>GetNodeL2(nodeID));
			if (node == null) continue; // node must be private/deleted

			//console.log('NodeView:', path, GetNodeView(map.id, path, false));
			if (GetNodeView(map.id, path, false) == null) {
				//console.log('Expanding:', path);
				ACTMapNodeExpandedSet({mapID: map.id, path, expanded: true, resetSubtree: false});
			}
			const childLinks = await GetAsync(()=>GetNodeChildLinks(node.id));
			if (childLinks.length) {
				newPathsToExpand.push(...childLinks.map(a=>`${path}/${a.child}`));
			}
		}
		pathsToExpand = newPathsToExpand;
	}

	const focusedNodePath = GetFocusedNodePath(mapID);
	// focus on the root-node, if no node is focused yet (a node to focus on may already have been specified through a URL param)
	if (focusedNodePath == null) {
		// have view start a bit to the right of the root node
		ACTSetFocusNodeAndViewOffset(mapID, map.rootNode, new Vector2(300, 0));
	}

	RunInAction("StartInitForNewlyLoadedMap_markInitDone", ()=>NN(mapState).initDone = true);

	// probably temp (find more elegant way)
	const mapUI = MapUI.CurrentMapUI;
	//console.log('MapUI:', mapUI);
	if (mapUI) {
		mapUI.StartLoadingScroll();
	}

	return true;
}