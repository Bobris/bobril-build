// definition for Bobril defined class
export type IBobrilStyleDef = string;

﻿// define class for background with sprite usually you specify only first parameter and build system does rest
// { background: `url(${url})`, width: `${width||widthofurl}px`, height: `${height||heightofurl}px` }
export function sprite(url: string, color?: string, width?: number, height?: number, left?: number, top?: number): IBobrilStyleDef {
	return "fake";
}

