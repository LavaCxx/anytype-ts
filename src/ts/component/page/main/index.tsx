import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RouteComponentProps } from 'react-router';
import { Icon, IconUser, ListIndex, Cover, Title, HeaderMainIndex as Header, FooterMainIndex as Footer } from 'ts/component';
import { observer, inject } from 'mobx-react';
import { dispatcher, I, Util} from 'ts/lib';

const $ = require('jquery');
const Constant: any = require('json/constant.json');

interface Props extends RouteComponentProps<any> {
	commonStore?: any;
	authStore?: any;
	blockStore?: any;
};

@inject('commonStore')
@inject('authStore')
@inject('blockStore')
@observer
class PageMainIndex extends React.Component<Props, {}> {
	
	listRef: any = null;

	constructor (props: any) {
		super(props);
		
		this.onSettings = this.onSettings.bind(this);
		this.onAccount = this.onAccount.bind(this);
		this.onProfile = this.onProfile.bind(this);
		this.onSelect = this.onSelect.bind(this);
		this.onAdd = this.onAdd.bind(this);
	};
	
	render () {
		const { commonStore, authStore } = this.props;
		const { account } = authStore;
		const { cover } = commonStore;
		
		if (!account) {
			return null;
		};
		
		return (
			<div>
				<Cover num={cover} />
				<Header />
				<Footer />
				
				<div id="body" className="wrapper">
					<div className="title">
						Hi, {account.name}
						<div className="rightMenu">
							<Icon className={'settings ' + (commonStore.popupIsOpen('settings') ? 'active' : '')} onClick={this.onSettings} />
							<Icon id="button-account" className={'profile ' + (commonStore.menuIsOpen('account') ? 'active' : '')} onClick={this.onAccount} />
							<IconUser {...account} onClick={this.onProfile} />
						</div>
					</div>
					
					<div id="documents"> 
						<ListIndex 
							ref={(ref) => { this.listRef = ref; }}
							onSelect={this.onSelect} 
							onAdd={this.onAdd}
							helperContainer={() => { return $('#documents').get(0); }} 
						/>
					</div>
				</div>
			</div>
		);
	};
	
	componentDidMount () {
		const { blockStore } = this.props;
		
		blockStore.blockClear();
		
		let items: I.Block[] = [
			{ id: 'testpage', type: I.BlockType.Page, fields: { icon: ':deciduous_tree:', name: 'Test page' }, content: {}, childrenIds: [], childBlocks: [] }
		];
		for (let i = 0; i < items.length; ++i) {
			items[i].id = items[i].id || String(i + 1);
			blockStore.blockAdd(items[i]);
		};
		
		dispatcher.call('blockOpen', { id: 'home' }, (errorCode: any, message: any) => {
		});
		
		this.resize();
	};
	
	componentWillUnmount () {
		dispatcher.call('blockClose', { id: 'home' }, (errorCode: any, message: any) => {
		});
	};
	
	onSettings (e: any) {
		const { commonStore } = this.props;
		commonStore.popupOpen('settings', {});
	};
	
	onAccount () {
		const { commonStore } = this.props;
		
		commonStore.menuOpen('account', { 
			element: 'button-account',
			offsetY: 4,
			light: true,
			vertical: I.MenuDirection.Bottom,
			horizontal: I.MenuDirection.Right
		});
	};
	
	onProfile (e: any) {
		const { commonStore } = this.props;
		commonStore.popupOpen('tree', {});
	};
	
	onSelect (e: any, id: string) {
		const { history } = this.props;
		history.push('/main/edit/' + id);
	};
	
	onAdd (e: any) {
		const { blockStore } = this.props;
		const node = $(ReactDOM.findDOMNode(this));
		const id = String(blockStore.blocks.length + 1);
		
		blockStore.blockAdd({
			id: id,
			type: I.BlockType.Page,
			fields: {
				name: 'Untitled',
				icon: Util.randomSmile(),
			},
			content: {},
			childrenIds: [],
			childBlocks: []
		});
		
		// TODO: move this code to callback on middleware command
		setTimeout(() => {
			const item = node.find('#documents #item-' + id);
			$('html, body').animate({ scrollTop: item.offset().top }, 150);
		});
	};
	
	resize () {
		let size = Constant.index.document;
		let win = $(window);
		let wh = win.height();
		let ww = win.width();
		let node = $(ReactDOM.findDOMNode(this));
		let body = node.find('#body');
		let documents = node.find('#documents');
		let cnt = Math.floor((ww -  size.margin * 2) / (size.width + size.margin));
		let width = cnt * (size.width + size.margin);
			
		body.css({ width: width - size.margin });
		documents.css({ marginTop: wh - 130 - (size.height * 2 + size.margin * 2) });
	};

};

export default PageMainIndex;