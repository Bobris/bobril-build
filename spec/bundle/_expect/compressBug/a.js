!function(){"use strict";function a(a){return"cssFloat"===a?"float":a.replace(c,"-$1").toLowerCase().replace(d,"-ms-")}function b(b){var c="";for(var d in b){var e=b[d];void 0!==e&&(c+=a(d)+":"+(""===e?'""':e)+";")}return c=c.slice(0,-1)}var c=/([A-Z])/g,d=/^ms-/;console.log(b({a:1,b:2}))}();