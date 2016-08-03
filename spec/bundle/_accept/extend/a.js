!function() {
    "use strict";
    var __extends = function(d, b) {
        function __() {
            this.constructor = d;
        }
        for (var p in b) b.hasOwnProperty(p) && (d[p] = b[p]);
        d.prototype = null === b ? Object.create(b) : (__.prototype = b.prototype, new __());
    }, Base = function() {
        function Base_lib() {}
        return Base_lib.prototype.hello = function() {
            console.log("Base");
        }, Base_lib;
    }(), __export_Base = Base, Main = (function(_super) {
        __extends(Derived_lib, _super);
        function Derived_lib() {
            _super.apply(this, arguments);
        }
        return Derived_lib.prototype.hello = function() {
            console.log("Derived");
        }, Derived_lib;
    }(Base), function(_super) {
        __extends(Main_main, _super);
        function Main_main() {
            _super.apply(this, arguments);
        }
        return Main_main.prototype.hello = function() {
            console.log("Main");
        }, Main_main;
    }(__export_Base));
    new Main().hello();
}();