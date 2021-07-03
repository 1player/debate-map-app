import {GetErrorMessagesUnderElement, Clone, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {Column, Pre, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {MarkdownEditor, MarkdownToolbar} from "web-vcore/nm/react-vmarkdown.js";
import {SubPanel_Quote} from "../../NodeUI_Inner/SubPanel.js";
import {SourceChainsEditorUI, CleanUpdatedSourceChains} from "../../SourceChainsEditorUI.js";
import {QuoteAttachment} from "dm_common";
import {GetNodeDisplayText} from "dm_common";
import {MapNodeType} from "dm_common";
import {ClaimForm} from "dm_common";
import {MapNodeRevision} from "dm_common";

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
							{GetNodeDisplayText({type: MapNodeType.claim, current: {quote: CleanUpdatedQuoteAttachment(Clone(newData))}} as any, undefined, ClaimForm.base)}
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
	chainsEditor: SourceChainsEditorUI|n;
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0] ?? this.chainsEditor?.GetValidationError();
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