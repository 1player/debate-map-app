import {GetAsync, Command, AssertV, dbp, CommandMeta, DBHelper, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel.js";
import {ClaimForm, Polarity, MapNode} from "../DB/nodes/@MapNode.js";
import {GetNode} from "../DB/nodes.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		$parentID: {$ref: "UUID"},
		$childID: {$ref: "UUID"},
		childForm: {$ref: "ClaimForm"},
		childPolarity: {$ref: "Polarity"},
	}),
	returnSchema: ()=>SimpleSchema({
		$linkID: {type: "string"},
	}),
})
export class LinkNode extends Command<{mapID: string|n, parentID: string, childID: string, childForm?: ClaimForm|n, childPolarity?: Polarity|n}, {linkID: string}> {
	child_oldData: MapNode|n;
	parent_oldData: MapNode;
	link: NodeChildLink;
	Validate() {
		const {parentID, childID, childForm, childPolarity} = this.payload;
		AssertV(parentID != childID, "Parent-id and child-id cannot be the same!");

		this.child_oldData = GetNode(childID);
		AssertV(this.child_oldData, "Cannot link child-node that does not exist!");
		this.parent_oldData =
			(this.parentCommand instanceof LinkNode_HighLevel && this == this.parentCommand.sub_linkToNewParent ? this.parentCommand.sub_addArgumentWrapper?.payload.node : null)
			//?? (this.parentCommand instanceof ImportSubtree_Old ? "" as any : null) // hack; use empty-string to count as non-null for this chain, but count as false for if-statements (ye...)
			?? GetNode.NN(parentID);
		AssertV(this.parent_oldData, "Cannot link child-node to parent that does not exist!");

		const parentToChildLinks = GetNodeChildLinks(parentID, childID);
		AssertV(parentToChildLinks.length == 0, `Node #${childID} is already a child of node #${parentID}.`);

		this.link = new NodeChildLink({
			parent: parentID,
			child: childID,
			form: childForm,
			polarity: childPolarity,
			slot: 0,

			// cache data
			c_parentType: this.parent_oldData.type,
			c_childType: this.child_oldData.type,
		});
		this.link.id = this.GenerateUUID_Once("link.id");

		this.returnData = {linkID: this.link.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		db.set(dbp`nodeChildLinks/${this.link.id}`, this.link);
	}
}