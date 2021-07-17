import {Assert, E, CE} from "web-vcore/nm/js-vextensions.js";
import {GetAsync, Command, AssertV, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";

import {LinkNode_HighLevel} from "./LinkNode_HighLevel.js";
import {ClaimForm, Polarity, MapNode} from "../DB/nodes/@MapNode.js";
import {GetNode} from "../DB/nodes.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";

@MapEdit
@UserEdit
export class LinkNode extends Command<{mapID: string|n, parentID: string, childID: string, childForm?: ClaimForm|n, childPolarity?: Polarity|n}, {}> {
	child_oldData: MapNode|n;
	parent_oldData: MapNode;
	/* async Prepare(parent_oldChildrenOrder_override?: number[]) {
		let {parentID, childID, childForm} = this.payload;
		this.parent_oldChildrenOrder = parent_oldChildrenOrder_override || await GetDataAsync(`nodes/${parentID}/.childrenOrder`) as number[];
	} */
	Validate() {
		const {parentID, childID} = this.payload;
		AssertV(parentID != childID, "Parent-id and child-id cannot be the same!");

		this.child_oldData = GetNode(childID);
		AssertV(this.child_oldData || this.parentCommand != null, "Child does not exist! (and it should, since no parent-command)");
		this.parent_oldData =
			(this.parentCommand instanceof LinkNode_HighLevel && this == this.parentCommand.sub_linkToNewParent ? this.parentCommand.sub_addArgumentWrapper?.payload.node : null)
			//?? (this.parentCommand instanceof ImportSubtree_Old ? "" as any : null) // hack; use empty-string to count as non-null for this chain, but count as false for if-statements (ye...)
			?? GetNode.NN(parentID);
		AssertV(this.parent_oldData || this.parentCommand != null, "Parent does not exist! (and it should, since no parent-command)");

		const parentChildren = GetNodeChildLinks(this.parent_oldData.id);
		if (this.parent_oldData) {
			AssertV(!parentChildren.Any(a=>a.child == childID), `Node #${childID} is already a child of node #${parentID}.`);
		}

		/*if (this.child_oldData?.ownerMapID != null) {
			AssertV(this.parent_oldData?.ownerMapID == this.child_oldData.ownerMapID, `Cannot paste private node #${childID} into a map not matching its owner map (${this.child_oldData.ownerMapID}).`);
			/*const newMap = GetMap(this.parent_oldData.ownerMapID);
			AssertV(newMap, 'newMap not yet loaded.');
			if (newMap.requireMapEditorsCanEdit)*#/
		}*/
	}

	DeclareDBUpdates(db) {
		const {parentID, childID, childForm, childPolarity} = this.payload;
		// add parent as parent-of-child
		db.set(dbp`nodes/${childID}/.parents/.${parentID}`, {_: true});
		// add child as child-of-parent
		db.set(dbp`nodes/${parentID}/.children/.${childID}`, E(
			{_: true},
			childForm && {form: childForm},
			childPolarity && {polarity: childPolarity},
		));
		/*if (this.parent_oldData?.childrenOrder) {
			db.set(dbp`nodes/${parentID}/.childrenOrder`, this.parent_oldData.childrenOrder.concat([childID]));
		}*/
	}
}