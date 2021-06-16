import {GetErrorMessagesUnderElement, Clone, CloneWithPrototypes} from "js-vextensions";
import {Column, Pre, Row} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {MarkdownEditor, MarkdownToolbar} from "react-vmarkdown";
import {SubPanel_Quote} from "../../NodeUI_Inner/SubPanel";
import {SourceChainsEditorUI, CleanUpdatedSourceChains} from "../../SourceChainsEditorUI";
import {QuoteAttachment} from "@debate-map/server-link/Source/Link";
import {GetNodeDisplayText} from "@debate-map/server-link/Source/Link";
import {MapNodeType} from "@debate-map/server-link/Source/Link";
import {ClaimForm} from "@debate-map/server-link/Source/Link";
import {MapNodeRevision} from "@debate-map/server-link/Source/Link";

// @ApplyBasicStyles
export class QuoteInfoEditorUI extends BaseComponent
		<{
			creating?: boolean, editing?: boolean, baseData: QuoteAttachment, showPreview: boolean, justShowed: boolean, onChange?: (newData: QuoteAttachment)=>void,
		},
		{newData: QuoteAttachment}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
		{ this.SetState({newData: CloneWithPrototypes(props.baseData)}); }
	}

	render() {
		const {creating, editing, showPreview, justShowed, onChange} = this.props;
		const {newData} = this.state;
		const Change = (..._)=>{
			if (onChange) { onChange(this.GetNewData()); }
			this.Update();
		};

		return (
			<Column>
				{showPreview &&
				<>
					<Row key={0}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Claim, current: {quote: CleanUpdatedQuoteAttachment(Clone(newData))}} as any, null, ClaimForm.Base)}
							<SubPanel_Quote attachment={newData} fontSize={15}/>
						</Pre>
					</Column>
				</>}
				<Column mt={showPreview ? 5 : 0}>
					<Pre>Quote text: </Pre>
					{/* <TextInput style={ES({flex: 1})}
						value={info.text} onChange={val=>Change(info.text = val)}/> */}
					{(creating || editing) && <MarkdownToolbar editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "italic", "quote"]}/>}
					<MarkdownEditor ref="editor" toolbar={false} value={newData.content} onChange={val=>Change(newData.content = val)} options={{
						scrollbarStyle: "overlay",
						lineWrapping: true,
						readOnly: !(creating || editing),
					}}/>
				</Column>
				<Row mt={5}>
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={creating || editing} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
		);
	}
	chainsEditor: SourceChainsEditorUI;
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0] || this.chainsEditor.GetValidationError();
	}

	GetNewData() {
		const {newData} = this.state;
		return CleanUpdatedQuoteAttachment(CloneWithPrototypes(newData));
	}
}

export function CleanUpdatedQuoteAttachment(attachment: QuoteAttachment) {
	CleanUpdatedSourceChains(attachment.sourceChains);
	return attachment;
}