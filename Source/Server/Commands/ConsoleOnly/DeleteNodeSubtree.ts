import {Command, MergeDBUpdates, AssertV} from "mobx-firelink";
import {MapNode} from "Store/firebase/nodes/@MapNode";
import {AssertValidate} from "vwebapp-framework";
import {GetNode} from "Store/firebase/nodes";
import {DeleteNode} from "../DeleteNode";

export function GetNodesInSubtree(rootNodeID: string, runInfo = {nodesVisited: new Set<string>()}) {
	if (runInfo.nodesVisited.has(rootNodeID)) return [];
	runInfo.nodesVisited.add(rootNodeID);

	const rootNode = GetNode(rootNodeID);
	if (rootNode == null) return null;

	const result = [];
	for (const childID of rootNode.children?.VKeys() ?? []) {
		const subtreeNodes = GetNodesInSubtree(childID, runInfo);
		if (subtreeNodes == null) return null; // if any subtree contents are not yet loaded, have the whole call resolve to null
		result.push(...subtreeNodes);
	}
	// add self last, so that deeper nodes are deleted first
	result.push(rootNode);
	return result;
}

export class DeleteNodeSubtree extends Command<{nodeID: string, maxDeletes: number}, {}> {
	nodesInSubtree: MapNode[];

	subs_deleteNodes: DeleteNode[];
	Validate() {
		AssertValidate({
			properties: {
				nodeID: {type: "string"},
				maxDeletes: {type: "number"},
			},
			required: ["nodeID"],
		}, this.payload, "Payload invalid");
		const {nodeID, maxDeletes} = this.payload;

		// clear each run, since validate gets called more than once
		this.nodesInSubtree = [];
		this.subs_deleteNodes = [];

		this.nodesInSubtree = GetNodesInSubtree(nodeID);
		AssertV(this.nodesInSubtree, "List of nodes in subtree is still loading.");
		AssertV(this.nodesInSubtree.length <= maxDeletes, `Length of nodes in subtree (${this.nodesInSubtree.length}) is greater than the max-deletes limit (${maxDeletes}).`);

		this.subs_deleteNodes = this.nodesInSubtree.map(node=>{
			const deleteNodeCommand = new DeleteNode({nodeID: node._key}).MarkAsSubcommand(this);
			deleteNodeCommand.childrenToIgnore = this.nodesInSubtree.map(a=>a._key);
			deleteNodeCommand.Validate();
			return deleteNodeCommand;
		});
	}

	GetDBUpdates() {
		let updates = {};
		for (const deleteNodeCommand of this.subs_deleteNodes) {
			updates = MergeDBUpdates(updates, deleteNodeCommand.GetDBUpdates());
		}
		return updates;
	}
}