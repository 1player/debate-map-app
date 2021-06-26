import {Assert, E} from "web-vcore/nm/js-vextensions";
import {runInAction} from "web-vcore/nm/mobx";
import {Button, Column, Div, Pre, Row, Span, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus, UseEffect} from "web-vcore/nm/react-vextensions";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {ScrollView} from "web-vcore/nm/react-vscrollview";
import {store} from "Store";
import {GetSelectedTerm} from "Store/main/database";
import {ES} from "Utils/UI/GlobalStyles";
import {GetUpdates, Observer} from "web-vcore";
import {Term, TermType} from "dm_common";
import {MeID} from "dm_common";
import {GetTerms, GetFullNameP} from "dm_common";
import {GetUserPermissionGroups, IsUserCreatorOrMod, CanGetBasicPermissions} from "dm_common";
import {UpdateTerm} from "dm_common";
import {DeleteTerm} from "dm_common";
import {ShowAddTermDialog, TermDetailsUI} from "./Terms/TermDetailsUI";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel";

@Observer
export class TermsUI extends BaseComponentPlus({} as {}, {} as {selectedTerm_newData: Term, selectedTerm_newDataError: string}) {
	render() {
		const {selectedTerm_newData, selectedTerm_newDataError} = this.state;

		const userID = MeID();
		const terms = GetTerms();
		const selectedTerm = GetSelectedTerm();
		const permissions = GetUserPermissionGroups(userID);
		const creatorOrMod = selectedTerm != null && IsUserCreatorOrMod(userID, selectedTerm);

		// whenever selectedTerm changes, reset the derivative states (there's probably a better way to do this, but I don't know how yet)
		UseEffect(()=>{
			this.SetState({selectedTerm_newData: null, selectedTerm_newDataError: null});
		}, [selectedTerm]);

		if (terms == null) return <div>Loading terms...</div>;
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					// position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: "rgba(0,0,0,.5)", borderRadius: 10,
				}}>
					<Row center style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add term" enabled={CanGetBasicPermissions(MeID())} onClick={e=>{
								if (userID == null) return ShowSignInPopup();
								ShowAddTermDialog();
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Terms
						</Div>
					</Row>
					<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={e=>{
						if (e.target != e.currentTarget) return;
						runInAction("TermsUI.ScrollView.onClick", ()=>store.main.database.selectedTermID = null);
					}}>
						{terms.map((term, index)=><TermUI key={index} first={index == 0} term={term} selected={selectedTerm == term}/>)}
					</ScrollView>
				</Column>
				<ScrollView style={{
					// marginLeft: 10,
					// flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedTerm &&
								<Text style={{fontSize: 17, fontWeight: 500}}>
									{GetFullNameP(selectedTerm)}
								</Text>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedTerm_newData != null && selectedTerm_newDataError == null}
										onClick={async e=>{
											const updates = GetUpdates(selectedTerm, selectedTerm_newData);
											await new UpdateTerm({termID: selectedTerm.id, updates}).Run();
											// this.SetState({selectedTerm_newData: null});
										}}/>}
								{creatorOrMod &&
									<Button text="Delete term" ml={10} enabled={selectedTerm != null}
										onClick={async e=>{
											ShowMessageBox({
												title: `Delete "${GetFullNameP(selectedTerm)}"`, cancelButton: true,
												message: `Delete the term "${GetFullNameP(selectedTerm)}"?`,
												onOK: async()=>{
													await new DeleteTerm({termID: selectedTerm.id}).Run();
												},
											});
										}}/>}
							</Div>
						</Row>
						{selectedTerm
							? <TermDetailsUI baseData={selectedTerm} forNew={false} enabled={creatorOrMod} style={{padding: 10}}
								onChange={(data, error)=>this.SetState({selectedTerm_newData: data, selectedTerm_newDataError: error})}/>
							: <div style={{padding: 10}}>No term selected.</div>}
					</Column>
				</ScrollView>
			</Row>
		);
	}
}

export class TermUI extends BaseComponentPlus({} as {term: Term, first: boolean, selected: boolean}, {}) {
	render() {
		const {term, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
				style={E(
					{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
					selected && {background: "rgba(100,100,100,.7)"},
				)}
				onClick={e=>{
					runInAction("TermUI.onClick", ()=>store.main.database.selectedTermID = term.id);
				}}>
				<Pre>{GetFullNameP(term)}<sup>{term.id.substr(0, 2)}</sup>: </Pre>
				<Text>{term.definition}</Text>
				<Span ml="auto">
					<Pre style={{opacity: 0.7}}>({GetNiceNameForTermType(term.type)}) </Pre>
					<Pre>#{term.id}</Pre>
				</Span>
			</Row>
		);
	}
}

export function GetNiceNameForTermType(type: TermType) {
	//if (type == TermType.Verb) return "action/process";
	return TermType[type].replace(/.([A-Z])/g, m=>`${m[0]} ${m[1]}`).toLowerCase();
}