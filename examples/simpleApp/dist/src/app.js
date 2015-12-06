define(["require", "exports", 'node_modules/bobril/index', './page'], function (require, exports, b, page_1) {
    b.routes(b.route({ handler: page_1.page }));
});
