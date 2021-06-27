import {MapNodeRevision} from "../nodes/@MapNodeRevision";
import {QuoteAttachment} from "./@QuoteAttachment";
import {MediaAttachment} from "./@MediaAttachment";
import {MapNodeL2} from "../nodes/@MapNode";
import {MapNodeType} from "../nodes/@MapNodeType";
import {EquationAttachment} from "./@EquationAttachment";
import {ReferencesAttachment} from "./@ReferencesAttachment";
import {CE, CreateStringEnum} from "web-vcore/nm/js-vextensions";

export enum AttachmentType {
	none = "none",
	//ImpactPremise: 1,
	equation = "equation",
	references = "references",
	quote = "quote",
	media = "media",
}

export function GetAttachmentType(node: MapNodeL2) {
	return GetAttachmentType_Revision(node.current);
}
export function GetAttachmentType_Revision(revision: MapNodeRevision) {
	return (
		revision.equation ? AttachmentType.equation
		: revision.references ? AttachmentType.references
		: revision.quote ? AttachmentType.quote
		: revision.media ? AttachmentType.media
		: AttachmentType.none
	);
}

export function ResetNodeRevisionAttachment(revision: MapNodeRevision, attachmentType: AttachmentType) {
	CE(revision).Extend({equation: null, references: null, quote: null, media: null});
	if (attachmentType == AttachmentType.equation) {
		revision.equation = new EquationAttachment();
	} else if (attachmentType == AttachmentType.references) {
		revision.references = new ReferencesAttachment();
	} else if (attachmentType == AttachmentType.quote) {
		revision.quote = new QuoteAttachment();
	} else if (attachmentType == AttachmentType.media) {
		revision.media = new MediaAttachment();
	}
}