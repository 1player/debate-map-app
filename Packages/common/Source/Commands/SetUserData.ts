import {AddSchema, AssertValidate, GetSchemaJSON, NewSchema, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {GetUser} from "../DB/users.js";
import {User} from "../DB/users/@User.js";

type MainType = User;
const MTName = "User";

//export class SetUserData extends Command<{id: string, updates: Partial<MainType>, allowPrevious?: boolean}, {}> {
export class SetUserData extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate({
			properties: {
				id: {$ref: "UUID"},
				updates: NewSchema({
					properties: CE(GetSchemaJSON(MTName)["properties"]).Including(
						"displayName", "photoURL",
						"joinDate", "permissionGroups",
					),
				}),
			},
			required: ["id", "updates"],
		}, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		//AssertV(id == this.userInfo.id, "Cannot set user-data for another user!");
		this.oldData = GetUser.NN(id);
		/*if (!allowPrevious) {
			AssertV(this.oldData == null, "oldData must be null, since allowPrevious is false.");
		}*/

		// if joinDate is already set, don't allow it to be set again (defensive programming, for if UserSignUpHelper just fails to load existing data fsr)
		if (this.oldData?.joinDate != null) {
			AssertV(!("joinDate" in updates), "joinDate cannot be set after its initial set!");
		}

		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db) {
		const {id} = this.payload;
		db.set(`users/${id}`, this.newData);
	}
}