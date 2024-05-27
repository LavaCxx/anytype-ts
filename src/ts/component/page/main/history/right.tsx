import * as React from 'react';
import $ from 'jquery';
import sha1 from 'sha1';
import { observer } from 'mobx-react';
import { Icon, IconObject, ObjectName, Button } from 'Component';
import { detailStore, commonStore } from 'Store';
import { I, C, UtilCommon, UtilObject, UtilDate, UtilSpace, translate, analytics, dispatcher } from 'Lib';

interface Props {
	rootId: string;
	renderDiff: (previousId: string, events: any[]) => void;
	setVersion: (version: I.HistoryVersion) => void;
};

interface State {
	versions: I.HistoryVersion[];
	version: I.HistoryVersion;
	isLoading: boolean;
};

const LIMIT_RECORDS = 300;
const LIMIT_AUTHORS = 5;

const HistoryRight = observer(class HistoryRight extends React.Component<Props, State> {

	node = null;
	refScroll = null;
	state = {
		versions: [] as I.HistoryVersion[],
		version: null,
		isLoading: false,
	};
	top = 0;
	lastId = '';

	constructor (props: Props) {
		super(props);

		this.onCurrent = this.onCurrent.bind(this);
		this.onRestore = this.onRestore.bind(this);
		this.onClose = this.onClose.bind(this);
		this.onScroll = this.onScroll.bind(this);
	};

	render () {
		const groups = this.groupData();
		const year = UtilDate.date('Y', UtilDate.now());
		const canWrite = UtilSpace.canMyParticipantWrite();
		const showButtons = this.showButtons();

		const Section = (item: any) => {
			const y = UtilDate.date('Y', item.time);
			const format = y == year ? 'M d' : 'M d, Y';
			const day = UtilDate.dayString(item.time);
			const date = day ? day : UtilDate.date(format, item.time);
			const authors = UtilCommon.arrayUnique(item.list.map(it => it.authorId)).slice(0, LIMIT_AUTHORS);

			return (
				<div id={`section-${item.hash}`} className="section">
					<div className="head" onClick={e => this.toggleSection(e, item.hash)}>
						<div className="date">{date}</div>
						<div className="authors">
							{authors.map((id: string, i: number) => (
								<IconObject 
									key={id} 
									object={UtilSpace.getParticipant(id)} 
									size={18} 
									style={{ zIndex: (LIMIT_AUTHORS - i) }} 
								/>
							))}
						</div>
						<Icon className="arrow" />
					</div>
					<div className="items">
						{item.list.map((item: any, i: number) => (
							<Item key={item.id} {...item} />
						))}
					</div>
				</div>
			);
		};

		const Child = (item: any) => {
			const withChildren = item.list && item.list.length;

			let icon = null;
			if (withChildren) {
				icon = <Icon className="arrow" onClick={e => this.onArrow(e, item.id)} />;
			} else {
				icon = <Icon className="blank" />;
			};

			return (
				<div id={`item-${item.id}`} className="child">
					<div className="info" onClick={e => this.loadVersion(item.id)}>
						{icon}
						<div className="date">{UtilDate.date('g:i A', item.time)}</div>
					</div>

					{withChildren ? (
						<div id={`children-${item.id}`} className="children">
							{item.list.map((child: any, i: number) => <Child key={`${item.id}-${child.id}`} {...child} />)}
						</div>
					) : ''}
				</div>
			);
		};

		const Item = (item: any) => {
			const withChildren = item.list && item.list.length;
			const author = UtilSpace.getParticipant(item.authorId);

			return (
				<div 
					id={`item-${item.id}`} 
					className="item" 
				>
					<div className="info" onClick={e => this.loadVersion(item.id)}>
						<div className="date">{UtilDate.date('g:i A', item.time)}</div>

						{author ? (
							<div className="author">
								<IconObject object={author} size={16} />
								<ObjectName object={author} />
							</div>
						) : ''}
					</div>

					{withChildren ? (
						<div id={`children-${item.id}`} className="children">
							{item.list.map((child: any, i: number) => <Child key={`${item.id}-${child.id}`} {...child} />)}
						</div>
					) : ''}
				</div>
			);
		};
		
		return (
			<div 
				ref={ref => this.node = ref} 
				id="historySideRight" 
				className={showButtons ? 'withButtons' : ''}
			>
				<div className="head">
					<div className="name">{translate('commonVersionHistory')}</div>
					<Icon className="close" onClick={this.onClose} />
				</div>

				<div 
					ref={ref => this.refScroll = ref} 
					className="scroll" 
					onScroll={this.onScroll}
				>
					<div className="section" onClick={this.onCurrent}>
						<div className="head">
							<div className="name">{translate('pageMainHistoryCurrent')}</div>
						</div>
					</div>

					{groups.map((item: any, i: number) => (
						<Section key={i} {...item} />
					))}
				</div>

				{showButtons ? (
					<div className="buttons">
						<Button text={translate('commonCancel')} onClick={this.onClose} />
						<Button text={translate('pageMainHistoryRestore')} className={!canWrite ? 'disabled' : ''} onClick={this.onRestore} />
					</div>
				) : ''}
			</div>
		);
	};

	componentDidMount () {
		this.loadList('');
	};

	componentDidUpdate () {
		this.init();
	};
	
	onClose () {
		const { rootId } = this.props;

		UtilObject.openAuto(detailStore.get(rootId, rootId, []));
	};

	onCurrent () {
		const { versions } = this.state;

		if (versions.length) {
			this.loadVersion(versions[0].id);
		};
	};

	onRestore (e: any) {
		e.persist();

		const canWrite = UtilSpace.canMyParticipantWrite();
		if (!canWrite) {
			return;
		};

		const { version } = this.state;
		const { rootId } = this.props;
		const object = detailStore.get(rootId, rootId, []);

		if (!version) {
			return;
		};

		C.HistorySetVersion(rootId, version.id, () => {
			UtilObject.openEvent(e, object);
			analytics.event('RestoreFromHistory');
		});
	};

	init () {
		const { version } = this.state;
		if (!version) {
			return;
		};

		const { id, time }  = version;
		const groups = this.groupData();
		const unwrapped = this.unwrapGroups('', groups);
		const node = $(this.node);
		const groupId = this.getGroupId(time);
		const hash = sha1(groupId);
		const item = node.find(`#item-${id}`);
		const section = node.find(`#section-${hash}`);
		const scroll = $(this.refScroll);
		const group = unwrapped.find(it => it.id == id);

		if (!group) {
			return;
		};

		const parent = unwrapped.find(it => it.id == group.parentId);
		if (!parent) {
			return;
		};

		let children = null; 
		if (group.isTimeGroup) {
			children = node.find(`#children-${group.id}`);
		} else {
			children = node.find(`#children-${parent.id}`);
		};

		section.addClass('isExpanded');
		section.find('.items').show();

		node.find('.active').removeClass('active');
		item.addClass('active');

		if (children.length) {
			item.addClass('isExpanded');
			children.show();
		};

		scroll.scrollTop(this.top);
	};

	toggleSection (e: any, id: string) {
		e.stopPropagation();

		const node = $(this.node);;
		const section = node.find(`#section-${id}`);

		this.toggleChildren(section, section.find('.items'));
	};

	onArrow (e: any, id: string) {
		e.stopPropagation();

		const node = $(this.node);

		this.toggleChildren(node.find(`#item-${id}`), node.find(`#children-${id}`));
	};

	onScroll () {
		const { versions } = this.state;
		const lastId = versions[versions.length - 1].id;
		const scroll = $(this.refScroll);
		const height = scroll.get(0).scrollHeight;

		this.top = scroll.scrollTop();

		if ((this.lastId != lastId) && (this.top >= height - scroll.height() - 12)) {
			this.loadList(lastId);
		};
	};

	toggleChildren (item: any, children: any) {
		const isActive = item.hasClass('isExpanded');

		let height = 0;
		if (isActive) {
			item.removeClass('isExpanded');

			children.css({ overflow: 'visible', height: 'auto' });
			height = children.height();
			children.css({ overflow: 'hidden', height: height });

			window.setTimeout(() => children.css({ height: 0 }), 15);
			window.setTimeout(() => children.hide(), 215);
		} else {
			item.addClass('isExpanded');

			children.show();
			children.css({ overflow: 'visible', height: 'auto' });
			height = children.height();

			children.css({ overflow: 'hidden', height: 0 });
			window.setTimeout(() => children.css({ height: height }), 15);
			window.setTimeout(() => children.css({ overflow: 'visible', height: 'auto' }), 215);
		};
	};

	loadList (lastId: string) { 
		const { versions, version, isLoading } = this.state;
		const { rootId } = this.props;
		const object = detailStore.get(rootId, rootId);
		
		if (isLoading || (this.lastId && (lastId == this.lastId))) {
			return;
		};

		this.setState({ isLoading: true });
		this.lastId = lastId;

		C.HistoryGetVersions(rootId, lastId, LIMIT_RECORDS, (message: any) => {
			this.setState({ isLoading: false });

			if (message.error.code) {
				UtilObject.openRoute({ id: rootId, layout: object.layout });
				return;
			};

			const list = UtilCommon.arrayUniqueObjects(versions.concat(message.versions || []), 'id');

			this.setState({ versions: list });

			if (!version && list.length) {
				this.loadVersion(list[0].id);
			};
		});
	};

	loadVersion (id: string) {
		const { rootId, setVersion } = this.props;

		C.HistoryShowVersion(rootId, id, (message: any) => {
			if (!UtilCommon.checkErrorOnOpen(rootId, message.error.code, this)) {
				return;
			};

			if (!message.error.code) {
				dispatcher.onObjectView(rootId, '', message.objectView);
				setVersion(message.version);
			};

			this.setState({ version: message.version }, () => {
				this.loadDiff(id);
			});

			$(window).trigger('resize');
		});
	};

	loadDiff (id: string) {
		const { rootId, renderDiff } = this.props;
		const previousId = this.getPreviousVersionId(id);

		C.HistoryDiffVersions(rootId, commonStore.space, id, previousId, (message: any) => {
			const { events } = message;

			C.HistoryShowVersion(rootId, previousId, (message: any) => {
				if (!message.error.code) {
					dispatcher.onObjectView(rootId, previousId, message.objectView);
				};

				renderDiff(previousId, events);
				commonStore.diffSet(events);
			});
		});
	};

	getPreviousVersionId (id: string): string {
		const { versions } = this.state;

		if (!versions.length) {
			return '';
		};

		const idx = versions.findIndex(it => it.id == id);

		if (idx >= (versions.length - 1)) {
			return '';
		};

		const prev = versions[idx + 1];
		return prev ? prev.id : '';
	};
	
	groupData () {
		const groups: any[] = [];
		const groupByAuthor = [];
		const versions = this.state.versions || [];
		const timeFormat = 'd.m.Y H';

		let id = '';

		for (let i = 0; i < versions.length; i++) {
			const version = versions[i] as any;
			const prev = versions[i - 1];
			const cid = this.getGroupId(version.time);

			let add = true;

			if (prev) {
				const pid = this.getGroupId(prev.time);

				if ((cid == pid) && (version.authorId == prev.authorId)) {
					const item = groupByAuthor.find(it => it.id == id);
					if (item) {
						item.list = (item.list || []).concat(version);
						add = false;
					};
				};
			};

			if (add) {
				groupByAuthor.push({ ...version, list: [] });
				id = version.id;
			};
		};

		for (const version of groupByAuthor) {
			const list = version.list || [];
			const out = [];

			for (let i = 0; i < list.length; i++) {
				const current = list[i] as any;
				const timeGroupId = UtilDate.date(timeFormat, current.time);
				const group = out.find(it => it.timeGroupId == timeGroupId);

				if (group) {
					group.list.push(current);
				} else {
					out.push({ timeGroupId, ...current, list: [], isTimeGroup: true });
				};
			};

			version.list = out;
		};

		for (const version of groupByAuthor) {
			const id = this.getGroupId(version.time);
			const group = groups.find(it => it.id == id);

			if (group) {
				group.list.push(version);
			} else {
				groups.push({ id, list: [ version ], time: version.time, hash: sha1(id) });
			};
		};

		return groups;
	};

	unwrapGroups (parentId: string, groups: any[]) {
		let out = [];

		for (const group of groups) {
			const list = group.list;

			out.push({ ...group, parentId });
			if (list && (list.length > 0)) {
				out = out.concat(this.unwrapGroups(group.id, list));
			};

			delete(group.list);
		};

		return out;
	};

	getGroupId (time: number) {
		return UtilDate.date('M d, Y', time);
	};

	showButtons (): boolean {
		const { version, versions } = this.state;

		if (!version || !versions.length) {
			return false;
		};

		return version.id != versions[0].id;
	};

});

export default HistoryRight;