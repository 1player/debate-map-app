import {emptyArray} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {globalMapID} from "../../DB_Constants.js";
import {GetMap} from "../maps.js";
import {GetUser} from "../users.js";
import {Map} from "./@Map.js";

export function IsUserMap(map: Map) {
	return map.id != globalMapID;
}

export const GetRootNodeID = CreateAccessor((mapID: string)=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.rootNode;
});

export const GetMapEditorIDs = CreateAccessor((mapID: string)=>{
	return GetMap.NN(mapID).editors; // nn: this function should only be called for maps known to exist (and maps still-loading will just bail)
});
export const GetMapEditors = CreateAccessor((mapID: string)=>{
	return GetMapEditorIDs.BIN(mapID).map(id=>GetUser(id));
});