import * as React from 'react';
import $ from 'jquery';
import raf from 'raf';
import { Loader } from 'Component';
import { Document, Page, pdfjs } from 'react-pdf';
import { U } from 'Lib';
import 'react-pdf/dist/cjs/Page/AnnotationLayer.css';
import 'react-pdf/dist/cjs/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.useWorkerFetch = true;
pdfjs.GlobalWorkerOptions.workerSrc = 'workers/pdf.min.js';

interface Props {
	id: string;
	src: string;
	page: number;
	onDocumentLoad: (result: any) => void;
	onPageRender: () => void;
	onClick: (e: any) => void;
};

interface State {
	width: number;
};
	
class MediaPdf extends React.Component<Props, State> {

	_isMounted = false;
	node = null;
	state = {
		width: 0,
	};
	frame = 0;

	render () {
		const { width } = this.state;
		const { src, page, onDocumentLoad, onClick } = this.props;
		const options = { 
			isEvalSupported: false, 
			cMapUrl: U.Common.fixAsarPath('./cmaps/'),
		};

		return (
			<div ref={ref => this.node = ref}>
				<Document
					file={src}
					onLoadSuccess={onDocumentLoad}
					renderMode="canvas"
					loading={<Loader />}
					onClick={onClick}
					options={options}
				>
					<Page 
						pageNumber={page} 
						loading={<Loader />}
						width={width}
						onRenderSuccess={this.onPageRender}
					/>
				</Document>
			</div>
		);
	};

	componentDidMount(): void {
		this._isMounted = true;
		this.rebind();
		this.resize();
	};

	componentWillUnmount(): void {
		this._isMounted = false;
		this.unbind();

		raf.cancel(this.frame);
	};

	unbind () {
		$(window).off(`resize.pdf-${this.props.id}`);
	};

	rebind () {
		$(window).on(`resize.pdf-${this.props.id}`, () => this.resize());
	};

	resize () {
		if (this.frame) {
			raf.cancel(this.frame);
		};

		this.frame = raf(() => {
			if (this._isMounted) {
				this.setState({ width: $(this.node).width() });
			};
		});
	};

	onPageRender = () => {
		this.props.onPageRender();
		this.resize();
	};

};

export default MediaPdf;