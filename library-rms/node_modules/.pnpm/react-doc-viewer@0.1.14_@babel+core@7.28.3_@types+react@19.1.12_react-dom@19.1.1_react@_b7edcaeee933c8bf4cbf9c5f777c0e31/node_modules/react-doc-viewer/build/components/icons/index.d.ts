import React from "react";
export interface IIconProps {
    color?: string;
    size?: string | number | (string & {}) | undefined;
    reverse?: boolean;
}
export declare const PrevDocIcon: (props: IIconProps) => React.JSX.Element;
export declare const NextDocIcon: (props: IIconProps) => React.JSX.Element;
export declare const LoadingIcon: (props: IIconProps) => React.JSX.Element;
