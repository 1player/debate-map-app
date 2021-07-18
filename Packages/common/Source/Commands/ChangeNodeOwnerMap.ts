import {AddSchema, Command, CommandMeta, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {MapNode} from "../DB/nodes/@MapNode.js";

// todo: integrate rest of validation code, preferably using system callable from both here and the ui (this is needed for many other commands as well)

// @MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			nodeID: {type: "string"},
			newOwnerMapID: {type: ["null", "string"]},
			argumentNodeID: {type: "string"},
		},
		required: ["nodeID", "newOwnerMapID"],
	}),
})
export class ChangeNodeOwnerMap extends Command<{nodeID: string, newOwnerMapID: string, argumentNodeID?: string}, {}> {
	newData: MapNode;

	sub_changeOwnerMapForArgument: ChangeNodeOwnerMap;

	Validate() {
		/*const {nodeID, newOwnerMapID, argumentNodeID} = this.payload;
		const oldData = AV.NonNull = GetNode(nodeID);

		AssertV(IsUserCreatorOrMod(this.userInfo.id, oldData), "User is not the node's creator, or a moderator.");
		// if making private
		if (oldData.ownerMapID == null) {
			const newOwnerMap = GetMap(newOwnerMapID);
			AssertV(newOwnerMap.type == MapType.Private, "Node must be in private map to be made private.");

			const permittedPublicParentIDs = argumentNodeID ? [argumentNodeID] : [];

			const parents = GetNodesByIDs(CE(oldData.parents ?? {}).VKeys());
			const parentsArePrivateInSameMap = !IsSpecialEmptyArray(parents) && newOwnerMapID && parents.every(a=>a.ownerMapID == newOwnerMapID || permittedPublicParentIDs.includes(a.id));
			AssertV(parentsArePrivateInSameMap, "To make node private, all its parents must be private nodes within the same map. (to ensure we don't leave links in other maps, which would make the owner-map-id invalid)");
		} else {
			// if making public
			AssertV(oldData.rootNodeForMap == null, "Cannot make a map's root-node public.");
			// the owner map must allow public nodes (at some point, may remove this restriction, by having action cause node to be auto-replaced with in-map private-copy)
			// AssertV(oldData.parents?.VKeys().length > 0, "Cannot make an")

			const revision = GetNodeRevision(oldData.currentRevision);
			AssertV(revision, "revision not yet loaded.");
			AssertV(revision.permission_contribute?.type == PermissionInfoType.Anyone, 'To make node public, the "Contribute" permission must be set to "Anyone".');

			const permittedPrivateChildrenIDs = this.parentCommand instanceof ChangeNodeOwnerMap ? [this.parentCommand.payload.nodeID] : [];

			const children = GetNodeChildren(oldData.id);
			AssertV(children.every(a=>a.ownerMapID == null || permittedPrivateChildrenIDs.includes(a.id)), "To make node public, it must not have any private children.");
		}

		this.newData = E(oldData, {ownerMapID: newOwnerMapID ?? DEL});
		AssertValidate("MapNode", this.newData, "New node-data invalid");

		if (argumentNodeID) {
			this.sub_changeOwnerMapForArgument = this.sub_changeOwnerMapForArgument ?? new ChangeNodeOwnerMap({nodeID: argumentNodeID, newOwnerMapID}).MarkAsSubcommand(this);
			this.sub_changeOwnerMapForArgument.Validate();
		}*/
	}

	DeclareDBUpdates(db) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newData);
		if (this.sub_changeOwnerMapForArgument) {
			db.add(this.sub_changeOwnerMapForArgument.GetDBUpdates());
		}
	}
}