import {SourceType, SourceChain, Source, Source_linkURLPattern, GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText} from "Store/firebase/nodeRevisions/@SourceChain";
import {BaseComponent, GetDOM, BaseComponentPlus} from "react-vextensions";
import {Button, Column, Row, TextInput, Select, Text} from "react-vcomponents";


import {GetErrorMessagesUnderElement, GetEntries, Clone, E, Range} from "js-vextensions";
import {Validate} from "vwebapp-framework";
import {ES} from "Utils/UI/GlobalStyles";
import {Image_urlPattern} from "Store/firebase/images/@Image";
import {Fragment} from "react";

export class SourceChainsEditorUI extends BaseComponentPlus(
	{enabled: true} as {baseData: SourceChain[], enabled?: boolean, style?, onChange?: (newData: SourceChain[])=>void},
	{newData: null as SourceChain[], selectedChainIndex: 0},
) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}

	render() {
		const {enabled, style, onChange} = this.props;
		const {newData, selectedChainIndex} = this.state;
		/* creator: !creating && GetUser(baseData.creator);
		variantNumber: !creating && GetTermVariantNumber(baseData); */

		const Change = (..._)=>{
			if (onChange) onChange(this.GetNewData());
			this.Update();
		};

		const splitAt = 100; // , width = 600;
		// const urlRegex = new RegExp('^https?://[^\\s/$.?#]+\\.[^\\s]+$');
		const selectedChain = newData[selectedChainIndex];
		return (
			<Column style={ES({flex: 1})}>
				<Row>
					<Text>Source chains:</Text>
					{/*<Select ml={5} displayType="button bar" options={Range(0, newData.length - 1).map(index=>`#${index + 1}`)} value={selectedSourceChainIndex} onChange={val=>this.SetState({selectedSourceChainIndex: val})}/>*/}
					{Range(0, newData.length - 1).map(chainIndex=>{
						return <Fragment key={chainIndex}>
							<Button ml={5} text={`#${chainIndex + 1}`}
								style={E(
									{padding: "3px 7px"},
									newData.length > 1 && {borderRadius: "5px 0 0 5px"},
									selectedChainIndex == chainIndex && {backgroundColor: "rgba(90, 100, 110, 0.9)"},
								)}
								onClick={()=>this.SetState({selectedChainIndex: chainIndex})}/>
							{newData.length > 1 &&
							<Button text="X"
								style={E(
									{padding: "3px 5px", borderRadius: "0 5px 5px 0"},
									selectedChainIndex == chainIndex && {backgroundColor: "rgba(90, 100, 110, 0.9)"},
								)}
								onClick={()=>{
									// if last chain, and we're also selected, update selection to be valid, then proceed with deletion
									if (chainIndex == newData.length - 1 && selectedChainIndex == chainIndex) {
										this.SetState({selectedChainIndex: chainIndex - 1}, ()=>{
											Change(newData.RemoveAt(chainIndex));
										});
									} else {
										Change(newData.RemoveAt(chainIndex));
									}
								}}/>}
						</Fragment>;
					})}
					{enabled && <Button ml={5} text="+" onClick={()=>Change(newData.push(new SourceChain([new Source()])))}/>}
				</Row>
				<Column mt={5}>
					{selectedChain.sources.map((source, sourceIndex)=>{
						return (
							<Row key={sourceIndex}>
								<Select enabled={enabled} options={GetEntries(SourceType)}
									value={source.type} onChange={val=>Change(source.type = val)}/>
								{source.type != SourceType.Webpage &&
									<TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceNamePlaceholderText(source.type)}
										value={source.name} onChange={val=>Change(val ? source.name = val : delete source.name)}/>}
								{source.type != SourceType.Webpage &&
									<TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceAuthorPlaceholderText(source.type)}
										value={source.author} onChange={val=>Change(val ? source.author = val : delete source.author)}/>}
								{source.type == SourceType.Webpage &&
									<TextInput enabled={enabled} type="url"
										// pattern="^(https?|ftp)://[^\\s/$.?#]+\\.[^\\s]+$" required style={ES({flex: 1})}
										pattern={Source_linkURLPattern} required style={ES({flex: 1})}
										value={source.link} onChange={val=>Change((()=>{
											if (!val) delete source.link;
											if (val.endsWith("@bible")) {
												const reference = val.replace("@bible", "").replace(/:/g, ".").replace(/ /g, "%20");
												val = `https://biblia.com/bible/nkjv/${reference}`;
												setTimeout(Change);
											} else if (val.endsWith("@quran")) {
												const reference = val.replace("Quran ", "").replace("@quran", "").replace(/:/g, "/").replace(/ /g, "%20");
												val = `http://www.quran.com/${reference}`;
												setTimeout(Change);
											}
											source.link = val;
										})())}/>}
								{sourceIndex != 0 && enabled && <Button text="X" ml={5} onClick={()=>Change(selectedChain.sources.RemoveAt(sourceIndex))}/>}
							</Row>
						);
					})}
					{enabled &&
						<Row>
							<Button text="Add source to this chain" mt={5} onClick={()=>Change(selectedChain.sources.push(new Source()))}/>
						</Row>}
				</Column>
			</Column>
		);
	}
	GetValidationError() {
		// return this.GetNewData().map(chain=>Validate("SourceChain", chain)).FirstOrX(a=>a) || GetErrorMessagesUnderElement(GetDOM(this))[0];
		let error = GetErrorMessagesUnderElement(GetDOM(this))[0];
		if (!error) {
			for (const chain of this.GetNewData()) {
				/* let error2 = Validate("SourceChain", chain);
				if (error2) return error; // for testing */
				if (Validate("SourceChain", chain)) {
					error = "Source chains are invalid. Please fill in the required entries.";
					// error = Validate("SourceChain", chain); // for testing
				}
			}
		}
		return error;
	}

	GetNewData() {
		const {newData} = this.state;
		return CleanUpdatedSourceChains(Clone(newData) as SourceChain[]);
	}
}

export function CleanUpdatedSourceChains(sourceChains: SourceChain[]) {
	// clean data
	for (const chain of sourceChains) {
		for (const source of chain.sources) {
			if (source.type == SourceType.Speech) {
				delete source.link;
			} else if (source.type == SourceType.Writing) {
				delete source.link;
			} else if (source.type == SourceType.Webpage) {
				delete source.name;
				delete source.author;
			}
		}
	}
	return sourceChains;
}