import {GetValues_ForSchema, Assert, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";

// export type SourceChain = { [key: number]: Source; };
// export type SourceChainI = {[key: number]: Source;};
// export class SourceChain /*implements SourceChainI*/ {
/* export class SourceChain extends Array {
	[key: number]: Source;
	0 = new Source();
}; */
export class SourceChain {
	constructor(sources: Source[] = []) {
		this.sources = sources;
	}
	sources: Source[];
}
// AddSchema({patternProperties: {"^[A-Za-z0-9_-]+$": {$ref: "Source"}}, minProperties: 1}, "SourceChain");
AddSchema("SourceChain", {
	properties: {
		sources: {items: {$ref: "Source"}, minItems: 1},
	},
	required: ["sources"],
});

export enum SourceType {
	speech = "speech",
	text = "text",
	image = "image",
	video = "video",
	webpage = "webpage",
}
AddSchema("SourceType", {enum: GetValues(SourceType)});

export const Source_linkURLPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+$";
export class Source {
	constructor(data?: Partial<Source>) {
		Object.assign(this, data);
	}

	type = SourceType.webpage;

	// uses with * means shown in the main row (rather than in dropdown)
	// todo: either MS the time fields are only for type:video, or clarify their purpose in code and UI (eg. date-range of occurrence?)
	name?: string; // used by: Speech, Text*
	author?: string; // used by: Speech*, Text*, Image*, Video*
	location?: string; // used by: Speech*, Image*, Video*
	time_min?: number; // used by: Speech, Text, Image, Video, Webpage
	time_max?: number; // used by: Speech, Text, Image, Video, Webpage
	link?: string; // used by: Webpage*
}
AddSchema("Source", {
	properties: {
		type: {$ref: "SourceType"},
		name: {pattern: "\\S.*"},
		author: {pattern: "\\S.*"},
		location: {type: "string"},
		time_min: {type: "number"},
		time_max: {type: "number"},
		// link: { format: 'uri' },
		// link: { pattern: Source_linkURLPattern },
		link: {type: "string"}, // allow overriding url pattern; it just highlights possible mistakes
	},
	// required: ["name", "author", "link"],
	/* anyOf: [
		{required: ["name"], prohibited: ["link"]},
		{required: ["author"], prohibited: ["link"]},
		{required: ["link"], prohibited: ["name", "author"]}
	], */
	/*allOf: [
		{
			if: {properties: {type: {enum: [SourceType.Speech]}}},
			then: {
				anyOf: [{required: ["name"]}, {required: ["author"]}],
				prohibited: ["link"],
			},
		},
		{
			if: {properties: {type: {enum: [SourceType.Text]}}},
			then: {
				anyOf: [{required: ["name"]}, {required: ["author"]}],
				prohibited: ["link"],
			},
		},
		{
			if: {properties: {type: {enum: [SourceType.Image]}}},
			then: {
				anyOf: [{required: ["location"]}, {required: ["author"]}],
				prohibited: ["link"],
			},
		},
		{
			if: {properties: {type: {enum: [SourceType.Video]}}},
			then: {
				anyOf: [{required: ["location"]}, {required: ["author"]}],
				prohibited: ["link"],
			},
		},
		{
			if: {properties: {type: {const: SourceType.Webpage}}},
			then: {
				required: ["link"],
				prohibited: ["name"],
			},
		},
	],*/
});

export function GetSourceNamePlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.speech) return "speech name";
	if (sourceType == SourceType.text) return "book/document name";
	if (sourceType == SourceType.image) return "image name";
	if (sourceType == SourceType.video) return "video name";
	// if (sourceType == SourceType.Webpage) return "(webpage name)";
	Assert(false);
}
export function GetSourceAuthorPlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.speech) return "speaker";
	if (sourceType == SourceType.text) return "book/document author";
	if (sourceType == SourceType.image) return `image author`;
	if (sourceType == SourceType.video) return "video author";
	if (sourceType == SourceType.webpage) return "webpage author";
	Assert(false);
}