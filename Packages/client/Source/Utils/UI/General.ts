import {MouseEventHandler, MouseEvent} from "react";
import katex from "katex";
import {VRect} from "web-vcore/nm/js-vextensions";

// expose katex on window, for use by $node.ts (in dm-server shared-code, when running on client)
G({katex});

// todo: probably remove, since outdated
export function StandardCompProps() {
	return ["dispatch", "_user", "_permissions", "_extraInfo"] as const;
}

export function MarkHandled(event: React.SyntheticEvent) {
	event.preventDefault();
	event.nativeEvent["handled"] = true;
}
export function IsHandled(event: React.SyntheticEvent | Event) {
	if (event["nativeEvent"]) {
		return !!event["nativeEvent"].handled;
	}
	return !!event["handled"];
}

export function IsMouseEnterReal(event: React.MouseEvent<MouseEvent>, dom: HTMLElement) {
	const {fromElement, toElement} = event.nativeEvent as any;
	if (fromElement == null || toElement == null) return true; // just assume true
	return !dom.contains(fromElement) && dom.contains(toElement);
}
export function IsMouseLeaveReal(event: React.MouseEvent<MouseEvent>, dom: HTMLElement) {
	const {fromElement, toElement} = event.nativeEvent as any;
	if (fromElement == null || toElement == null) return true; // just assume true
	return dom.contains(fromElement) && !dom.contains(toElement);
}