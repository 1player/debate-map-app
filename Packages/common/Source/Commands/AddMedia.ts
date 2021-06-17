import {UserEdit} from "../CommandMacros";
import {Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink";
import {HasModPermissions} from "../Store/db/users/$user";
import {Media} from "../Store/db/media/@Media";

@UserEdit
export class AddMedia extends Command<{media: Media}, string> {
	mediaID: string;
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add media currently. (till review/approval system is implemented)");

		const {media} = this.payload;
		this.mediaID = this.mediaID ?? GenerateUUID();
		media.creator = this.userInfo.id;
		media.createdAt = Date.now();

		this.returnData = this.mediaID;
		AssertValidate("Media", media, "Media invalid");
	}

	GetDBUpdates() {
		const {media} = this.payload;
		const updates = {
			[`medias/${this.mediaID}`]: media,
		};
		return updates;
	}
}