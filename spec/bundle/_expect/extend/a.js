!function() {
    "use strict";
    var __extendStatics = Object.setPrototypeOf || {
        __proto__: []
    } instanceof Array && function(d, b) {
        d.__proto__ = b;
    } || function(d, b) {
        for (var p in b) b.hasOwnProperty(p) && (d[p] = b[p]);
    }, __extends = function(d, b) {
        __extendStatics(d, b);
        function __() {
            this.constructor = d;
        }
        d.prototype = null === b ? Object.create(b) : (__.prototype = b.prototype, new __());
    }, Base = (Object.assign, function() {
        function Base_lib() {}
        return Base_lib.prototype.hello = function() {
            console.log("Base");
        }, Base_lib;
    }()), __export_Base = Base;
    !function(_super) {
        __extends(Derived_lib, _super);
        function Derived_lib() {
            return null !== _super && _super.apply(this, arguments) || this;
        }
        Derived_lib.prototype.hello = function() {
            console.log("Derived");
        }, Derived_lib;
    }(Base);
    new (function(_super) {
        __extends(Main_main, _super);
        function Main_main() {
            return null !== _super && _super.apply(this, arguments) || this;
        }
        return Main_main.prototype.hello = function() {
            console.log("Main");
        }, Main_main;
    }(__export_Base))().hello();
}();