import * as React from 'react';
import $ from 'jquery';
import { I, S, U, J } from 'Lib';
import { observer } from 'mobx-react';

interface Props {
	id: string;
	type: any;
	color: string;
	className?: string;
	readonly?: boolean;
	active: boolean;
	onClick?(): void;
};

const Icons = {
	checkbox: {
		0:		 require('img/icon/marker/checkbox0.svg').default,
		1:		 require('img/icon/marker/checkbox1.svg').default,
		2:		 require('img/icon/marker/checkbox2.svg').default,
	},
	task: {
		0:		 require('img/icon/object/checkbox0.svg').default,
		1:		 require('img/icon/object/checkbox1.svg').default,
		2:		 require('img/icon/object/checkbox2.svg').default,
	},
	toggle:		 require('img/icon/marker/toggle.svg').default,
};

const Theme = {
	dark: {
		toggle:		 require('img/theme/dark/icon/marker/toggle.svg').default,
		checkbox: {
			0:		 require('img/icon/marker/checkbox0.svg').default,
			1:		 require('img/theme/dark/icon/marker/checkbox1.svg').default,
			2:		 require('img/icon/marker/checkbox2.svg').default,
		},
		task: {
			0:		 require('img/icon/object/checkbox0.svg').default,
			1:		 require('img/theme/dark/icon/object/checkbox1.svg').default,
			2:		 require('img/icon/object/checkbox2.svg').default,
		},
	},
};

const Marker = observer(class Marker extends React.Component<Props> {

	public static defaultProps = {
		color: 'default',
	};
	node = null;

	constructor (props: Props) {
		super(props);

		this.onCheckboxEnter = this.onCheckboxEnter.bind(this);
		this.onCheckboxLeave = this.onCheckboxLeave.bind(this);
	};

	render () {
		const { id, type, color, className, active, onClick } = this.props;
		const { theme } = S.Common;
		const cn = [ 'marker' ];
		const ci = [ 'markerInner', 'c' + type ];

		let inner: any = null;
		
		if (className) {
			cn.push(className);
		};
		if (active) {
			cn.push('active');
		};
		
		if (color) {
			ci.push('textColor textColor-' + color);
		};

		switch (type) {
			case I.TextStyle.Bulleted: {
				inner = <span className={ci.join(' ')} />;
				break;
			};
				
			case I.TextStyle.Numbered: {
				inner = <span id={`marker-${id}`} className={ci.join(' ')} />;
				break;
			};
				
			case I.TextStyle.Checkbox: {
				inner = (
					<img 
						src={this.getCheckbox(active ? 2 : 0)} 
						onDragStart={e => e.preventDefault()} 
						onMouseEnter={this.onCheckboxEnter} 
						onMouseLeave={this.onCheckboxLeave} 
					/>
				);
				break;
			};

			case 'checkboxTask': {
				inner = (
					<img 
						src={this.getTask(active ? 2 : 0)} 
						onDragStart={e => e.preventDefault()} 
						onMouseEnter={this.onCheckboxEnter} 
						onMouseLeave={this.onCheckboxLeave} 
					/>
				);
				break;
			};
			
			case I.TextStyle.Toggle: {
				inner = <img src={this.getToggle()} onDragStart={e => e.preventDefault()} />;
				break;
			};
		};
		
		return (
			<div 
				ref={ref => this.node = ref} 
				className={cn.join(' ')} 
				onClick={onClick}
			>
				{inner}
			</div>
		);
	};

	onCheckboxEnter () {
		const { active, readonly } = this.props;
		const fn = U.Common.toCamelCase(`get-${this.getIconKey()}`);

		if (!active && this[fn] && !readonly) {
			$(this.node).find('img').attr({ src: this[fn](1) });
		};
	};

	onCheckboxLeave () {
		const { active, readonly } = this.props;
		const fn = U.Common.toCamelCase(`get-${this.getIconKey()}`);

		if (!active && this[fn] && !readonly) {
			$(this.node).find('img').attr({ src: this[fn](0) });
		};
	};

	getIconKey () {
		const { type } = this.props;

		let key = '';
		switch (type) {
			case I.TextStyle.Checkbox: key = 'checkbox'; break;
			case 'checkboxTask': key = 'task'; break;
		};
		return key;
	};

	getIcon (type: string) {
		const cn = S.Common.getThemeClass();
		const item = Theme[cn];

		return (item && item[type]) ? item[type] : Icons[type];
	};

	getCheckbox (state: number) {
		return this.getIcon('checkbox')[state];
	};

	getTask (state: number) {
		return this.getIcon('task')[state];
	};

	getToggle () {
		return this.getIcon('toggle');
	};

});

export default Marker;