import { IMainState } from "../../../state/reducer";
import { PDFActions as PDFStateActions } from "./actions";
export type IPDFState = {
    zoomLevel: number;
    paginated: boolean;
    numPages: number;
    currentPage: number;
    mainState?: IMainState;
};
export declare const initialPDFState: IPDFState;
export type PDFStateReducer = (state: IPDFState, action: PDFStateActions) => IPDFState;
export declare const reducer: PDFStateReducer;
