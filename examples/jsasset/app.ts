import * as b from "bobril";

b.asset("global.js");

declare var GL: number;

b.init(()=>{
	return "Number from global js is "+GL;
});