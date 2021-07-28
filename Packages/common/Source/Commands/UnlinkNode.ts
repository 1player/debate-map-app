import {GetAsync, Command, AssertV, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {GetNode, IsRootNode} from "../DB/nodes.js";
import {GetNodeL2} from "../DB/nodes/$node.js";
import {IsUserCreatorOrMod} from "../DB/users/$user.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";

// todo: add full-fledged checking to ensure that nodes are never orphaned by move commands (probably use parents recursion to find at least one map root)

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {type: "string"},
		parentID: {type: "string"},
		childID: {type: "string"},
	}),
})
export class UnlinkNode extends Command<{mapID: string|n, parentID: string, childID: string}, {}> {
	allowOrphaning = false; // could also be named "asPartOfCut", to be consistent with ForUnlink_GetError parameter

	parentToChildLinks: NodeChildLink[];
	Validate() {
		const {parentID, childID} = this.payload;
		const childParents = GetNodeChildLinks(undefined, childID);
		this.parentToChildLinks = GetNodeChildLinks(parentID, childID);
		AssertV(this.parentToChildLinks.length <= 1, "There should not be more than 1 link between parent and child.");

		/* let {parentID, childID} = this.payload;
		let childNode = await GetNodeAsync(childID);
		let parentNodes = await GetNodeParentsAsync(childNode);
		Assert(parentNodes.length > 1, "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."); */
		const oldData = GetNodeL2.NN(childID);

		const baseText = `Cannot unlink node #${oldData.id}, since `;
		AssertV(IsUserCreatorOrMod(this.userInfo.id, oldData), `${baseText}you are not its owner. (or a mod)`);
		AssertV(this.allowOrphaning || childParents.length > 1, `${baseText}doing so would orphan it. Try deleting it instead.`);
		AssertV(!IsRootNode(oldData), `${baseText}it's the root-node of a map.`);
		//AssertV(!IsNodeSubnode(oldData), `${baseText}it's a subnode. Try deleting it instead.`);
	}

	DeclareDBUpdates(db: DBHelper) {
		for (const link of this.parentToChildLinks) {
			db.set(dbp`nodeChildLinks/${link.id}`, null);
		}
	}
}