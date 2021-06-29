import {ToNumber} from "web-vcore/nm/js-vextensions.js";
import {Pre, Row, Spinner} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";
import {HasAdminPermissions} from "dm_common";
import {MeID} from "dm_common";

export class OthersPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newRevisionData, forNew, enabled, Change} = this.props;
		return (
			<>
				{/*<Row style={{fontWeight: "bold"}}>Others:</Row>*/}
				{HasAdminPermissions(MeID()) &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Font-size override: </Pre>
						<Spinner max={25} enabled={enabled} value={ToNumber(newRevisionData.displayDetails.fontSizeOverride, 0)} onChange={val=>Change(newRevisionData.displayDetails.fontSizeOverride = val != 0 ? val : null)}/>
						<Pre> px (0 for auto)</Pre>
					</Row>}
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Width override: </Pre>
					<Spinner step={10} max={1000} enabled={enabled} value={ToNumber(newRevisionData.displayDetails.widthOverride, 0)} onChange={val=>Change(newRevisionData.displayDetails.widthOverride = val != 0 ? val : null)}/>
					<Pre> px (0 for auto)</Pre>
				</Row>
			</>
		);
	}
}