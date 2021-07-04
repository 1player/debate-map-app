import Moment from "web-vcore/nm/moment";
import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {UUIDStub} from "UI/@Shared/UUIDStub.js";
import {ES, Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {Map, MapNodeL3, GetUser, MapNodeRevision, GetParentNodeL3, GetLinkUnderParent, GetNodeRevisions} from "dm_common";


import {NodeDetailsUI} from "../../NodeDetailsUI.js";

export const columnWidths = [0.15, 0.3, 0.35, 0.2];

@Observer
export class HistoryPanel extends BaseComponentPlus({} as {show: boolean, map?: Map, node: MapNodeL3, path: string}, {}) {
	detailsUI: NodeDetailsUI;
	render() {
		const {show, map, node, path} = this.props;
		// let mapID = map ? map._id : null;

		// _link: GetLinkUnderParent(node._id, GetParentNode(path)),
		const creator = GetUser(node.creator);
		let revisions = GetNodeRevisions(node.id);
		// we want the newest ones listed first
		revisions = revisions.OrderByDescending(a=>a.createdAt);

		// const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		return (
			<Column style={{position: "relative", maxHeight: 300, display: show ? "flex" : "none"}}>
				<Column className="clickThrough" style={{background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
					<Row style={{padding: "4px 7px"}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>ID</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Date</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>User</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Actions</span>
					</Row>
				</Column>
				<ScrollView className="selectable" style={ES({flex: 1})} contentStyle={ES({flex: 1, position: "relative"})}>
					{revisions.map((revision, index)=>{
						return <RevisionEntryUI key={revision.id} index={index} last={index == revisions.length - 1} revision={revision} node={node} path={path}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}

type RevisionEntryUI_Props = {index: number, last: boolean, revision: MapNodeRevision, node: MapNodeL3, path: string};
@Observer
class RevisionEntryUI extends BaseComponentPlus({} as RevisionEntryUI_Props, {}) {
	render() {
		const {index, last, revision, node, path} = this.props;
		const parent = GetParentNodeL3.NN(path);
		const creator = GetUser(revision.creator);
		const link = GetLinkUnderParent.NN(node.id, parent);

		return (
			<Row p="4px 7px" style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"},
			)}>
				<span style={{flex: columnWidths[0]}}>
					<UUIDStub id={revision.id}/>
				</span>
				<span style={{flex: columnWidths[1]}}>{Moment(revision.createdAt).format("YYYY-MM-DD HH:mm:ss")}</span>
				<span style={{flex: columnWidths[2]}}>{creator ? creator.displayName : "n/a"}</span>
				<span style={{flex: columnWidths[3]}}>
					<Button text="V" title="View details" style={{margin: "-2px 0", padding: "1px 3px"}} onClick={()=>{
						const boxController = ShowMessageBox({
							title: `Details for revision #${revision.id}`, cancelOnOverlayClick: true,
							message: ()=>{
								return (
									<div style={{minWidth: 500}}>
										<NodeDetailsUI
											baseData={node} baseRevisionData={revision} baseLinkData={link} parent={parent}
											forNew={false} forOldRevision={true} enabled={false}/>
									</div>
								);
							},
						});
					}}/>
				</span>
			</Row>
		);
	}
}