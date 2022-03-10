import {Assert, IsNaN} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {NodeChildLink} from "./nodeChildLinks/@NodeChildLink.js";
import {ChildGroup} from "./nodes/@MapNodeType.js";

export const GetNodeChildLink = CreateAccessor((id: string)=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.nodeChildLinks.get(id));
});
export const GetNodeChildLinks = CreateAccessor((parentID?: string|n, childID?: string|n, group?: ChildGroup|n, orderByOrderKeys = true): NodeChildLink[]=>{
	// temp; optimization that improves loading speed a bit (~10s to ~7s)
	if (parentID != null) {
		const linksUnderParent = GetDocs({
			params: {filter: {
				parent: parentID && {equalTo: parentID},
			}},
		}, a=>a.nodeChildLinks);
		let result = linksUnderParent;
		if (childID != null) result = result.filter(a=>a.child == childID);
		if (group != null) result = result.filter(a=>a.group == group);

		if (orderByOrderKeys) result = result.OrderBy(a=>a.orderKey);
		return result;
	}

	let result = GetDocs({
		params: {filter: {
			/*and: [
				parentID != null && {parent: {equalTo: parentID}},
				childID != null && {child: {equalTo: childID}},
			].filter(a=>a),*/
			parent: parentID && {equalTo: parentID},
			child: childID && {equalTo: childID},
			group: group && {equalTo: group},
		}},
	}, a=>a.nodeChildLinks);

	if (orderByOrderKeys) result = result.OrderBy(a=>a.orderKey);
	return result;
});