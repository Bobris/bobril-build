(function() {
    var __export_now;;
    var __export_invalidate;;
    var __export_asap;;
    var __export_ignoreClick;;
    var __export_getDnds;;
    if (typeof DEBUG === "undefined") DEBUG = true;
    function assert(shoudBeTrue, messageIfFalse) {
        if (DEBUG && !shoudBeTrue) throw Error(messageIfFalse || "assertion failed");
    }
    var isArray = Array.isArray;
    function createTextNode(content) {
        return document.createTextNode(content);
    }
    function createElement(name) {
        return document.createElement(name);
    }
    var hasTextContent = "textContent" in createTextNode("");
    function isObject(value) {
        return typeof value === "object";
    }
    function flatten(a) {
        if (!isArray(a)) {
            if (a == null || a === false || a === true) return [];
            return [ a ];
        }
        a = a.slice(0);
        var alen = a.length;
        for (var i_1 = 0; i_1 < alen; ) {
            var item = a[i_1];
            if (isArray(item)) {
                a.splice.apply(a, [ i_1, 1 ].concat(item));
                alen = a.length;
                continue;
            }
            if (item == null || item === false || item === true) {
                a.splice(i_1, 1);
                alen--;
                continue;
            }
            i_1++;
        }
        return a;
    }
    var inSvg = false;
    var updateCall = [];
    var updateInstance = [];
    var setValueCallback = function(el, node, newValue, oldValue) {
        if (newValue !== oldValue) el["value"] = newValue;
    };
    function setSetValue(callback) {
        var prev = setValueCallback;
        setValueCallback = callback;
        return prev;
    }
    function newHashObj() {
        return Object.create(null);
    }
    var vendors = [ "Webkit", "Moz", "ms", "O" ];
    var testingDivStyle = document.createElement("div").style;
    function testPropExistence(name) {
        return typeof testingDivStyle[name] === "string";
    }
    var mapping = newHashObj();
    var isUnitlessNumber = {
        boxFlex: true,
        boxFlexGroup: true,
        columnCount: true,
        flex: true,
        flexGrow: true,
        flexNegative: true,
        flexPositive: true,
        flexShrink: true,
        fontWeight: true,
        lineClamp: true,
        lineHeight: true,
        opacity: true,
        order: true,
        orphans: true,
        strokeDashoffset: true,
        widows: true,
        zIndex: true,
        zoom: true
    };
    function renamer(newName) {
        return function(style, value, oldName) {
            style[newName] = value;
            style[oldName] = undefined;
        };
    }
    function renamerpx(newName) {
        return function(style, value, oldName) {
            if (typeof value === "number") {
                style[newName] = value + "px";
            } else {
                style[newName] = value;
            }
            style[oldName] = undefined;
        };
    }
    function pxadder(style, value, name) {
        if (typeof value === "number") style[name] = value + "px";
    }
    function ieVersion() {
        return document.documentMode;
    }
    function shimStyle(newValue) {
        var k = Object.keys(newValue);
        for (var i = 0, l = k.length; i < l; i++) {
            var ki = k[i];
            var mi = mapping[ki];
            var vi = newValue[ki];
            if (vi === undefined) continue;
            if (mi === undefined) {
                if (DEBUG) {
                    if (ki === "float" && window.console && console.error) console.error("In style instead of 'float' you have to use 'cssFloat'");
                    if (/-/.test(ki) && window.console && console.warn) console.warn("Style property " + ki + " contains dash (must use JS props instead of css names)");
                }
                if (testPropExistence(ki)) {
                    mi = isUnitlessNumber[ki] === true ? null : pxadder;
                } else {
                    var titleCaseKi = ki.replace(/^\w/, function(match) {
                        return match.toUpperCase();
                    });
                    for (var j = 0; j < vendors.length; j++) {
                        if (testPropExistence(vendors[j] + titleCaseKi)) {
                            mi = (isUnitlessNumber[ki] === true ? renamer : renamerpx)(vendors[j] + titleCaseKi);
                            break;
                        }
                    }
                    if (mi === undefined) {
                        mi = isUnitlessNumber[ki] === true ? null : pxadder;
                        if (DEBUG && window.console && console.warn) console.warn("Style property " + ki + " is not supported in this browser");
                    }
                }
                mapping[ki] = mi;
            }
            if (mi !== null) mi(newValue, vi, ki);
        }
    }
    function removeProperty(s, name) {
        s[name] = "";
    }
    function updateStyle(n, el, newStyle, oldStyle) {
        var s = el.style;
        if (isObject(newStyle)) {
            shimStyle(newStyle);
            var rule;
            if (isObject(oldStyle)) {
                for (rule in oldStyle) {
                    if (!(rule in newStyle)) removeProperty(s, rule);
                }
                for (rule in newStyle) {
                    var v = newStyle[rule];
                    if (v !== undefined) {
                        if (oldStyle[rule] !== v) s[rule] = v;
                    } else {
                        removeProperty(s, rule);
                    }
                }
            } else {
                if (oldStyle) s.cssText = "";
                for (rule in newStyle) {
                    var v = newStyle[rule];
                    if (v !== undefined) s[rule] = v;
                }
            }
        } else if (newStyle) {
            s.cssText = newStyle;
        } else {
            if (isObject(oldStyle)) {
                for (rule in oldStyle) {
                    removeProperty(s, rule);
                }
            } else if (oldStyle) {
                s.cssText = "";
            }
        }
    }
    function setClassName(el, className) {
        if (inSvg) el.setAttribute("class", className); else el.className = className;
    }
    function updateElement(n, el, newAttrs, oldAttrs) {
        var attrName, newAttr, oldAttr, valueOldAttr, valueNewAttr;
        for (attrName in newAttrs) {
            newAttr = newAttrs[attrName];
            oldAttr = oldAttrs[attrName];
            if (attrName === "value" && !inSvg) {
                valueOldAttr = oldAttr;
                valueNewAttr = newAttr;
                oldAttrs[attrName] = newAttr;
                continue;
            }
            if (oldAttr !== newAttr) {
                oldAttrs[attrName] = newAttr;
                if (inSvg) {
                    if (attrName === "href") el.setAttributeNS("http://www.w3.org/1999/xlink", "href", newAttr); else el.setAttribute(attrName, newAttr);
                } else if (attrName in el && !(attrName === "list" || attrName === "form")) {
                    el[attrName] = newAttr;
                } else el.setAttribute(attrName, newAttr);
            }
        }
        for (attrName in oldAttrs) {
            if (oldAttrs[attrName] !== undefined && !(attrName in newAttrs)) {
                oldAttrs[attrName] = undefined;
                el.removeAttribute(attrName);
            }
        }
        if (valueNewAttr !== undefined) {
            setValueCallback(el, n, valueNewAttr, valueOldAttr);
        }
        return oldAttrs;
    }
    function pushInitCallback(c, aupdate) {
        var cc = c.component;
        if (cc) {
            if (cc[aupdate ? "postUpdateDom" : "postInitDom"]) {
                updateCall.push(aupdate);
                updateInstance.push(c);
            }
        }
    }
    function findCfg(parent) {
        var cfg;
        while (parent) {
            cfg = parent.cfg;
            if (cfg !== undefined) break;
            if (parent.ctx) {
                cfg = parent.ctx.cfg;
                break;
            }
            parent = parent.parent;
        }
        return cfg;
    }
    function setRef(ref, value) {
        if (ref == null) return;
        if (typeof ref === "function") {
            ref(value);
            return;
        }
        var ctx = ref[0];
        var refs = ctx.refs;
        if (!refs) {
            refs = newHashObj();
            ctx.refs = refs;
        }
        refs[ref[1]] = value;
    }
    function createNode(n, parentNode, createInto, createBefore) {
        var c = {
            tag: n.tag,
            key: n.key,
            ref: n.ref,
            className: n.className,
            style: n.style,
            attrs: n.attrs,
            children: n.children,
            component: n.component,
            data: n.data,
            cfg: n.cfg,
            parent: parentNode,
            element: undefined,
            ctx: undefined
        };
        var backupInSvg = inSvg;
        var component = c.component;
        var el;
        setRef(c.ref, c);
        if (component) {
            var ctx = {
                data: c.data || {},
                me: c,
                cfg: findCfg(parentNode)
            };
            c.ctx = ctx;
            if (component.init) {
                component.init(ctx, c);
            }
            if (component.render) {
                component.render(ctx, c);
            }
        }
        var tag = c.tag;
        var children = c.children;
        if (tag === undefined) {
            if (typeof children === "string") {
                el = createTextNode(children);
                c.element = el;
                createInto.insertBefore(el, createBefore);
            } else {
                createChildren(c, createInto, createBefore);
            }
            if (component) {
                if (component.postRender) {
                    component.postRender(c.ctx, c);
                }
                pushInitCallback(c, false);
            }
            return c;
        } else if (tag === "/") {
            var htmltext = children;
            if (htmltext === "") {} else if (createBefore == null) {
                var before = createInto.lastChild;
                createInto.insertAdjacentHTML("beforeend", htmltext);
                c.element = [];
                if (before) {
                    before = before.nextSibling;
                } else {
                    before = createInto.firstChild;
                }
                while (before) {
                    c.element.push(before);
                    before = before.nextSibling;
                }
            } else {
                el = createBefore;
                var elprev = createBefore.previousSibling;
                var removeEl = false;
                var parent = createInto;
                if (!el.insertAdjacentHTML) {
                    el = parent.insertBefore(createElement("i"), el);
                    removeEl = true;
                }
                el.insertAdjacentHTML("beforebegin", htmltext);
                if (elprev) {
                    elprev = elprev.nextSibling;
                } else {
                    elprev = parent.firstChild;
                }
                var newElements = [];
                while (elprev !== el) {
                    newElements.push(elprev);
                    elprev = elprev.nextSibling;
                }
                n.element = newElements;
                if (removeEl) {
                    parent.removeChild(el);
                }
            }
            if (component) {
                if (component.postRender) {
                    component.postRender(c.ctx, c);
                }
                pushInitCallback(c, false);
            }
            return c;
        } else if (inSvg || tag === "svg") {
            el = document.createElementNS("http://www.w3.org/2000/svg", tag);
            inSvg = true;
        } else if (!el) {
            el = createElement(tag);
        }
        createInto.insertBefore(el, createBefore);
        c.element = el;
        createChildren(c, el, null);
        if (component) {
            if (component.postRender) {
                component.postRender(c.ctx, c);
            }
        }
        if (c.attrs) c.attrs = updateElement(c, el, c.attrs, {});
        if (c.style) updateStyle(c, el, c.style, undefined);
        var className = c.className;
        if (className) setClassName(el, className);
        inSvg = backupInSvg;
        pushInitCallback(c, false);
        return c;
    }
    function normalizeNode(n) {
        var t = typeof n;
        if (t === "string") {
            return {
                children: n
            };
        }
        if (t === "boolean") return null;
        return n;
    }
    function createChildren(c, createInto, createBefore) {
        var ch = c.children;
        if (!ch) return;
        if (!isArray(ch)) {
            if (typeof ch === "string") {
                if (hasTextContent) {
                    createInto.textContent = ch;
                } else {
                    createInto.innerText = ch;
                }
                return;
            }
            ch = [ ch ];
        }
        ch = ch.slice(0);
        var i = 0, l = ch.length;
        while (i < l) {
            var item = ch[i];
            if (isArray(item)) {
                ch.splice.apply(ch, [ i, 1 ].concat(item));
                l = ch.length;
                continue;
            }
            item = normalizeNode(item);
            if (item == null) {
                ch.splice(i, 1);
                l--;
                continue;
            }
            ch[i] = createNode(item, c, createInto, createBefore);
            i++;
        }
        c.children = ch;
    }
    function destroyNode(c) {
        setRef(c.ref, null);
        var ch = c.children;
        if (isArray(ch)) {
            for (var i = 0, l = ch.length; i < l; i++) {
                destroyNode(ch[i]);
            }
        }
        var component = c.component;
        if (component) {
            if (component.destroy) component.destroy(c.ctx, c, c.element);
        }
    }
    function removeNodeRecursive(c) {
        var el = c.element;
        if (isArray(el)) {
            var pa = el[0].parentNode;
            if (pa) {
                for (var i_2 = 0; i_2 < el.length; i_2++) {
                    pa.removeChild(el[i_2]);
                }
            }
        } else if (el != null) {
            var p = el.parentNode;
            if (p) p.removeChild(el);
        } else {
            var ch = c.children;
            if (isArray(ch)) {
                for (var i = 0, l = ch.length; i < l; i++) {
                    removeNodeRecursive(ch[i]);
                }
            }
        }
    }
    function removeNode(c) {
        destroyNode(c);
        removeNodeRecursive(c);
    }
    var roots = newHashObj();
    function nodeContainsNode(c, n, resIndex, res) {
        var el = c.element;
        var ch = c.children;
        if (isArray(el)) {
            for (var ii = 0; ii < el.length; ii++) {
                if (el[ii] === n) {
                    res.push(c);
                    if (isArray(ch)) {
                        return ch;
                    }
                    return null;
                }
            }
        } else if (el == null) {
            if (isArray(ch)) {
                for (var i = 0; i < ch.length; i++) {
                    var result = nodeContainsNode(ch[i], n, resIndex, res);
                    if (result !== undefined) {
                        res.splice(resIndex, 0, c);
                        return result;
                    }
                }
            }
        } else if (el === n) {
            res.push(c);
            if (isArray(ch)) {
                return ch;
            }
            return null;
        }
        return undefined;
    }
    function vdomPath(n) {
        var res = [];
        if (n == null) return res;
        var rootIds = Object.keys(roots);
        var rootElements = rootIds.map(function(i) {
            return roots[i].e || document.body;
        });
        var nodeStack = [];
        rootFound: while (n) {
            for (var j = 0; j < rootElements.length; j++) {
                if (n === rootElements[j]) break rootFound;
            }
            nodeStack.push(n);
            n = n.parentNode;
        }
        if (!n || nodeStack.length === 0) return res;
        var currentCacheArray = null;
        var currentNode = nodeStack.pop();
        rootFound2: for (j = 0; j < rootElements.length; j++) {
            if (n === rootElements[j]) {
                var rc = roots[rootIds[j]].c;
                for (var k = 0; k < rc.length; k++) {
                    var rck = rc[k];
                    var findResult = nodeContainsNode(rck, currentNode, res.length, res);
                    if (findResult !== undefined) {
                        currentCacheArray = findResult;
                        break rootFound2;
                    }
                }
            }
        }
        while (nodeStack.length) {
            currentNode = nodeStack.pop();
            if (currentCacheArray && currentCacheArray.length) for (var i = 0, l = currentCacheArray.length; i < l; i++) {
                var bn = currentCacheArray[i];
                var findResult = nodeContainsNode(bn, currentNode, res.length, res);
                if (findResult !== undefined) {
                    currentCacheArray = findResult;
                    currentNode = null;
                    break;
                }
            }
            if (currentNode) {
                res.push(null);
                break;
            }
        }
        return res;
    }
    function deref(n) {
        var s = vdomPath(n);
        if (s.length == 0) return null;
        return s[s.length - 1];
    }
    function finishUpdateNode(n, c, component) {
        if (component) {
            if (component.postRender) {
                component.postRender(c.ctx, n, c);
            }
        }
        c.data = n.data;
        pushInitCallback(c, true);
    }
    function updateNode(n, c, createInto, createBefore, deepness) {
        var component = n.component;
        var backupInSvg = inSvg;
        var bigChange = false;
        var ctx = c.ctx;
        if (component && ctx != null) {
            if (ctx[ctxInvalidated] === frameCounter) {
                deepness = Math.max(deepness, ctx[ctxDeepness]);
            }
            if (component.id !== c.component.id) {
                bigChange = true;
            } else {
                if (c.parent != undefined) ctx.cfg = findCfg(c.parent);
                if (component.shouldChange) if (!component.shouldChange(ctx, n, c) && !ignoringShouldChange) return c;
                ctx.data = n.data || {};
                c.component = component;
                if (component.render) {
                    n = assign({}, n);
                    component.render(ctx, n, c);
                }
                c.cfg = n.cfg;
            }
        }
        if (DEBUG) {
            if (!(n.ref == null && c.ref == null || n.ref != null && c.ref != null && (typeof n.ref === "function" || typeof c.ref === "function" || n.ref[0] === c.ref[0] && n.ref[1] === c.ref[1]))) {
                if (window.console && console.warn) console.warn("ref changed in child in update");
            }
        }
        var newChildren = n.children;
        var cachedChildren = c.children;
        var tag = n.tag;
        if (bigChange || component && ctx == null) {} else if (tag === "/") {
            if (c.tag === "/" && cachedChildren === newChildren) {
                finishUpdateNode(n, c, component);
                return c;
            }
        } else if (tag === c.tag) {
            if (tag === undefined) {
                if (typeof newChildren === "string" && typeof cachedChildren === "string") {
                    if (newChildren !== cachedChildren) {
                        var el = c.element;
                        if (hasTextContent) {
                            el.textContent = newChildren;
                        } else {
                            el.nodeValue = newChildren;
                        }
                        c.children = newChildren;
                    }
                } else {
                    if (deepness <= 0) {
                        if (isArray(cachedChildren)) selectedUpdate(c.children, createInto, createBefore);
                    } else {
                        c.children = updateChildren(createInto, newChildren, cachedChildren, c, createBefore, deepness - 1);
                    }
                }
                finishUpdateNode(n, c, component);
                return c;
            } else {
                if (tag === "svg") {
                    inSvg = true;
                }
                var el = c.element;
                if (typeof newChildren === "string" && !isArray(cachedChildren)) {
                    if (newChildren !== cachedChildren) {
                        if (hasTextContent) {
                            el.textContent = newChildren;
                        } else {
                            el.innerText = newChildren;
                        }
                        cachedChildren = newChildren;
                    }
                } else {
                    if (deepness <= 0) {
                        if (isArray(cachedChildren)) selectedUpdate(c.children, el, createBefore);
                    } else {
                        cachedChildren = updateChildren(el, newChildren, cachedChildren, c, null, deepness - 1);
                    }
                }
                c.children = cachedChildren;
                finishUpdateNode(n, c, component);
                if (c.attrs || n.attrs) c.attrs = updateElement(c, el, n.attrs || {}, c.attrs || {});
                updateStyle(c, el, n.style, c.style);
                c.style = n.style;
                var className = n.className;
                if (className !== c.className) {
                    setClassName(el, className || "");
                    c.className = className;
                }
                inSvg = backupInSvg;
                return c;
            }
        }
        var parEl = c.element;
        if (isArray(parEl)) parEl = parEl[0];
        if (parEl == null) parEl = createInto; else parEl = parEl.parentNode;
        var r = createNode(n, c.parent, parEl, getDomNode(c));
        removeNode(c);
        return r;
    }
    function getDomNode(c) {
        var el = c.element;
        if (el != null) {
            if (isArray(el)) return el[0];
            return el;
        }
        var ch = c.children;
        if (!isArray(ch)) return null;
        for (var i = 0; i < ch.length; i++) {
            el = getDomNode(ch[i]);
            if (el) return el;
        }
        return null;
    }
    function findNextNode(a, i, len, def) {
        while (++i < len) {
            var ai = a[i];
            if (ai == null) continue;
            var n = getDomNode(ai);
            if (n != null) return n;
        }
        return def;
    }
    function callPostCallbacks() {
        var count = updateInstance.length;
        for (var i = 0; i < count; i++) {
            var n = updateInstance[i];
            if (updateCall[i]) {
                n.component.postUpdateDom(n.ctx, n, n.element);
            } else {
                n.component.postInitDom(n.ctx, n, n.element);
            }
        }
        updateCall = [];
        updateInstance = [];
    }
    function updateNodeInUpdateChildren(newNode, cachedChildren, cachedIndex, cachedLength, createBefore, element, deepness) {
        cachedChildren[cachedIndex] = updateNode(newNode, cachedChildren[cachedIndex], element, findNextNode(cachedChildren, cachedIndex, cachedLength, createBefore), deepness);
    }
    function reorderInUpdateChildrenRec(c, element, before) {
        var el = c.element;
        if (el != null) {
            if (isArray(el)) {
                for (var i = 0; i < el.length; i++) {
                    element.insertBefore(el[i], before);
                }
            } else element.insertBefore(el, before);
            return;
        }
        var ch = c.children;
        if (!isArray(ch)) return null;
        for (var i = 0; i < ch.length; i++) {
            reorderInUpdateChildrenRec(ch[i], element, before);
        }
    }
    function reorderInUpdateChildren(cachedChildren, cachedIndex, cachedLength, createBefore, element) {
        var before = findNextNode(cachedChildren, cachedIndex, cachedLength, createBefore);
        var cur = cachedChildren[cachedIndex];
        var what = getDomNode(cur);
        if (what != null && what !== before) {
            reorderInUpdateChildrenRec(cur, element, before);
        }
    }
    function reorderAndUpdateNodeInUpdateChildren(newNode, cachedChildren, cachedIndex, cachedLength, createBefore, element, deepness) {
        var before = findNextNode(cachedChildren, cachedIndex, cachedLength, createBefore);
        var cur = cachedChildren[cachedIndex];
        var what = getDomNode(cur);
        if (what != null && what !== before) {
            reorderInUpdateChildrenRec(cur, element, before);
        }
        cachedChildren[cachedIndex] = updateNode(newNode, cur, element, before, deepness);
    }
    function updateChildren(element, newChildren, cachedChildren, parentNode, createBefore, deepness) {
        if (newChildren == null) newChildren = [];
        if (!isArray(newChildren)) {
            newChildren = [ newChildren ];
        }
        if (cachedChildren == null) cachedChildren = [];
        if (!isArray(cachedChildren)) {
            if (element.firstChild) element.removeChild(element.firstChild);
            cachedChildren = [];
        }
        newChildren = newChildren.slice(0);
        var newLength = newChildren.length;
        var cachedLength = cachedChildren.length;
        var newIndex;
        for (newIndex = 0; newIndex < newLength; ) {
            var item = newChildren[newIndex];
            if (isArray(item)) {
                newChildren.splice.apply(newChildren, [ newIndex, 1 ].concat(item));
                newLength = newChildren.length;
                continue;
            }
            item = normalizeNode(item);
            if (item == null) {
                newChildren.splice(newIndex, 1);
                newLength--;
                continue;
            }
            newChildren[newIndex] = item;
            newIndex++;
        }
        var newEnd = newLength;
        var cachedEnd = cachedLength;
        newIndex = 0;
        var cachedIndex = 0;
        while (newIndex < newEnd && cachedIndex < cachedEnd) {
            if (newChildren[newIndex].key === cachedChildren[cachedIndex].key) {
                updateNodeInUpdateChildren(newChildren[newIndex], cachedChildren, cachedIndex, cachedLength, createBefore, element, deepness);
                newIndex++;
                cachedIndex++;
                continue;
            }
            while (true) {
                if (newChildren[newEnd - 1].key === cachedChildren[cachedEnd - 1].key) {
                    newEnd--;
                    cachedEnd--;
                    updateNodeInUpdateChildren(newChildren[newEnd], cachedChildren, cachedEnd, cachedLength, createBefore, element, deepness);
                    if (newIndex < newEnd && cachedIndex < cachedEnd) continue;
                }
                break;
            }
            if (newIndex < newEnd && cachedIndex < cachedEnd) {
                if (newChildren[newIndex].key === cachedChildren[cachedEnd - 1].key) {
                    cachedChildren.splice(cachedIndex, 0, cachedChildren[cachedEnd - 1]);
                    cachedChildren.splice(cachedEnd, 1);
                    reorderAndUpdateNodeInUpdateChildren(newChildren[newIndex], cachedChildren, cachedIndex, cachedLength, createBefore, element, deepness);
                    newIndex++;
                    cachedIndex++;
                    continue;
                }
                if (newChildren[newEnd - 1].key === cachedChildren[cachedIndex].key) {
                    cachedChildren.splice(cachedEnd, 0, cachedChildren[cachedIndex]);
                    cachedChildren.splice(cachedIndex, 1);
                    cachedEnd--;
                    newEnd--;
                    reorderAndUpdateNodeInUpdateChildren(newChildren[newEnd], cachedChildren, cachedEnd, cachedLength, createBefore, element, deepness);
                    continue;
                }
            }
            break;
        }
        if (cachedIndex === cachedEnd) {
            if (newIndex === newEnd) {
                return cachedChildren;
            }
            while (newIndex < newEnd) {
                cachedChildren.splice(cachedIndex, 0, createNode(newChildren[newIndex], parentNode, element, findNextNode(cachedChildren, cachedIndex - 1, cachedLength, createBefore)));
                cachedIndex++;
                cachedEnd++;
                cachedLength++;
                newIndex++;
            }
            return cachedChildren;
        }
        if (newIndex === newEnd) {
            while (cachedIndex < cachedEnd) {
                cachedEnd--;
                removeNode(cachedChildren[cachedEnd]);
                cachedChildren.splice(cachedEnd, 1);
            }
            return cachedChildren;
        }
        var cachedKeys = newHashObj();
        var newKeys = newHashObj();
        var key;
        var node;
        var backupNewIndex = newIndex;
        var backupCachedIndex = cachedIndex;
        var deltaKeyless = 0;
        for (;cachedIndex < cachedEnd; cachedIndex++) {
            node = cachedChildren[cachedIndex];
            key = node.key;
            if (key != null) {
                assert(!(key in cachedKeys));
                cachedKeys[key] = cachedIndex;
            } else deltaKeyless--;
        }
        var keyLess = -deltaKeyless - deltaKeyless;
        for (;newIndex < newEnd; newIndex++) {
            node = newChildren[newIndex];
            key = node.key;
            if (key != null) {
                assert(!(key in newKeys));
                newKeys[key] = newIndex;
            } else deltaKeyless++;
        }
        keyLess += deltaKeyless;
        var delta = 0;
        newIndex = backupNewIndex;
        cachedIndex = backupCachedIndex;
        var cachedKey;
        while (cachedIndex < cachedEnd && newIndex < newEnd) {
            if (cachedChildren[cachedIndex] === null) {
                cachedChildren.splice(cachedIndex, 1);
                cachedEnd--;
                cachedLength--;
                delta--;
                continue;
            }
            cachedKey = cachedChildren[cachedIndex].key;
            if (cachedKey == null) {
                cachedIndex++;
                continue;
            }
            key = newChildren[newIndex].key;
            if (key == null) {
                newIndex++;
                while (newIndex < newEnd) {
                    key = newChildren[newIndex].key;
                    if (key != null) break;
                    newIndex++;
                }
                if (key == null) break;
            }
            var akpos = cachedKeys[key];
            if (akpos === undefined) {
                cachedChildren.splice(cachedIndex, 0, createNode(newChildren[newIndex], parentNode, element, findNextNode(cachedChildren, cachedIndex - 1, cachedLength, createBefore)));
                delta++;
                newIndex++;
                cachedIndex++;
                cachedEnd++;
                cachedLength++;
                continue;
            }
            if (!(cachedKey in newKeys)) {
                removeNode(cachedChildren[cachedIndex]);
                cachedChildren.splice(cachedIndex, 1);
                delta--;
                cachedEnd--;
                cachedLength--;
                continue;
            }
            if (cachedIndex === akpos + delta) {
                updateNodeInUpdateChildren(newChildren[newIndex], cachedChildren, cachedIndex, cachedLength, createBefore, element, deepness);
                newIndex++;
                cachedIndex++;
            } else {
                cachedChildren.splice(cachedIndex, 0, cachedChildren[akpos + delta]);
                delta++;
                cachedChildren[akpos + delta] = null;
                reorderAndUpdateNodeInUpdateChildren(newChildren[newIndex], cachedChildren, cachedIndex, cachedLength, createBefore, element, deepness);
                cachedIndex++;
                cachedEnd++;
                cachedLength++;
                newIndex++;
            }
        }
        while (cachedIndex < cachedEnd) {
            if (cachedChildren[cachedIndex] === null) {
                cachedChildren.splice(cachedIndex, 1);
                cachedEnd--;
                cachedLength--;
                continue;
            }
            if (cachedChildren[cachedIndex].key != null) {
                removeNode(cachedChildren[cachedIndex]);
                cachedChildren.splice(cachedIndex, 1);
                cachedEnd--;
                cachedLength--;
                continue;
            }
            cachedIndex++;
        }
        while (newIndex < newEnd) {
            key = newChildren[newIndex].key;
            if (key != null) {
                cachedChildren.splice(cachedIndex, 0, createNode(newChildren[newIndex], parentNode, element, findNextNode(cachedChildren, cachedIndex - 1, cachedLength, createBefore)));
                cachedEnd++;
                cachedLength++;
                delta++;
                cachedIndex++;
            }
            newIndex++;
        }
        if (!keyLess) return cachedChildren;
        keyLess = keyLess - Math.abs(deltaKeyless) >> 1;
        newIndex = backupNewIndex;
        cachedIndex = backupCachedIndex;
        while (newIndex < newEnd) {
            if (cachedIndex < cachedEnd) {
                cachedKey = cachedChildren[cachedIndex].key;
                if (cachedKey != null) {
                    cachedIndex++;
                    continue;
                }
            }
            key = newChildren[newIndex].key;
            if (newIndex < cachedEnd && key === cachedChildren[newIndex].key) {
                if (key != null) {
                    newIndex++;
                    continue;
                }
                updateNodeInUpdateChildren(newChildren[newIndex], cachedChildren, newIndex, cachedLength, createBefore, element, deepness);
                keyLess--;
                newIndex++;
                cachedIndex = newIndex;
                continue;
            }
            if (key != null) {
                assert(newIndex === cachedIndex);
                if (keyLess === 0 && deltaKeyless < 0) {
                    while (true) {
                        removeNode(cachedChildren[cachedIndex]);
                        cachedChildren.splice(cachedIndex, 1);
                        cachedEnd--;
                        cachedLength--;
                        deltaKeyless++;
                        assert(cachedIndex !== cachedEnd, "there still need to exist key node");
                        if (cachedChildren[cachedIndex].key != null) break;
                    }
                    continue;
                }
                while (cachedChildren[cachedIndex].key == null) cachedIndex++;
                assert(key === cachedChildren[cachedIndex].key);
                cachedChildren.splice(newIndex, 0, cachedChildren[cachedIndex]);
                cachedChildren.splice(cachedIndex + 1, 1);
                reorderInUpdateChildren(cachedChildren, newIndex, cachedLength, createBefore, element);
                newIndex++;
                cachedIndex = newIndex;
                continue;
            }
            if (cachedIndex < cachedEnd) {
                cachedChildren.splice(newIndex, 0, cachedChildren[cachedIndex]);
                cachedChildren.splice(cachedIndex + 1, 1);
                reorderAndUpdateNodeInUpdateChildren(newChildren[newIndex], cachedChildren, newIndex, cachedLength, createBefore, element, deepness);
                keyLess--;
                newIndex++;
                cachedIndex++;
            } else {
                cachedChildren.splice(newIndex, 0, createNode(newChildren[newIndex], parentNode, element, findNextNode(cachedChildren, newIndex - 1, cachedLength, createBefore)));
                cachedEnd++;
                cachedLength++;
                newIndex++;
                cachedIndex++;
            }
        }
        while (cachedEnd > newIndex) {
            cachedEnd--;
            removeNode(cachedChildren[cachedEnd]);
            cachedChildren.splice(cachedEnd, 1);
        }
        return cachedChildren;
    }
    var hasNativeRaf = false;
    var nativeRaf = window.requestAnimationFrame;
    if (nativeRaf) {
        nativeRaf(function(param) {
            if (param === +param) hasNativeRaf = true;
        });
    }
    var __export_now = Date.now || function() {
        return new Date().getTime();
    };
    var startTime = __export_now();
    var lastTickTime = 0;
    function requestAnimationFrame(callback) {
        if (hasNativeRaf) {
            nativeRaf(callback);
        } else {
            var delay = 50 / 3 + lastTickTime - __export_now();
            if (delay < 0) delay = 0;
            window.setTimeout(function() {
                lastTickTime = __export_now();
                callback(lastTickTime - startTime);
            }, delay);
        }
    }
    var ctxInvalidated = "$invalidated";
    var ctxDeepness = "$deepness";
    var fullRecreateRequested = true;
    var scheduled = false;
    var uptimeMs = 0;
    var frameCounter = 0;
    var lastFrameDurationMs = 0;
    var renderFrameBegin = 0;
    var regEvents = {};
    var registryEvents = {};
    function addEvent(name, priority, callback) {
        var list = registryEvents[name] || [];
        list.push({
            priority: priority,
            callback: callback
        });
        registryEvents[name] = list;
    }
    function emitEvent(name, ev, target, node) {
        var events = regEvents[name];
        if (events) for (var i = 0; i < events.length; i++) {
            if (events[i](ev, target, node)) return true;
        }
        return false;
    }
    function addListener(el, name) {
        if (name[0] == "!") return;
        var capture = name[0] == "^";
        var eventName = name;
        if (capture) {
            eventName = name.slice(1);
        }
        function enhanceEvent(ev) {
            ev = ev || window.event;
            var t = ev.target || ev.srcElement || el;
            var n = deref(t);
            emitEvent(name, ev, t, n);
        }
        if ("on" + eventName in window) el = window;
        el.addEventListener(eventName, enhanceEvent, capture);
    }
    var eventsCaptured = false;
    function initEvents() {
        if (eventsCaptured) return;
        eventsCaptured = true;
        var eventNames = Object.keys(registryEvents);
        for (var j = 0; j < eventNames.length; j++) {
            var eventName = eventNames[j];
            var arr = registryEvents[eventName];
            arr = arr.sort(function(a, b) {
                return a.priority - b.priority;
            });
            regEvents[eventName] = arr.map(function(v) {
                return v.callback;
            });
        }
        registryEvents = null;
        var body = document.body;
        for (var i = 0; i < eventNames.length; i++) {
            addListener(body, eventNames[i]);
        }
    }
    function selectedUpdate(cache, element, createBefore) {
        var len = cache.length;
        for (var i = 0; i < len; i++) {
            var node = cache[i];
            var ctx = node.ctx;
            if (ctx != null && ctx[ctxInvalidated] === frameCounter) {
                var cloned = {
                    data: ctx.data,
                    component: node.component
                };
                cache[i] = updateNode(cloned, node, element, createBefore, ctx[ctxDeepness]);
            } else if (isArray(node.children)) {
                var backupInSvg = inSvg;
                if (node.tag === "svg") inSvg = true;
                selectedUpdate(node.children, node.element || element, findNextNode(cache, i, len, createBefore));
                inSvg = backupInSvg;
            }
        }
    }
    var beforeFrameCallback = function() {};
    var afterFrameCallback = function() {};
    function setBeforeFrame(callback) {
        var res = beforeFrameCallback;
        beforeFrameCallback = callback;
        return res;
    }
    function setAfterFrame(callback) {
        var res = afterFrameCallback;
        afterFrameCallback = callback;
        return res;
    }
    function findLastNode(children) {
        for (var i = children.length - 1; i >= 0; i--) {
            var c = children[i];
            var el = c.element;
            if (el != null) {
                if (isArray(el)) {
                    var l = el.length;
                    if (l === 0) continue;
                    return el[l - 1];
                }
                return el;
            }
            var ch = c.children;
            if (!isArray(ch)) continue;
            var res = findLastNode(ch);
            if (res != null) return res;
        }
        return null;
    }
    function update(time) {
        renderFrameBegin = __export_now();
        initEvents();
        frameCounter++;
        ignoringShouldChange = nextIgnoreShouldChange;
        nextIgnoreShouldChange = false;
        uptimeMs = time;
        scheduled = false;
        beforeFrameCallback();
        var fullRefresh = false;
        if (fullRecreateRequested) {
            fullRecreateRequested = false;
            fullRefresh = true;
        }
        var rootIds = Object.keys(roots);
        for (var i = 0; i < rootIds.length; i++) {
            var r = roots[rootIds[i]];
            if (!r) continue;
            var rc = r.c;
            var insertBefore = findLastNode(rc);
            if (insertBefore != null) insertBefore = insertBefore.nextSibling;
            if (fullRefresh) {
                var newChildren = r.f();
                r.e = r.e || document.body;
                r.c = updateChildren(r.e, newChildren, rc, null, insertBefore, 1e6);
            } else {
                selectedUpdate(rc, r.e, insertBefore);
            }
        }
        callPostCallbacks();
        var r0 = roots["0"];
        afterFrameCallback(r0 ? r0.c : null);
        lastFrameDurationMs = __export_now() - renderFrameBegin;
    }
    var nextIgnoreShouldChange = false;
    var ignoringShouldChange = false;
    function ignoreShouldChange() {
        nextIgnoreShouldChange = true;
        __export_invalidate();
    }
    function setInvalidate(inv) {
        var prev = __export_invalidate;
        return prev;
    }
    var __export_invalidate = function(ctx, deepness) {
        if (fullRecreateRequested) return;
        if (ctx != null) {
            if (deepness == undefined) deepness = 1e6;
            if (ctx[ctxInvalidated] !== frameCounter + 1) {
                ctx[ctxInvalidated] = frameCounter + 1;
                ctx[ctxDeepness] = deepness;
            } else {
                if (deepness > ctx[ctxDeepness]) ctx[ctxDeepness] = deepness;
            }
        } else {
            fullRecreateRequested = true;
        }
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(update);
    };
    function forceInvalidate() {
        if (!scheduled) fullRecreateRequested = false;
        __export_invalidate();
    }
    var lastRootId = 0;
    function addRoot(factory, element, parent) {
        lastRootId++;
        var rootId = "" + lastRootId;
        roots[rootId] = {
            f: factory,
            e: element,
            c: [],
            p: parent
        };
        forceInvalidate();
        return rootId;
    }
    function removeRoot(id) {
        var root = roots[id];
        if (!root) return;
        if (root.c.length) {
            root.c = updateChildren(root.e, [], root.c, null, null, 1e9);
        }
        delete roots[id];
    }
    function getRoots() {
        return roots;
    }
    var beforeInit = forceInvalidate;
    function init(factory, element) {
        removeRoot("0");
        roots["0"] = {
            f: factory,
            e: element,
            c: [],
            p: undefined
        };
        beforeInit();
        beforeInit = forceInvalidate;
    }
    function setBeforeInit(callback) {
        var prevBeforeInit = beforeInit;
        beforeInit = function() {
            callback(prevBeforeInit);
        };
    }
    function bubble(node, name, param) {
        while (node) {
            var c = node.component;
            if (c) {
                var ctx = node.ctx;
                var m = c[name];
                if (m) {
                    if (m.call(c, ctx, param)) return ctx;
                }
                m = c.shouldStopBubble;
                if (m) {
                    if (m.call(c, ctx, name, param)) break;
                }
            }
            node = node.parent;
        }
        return null;
    }
    function broadcastEventToNode(node, name, param) {
        if (!node) return null;
        var c = node.component;
        if (c) {
            var ctx = node.ctx;
            var m = c[name];
            if (m) {
                if (m.call(c, ctx, param)) return ctx;
            }
            m = c.shouldStopBroadcast;
            if (m) {
                if (m.call(c, ctx, name, param)) return null;
            }
        }
        var ch = node.children;
        if (isArray(ch)) {
            for (var i = 0; i < ch.length; i++) {
                var res = broadcastEventToNode(ch[i], name, param);
                if (res != null) return res;
            }
        } else {
            return broadcastEventToNode(ch, name, param);
        }
    }
    function broadcast(name, param) {
        var k = Object.keys(roots);
        for (var i = 0; i < k.length; i++) {
            var ch = roots[k[i]].c;
            if (ch != null) {
                for (var j = 0; j < ch.length; j++) {
                    var res = broadcastEventToNode(ch[j], name, param);
                    if (res != null) return res;
                }
            }
        }
        return null;
    }
    function merge(f1, f2) {
        var _this = this;
        return function() {
            var params = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                params[_i - 0] = arguments[_i];
            }
            var result = f1.apply(_this, params);
            if (result) return result;
            return f2.apply(_this, params);
        };
    }
    var emptyObject = {};
    function mergeComponents(c1, c2) {
        var res = Object.create(c1);
        for (var i in c2) {
            if (!(i in emptyObject)) {
                var m = c2[i];
                var origM = c1[i];
                if (i === "id") {
                    res[i] = (origM != null ? origM : "") + "/" + m;
                } else if (typeof m === "function" && origM != null && typeof origM === "function") {
                    res[i] = merge(origM, m);
                } else {
                    res[i] = m;
                }
            }
        }
        return res;
    }
    function preEnhance(node, methods) {
        var comp = node.component;
        if (!comp) {
            node.component = methods;
            return node;
        }
        node.component = mergeComponents(methods, comp);
        return node;
    }
    function postEnhance(node, methods) {
        var comp = node.component;
        if (!comp) {
            node.component = methods;
            return node;
        }
        node.component = mergeComponents(comp, methods);
        return node;
    }
    function assign(target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        if (target == null) target = {};
        var totalArgs = arguments.length;
        for (var i_3 = 1; i_3 < totalArgs; i_3++) {
            var source = arguments[i_3];
            if (source == null) continue;
            var keys = Object.keys(source);
            var totalKeys = keys.length;
            for (var j_1 = 0; j_1 < totalKeys; j_1++) {
                var key = keys[j_1];
                target[key] = source[key];
            }
        }
        return target;
    }
    function preventDefault(event) {
        var pd = event.preventDefault;
        if (pd) pd.call(event); else event.returnValue = false;
    }
    function cloneNodeArray(a) {
        a = a.slice(0);
        for (var i = 0; i < a.length; i++) {
            var n = a[i];
            if (isArray(n)) {
                a[i] = cloneNodeArray(n);
            } else if (isObject(n)) {
                a[i] = cloneNode(n);
            }
        }
        return a;
    }
    function cloneNode(node) {
        var r = assign({}, node);
        if (r.attrs) {
            r.attrs = assign({}, r.attrs);
        }
        if (isObject(r.style)) {
            r.style = assign({}, r.style);
        }
        var ch = r.children;
        if (ch) {
            if (isArray(ch)) {
                r.children = cloneNodeArray(ch);
            } else if (isObject(ch)) {
                r.children = cloneNode(ch);
            }
        }
        return r;
    }
    function setStyleShim(name, action) {
        mapping[name] = action;
    }
    function uptime() {
        return uptimeMs;
    }
    function lastFrameDuration() {
        return lastFrameDurationMs;
    }
    function frame() {
        return frameCounter;
    }
    function invalidated() {
        return scheduled;
    }
    var media = null;
    var breaks = [ [ 414, 800, 900 ], [ 736, 1280, 1440 ] ];
    function emitOnMediaChange() {
        media = null;
        __export_invalidate();
        return false;
    }
    var events = [ "resize", "orientationchange" ];
    for (var i = 0; i < events.length; i++) addEvent(events[i], 10, emitOnMediaChange);
    function accDeviceBreaks(newBreaks) {
        if (newBreaks != null) {
            breaks = newBreaks;
            emitOnMediaChange();
        }
        return breaks;
    }
    var viewport = window.document.documentElement;
    function getMedia() {
        if (media == null) {
            var w = viewport.clientWidth;
            var h = viewport.clientHeight;
            var o = window.orientation;
            var p = h >= w;
            if (o == null) o = p ? 0 : 90;
            var device = 0;
            while (w > breaks[+!p][device]) device++;
            media = {
                width: w,
                height: h,
                orientation: o,
                deviceCategory: device,
                portrait: p
            };
        }
        return media;
    }
    var __export_asap = function() {
        var callbacks = [];
        function executeCallbacks() {
            var cbList = callbacks;
            callbacks = [];
            for (var i = 0, len = cbList.length; i < len; i++) {
                cbList[i]();
            }
        }
        var onreadystatechange = "onreadystatechange";
        if (window.MutationObserver) {
            var hiddenDiv = document.createElement("div");
            new MutationObserver(executeCallbacks).observe(hiddenDiv, {
                attributes: true
            });
            return function(callback) {
                if (!callbacks.length) {
                    hiddenDiv.setAttribute("yes", "no");
                }
                callbacks.push(callback);
            };
        } else if (!window.setImmediate && window.postMessage && window.addEventListener) {
            var MESSAGE_PREFIX = "basap" + Math.random(), hasPostMessage = false;
            var onGlobalMessage = function(event) {
                if (event.source === window && event.data === MESSAGE_PREFIX) {
                    hasPostMessage = false;
                    executeCallbacks();
                }
            };
            window.addEventListener("message", onGlobalMessage, false);
            return function(fn) {
                callbacks.push(fn);
                if (!hasPostMessage) {
                    hasPostMessage = true;
                    window.postMessage(MESSAGE_PREFIX, "*");
                }
            };
        } else if (!window.setImmediate && onreadystatechange in document.createElement("script")) {
            var scriptEl;
            return function(callback) {
                callbacks.push(callback);
                if (!scriptEl) {
                    scriptEl = document.createElement("script");
                    scriptEl[onreadystatechange] = function() {
                        scriptEl[onreadystatechange] = null;
                        scriptEl.parentNode.removeChild(scriptEl);
                        scriptEl = null;
                        executeCallbacks();
                    };
                    document.body.appendChild(scriptEl);
                }
            };
        } else {
            var timeout;
            var timeoutFn = window.setImmediate || setTimeout;
            return function(callback) {
                callbacks.push(callback);
                if (!timeout) {
                    timeout = timeoutFn(function() {
                        timeout = undefined;
                        executeCallbacks();
                    }, 0);
                }
            };
        }
    }();
    (function() {
        if (!window.Promise) {
            function bind(fn, thisArg) {
                return function() {
                    fn.apply(thisArg, arguments);
                };
            }
            function handle(deferred) {
                var _this = this;
                if (this.s === null) {
                    this.d.push(deferred);
                    return;
                }
                __export_asap(function() {
                    var cb = _this.s ? deferred[0] : deferred[1];
                    if (cb == null) {
                        (_this.s ? deferred[2] : deferred[3])(_this.v);
                        return;
                    }
                    var ret;
                    try {
                        ret = cb(_this.v);
                    } catch (e) {
                        deferred[3](e);
                        return;
                    }
                    deferred[2](ret);
                });
            }
            function finale() {
                for (var i = 0, len = this.d.length; i < len; i++) {
                    handle.call(this, this.d[i]);
                }
                this.d = null;
            }
            function reject(newValue) {
                this.s = false;
                this.v = newValue;
                finale.call(this);
            }
            function doResolve(fn, onFulfilled, onRejected) {
                var done = false;
                try {
                    fn(function(value) {
                        if (done) return;
                        done = true;
                        onFulfilled(value);
                    }, function(reason) {
                        if (done) return;
                        done = true;
                        onRejected(reason);
                    });
                } catch (ex) {
                    if (done) return;
                    done = true;
                    onRejected(ex);
                }
            }
            function resolve(newValue) {
                try {
                    if (newValue === this) throw new TypeError("Promise selfresolve");
                    if (Object(newValue) === newValue) {
                        var then = newValue.then;
                        if (typeof then === "function") {
                            doResolve(bind(then, newValue), bind(resolve, this), bind(reject, this));
                            return;
                        }
                    }
                    this.s = true;
                    this.v = newValue;
                    finale.call(this);
                } catch (e) {
                    reject.call(this, e);
                }
            }
            function Promise(fn) {
                this.s = null;
                this.v = null;
                this.d = [];
                doResolve(fn, bind(resolve, this), bind(reject, this));
            }
            Promise.prototype.then = function(onFulfilled, onRejected) {
                var me = this;
                return new Promise(function(resolve, reject) {
                    handle.call(me, [ onFulfilled, onRejected, resolve, reject ]);
                });
            };
            Promise.all = function() {
                var args = [].slice.call(arguments.length === 1 && isArray(arguments[0]) ? arguments[0] : arguments);
                return new Promise(function(resolve, reject) {
                    if (args.length === 0) {
                        resolve(args);
                        return;
                    }
                    var remaining = args.length;
                    function res(i, val) {
                        try {
                            if (val && (typeof val === "object" || typeof val === "function")) {
                                var then = val.then;
                                if (typeof then === "function") {
                                    then.call(val, function(val) {
                                        res(i, val);
                                    }, reject);
                                    return;
                                }
                            }
                            args[i] = val;
                            if (--remaining === 0) {
                                resolve(args);
                            }
                        } catch (ex) {
                            reject(ex);
                        }
                    }
                    for (var i = 0; i < args.length; i++) {
                        res(i, args[i]);
                    }
                });
            };
            Promise.resolve = function(value) {
                if (value && typeof value === "object" && value.constructor === Promise) {
                    return value;
                }
                return new Promise(function(resolve) {
                    resolve(value);
                });
            };
            Promise.reject = function(value) {
                return new Promise(function(resolve, reject) {
                    reject(value);
                });
            };
            Promise.race = function(values) {
                return new Promise(function(resolve, reject) {
                    for (var i = 0, len = values.length; i < len; i++) {
                        values[i].then(resolve, reject);
                    }
                });
            };
            window["Promise"] = Promise;
        }
    })();
    if (ieVersion() === 9) {
        function addFilter(s, v) {
            if (s.zoom == null) s.zoom = "1";
            var f = s.filter;
            s.filter = f == null ? v : f + " " + v;
        }
        var simpleLinearGradient = /^linear\-gradient\(to (.+?),(.+?),(.+?)\)/gi;
        setStyleShim("background", function(s, v, oldName) {
            var match = simpleLinearGradient.exec(v);
            if (match == null) return;
            var dir = match[1];
            var color1 = match[2];
            var color2 = match[3];
            var tmp;
            switch (dir) {
              case "top":
                dir = "0";
                tmp = color1;
                color1 = color2;
                color2 = tmp;
                break;

              case "bottom":
                dir = "0";
                break;

              case "left":
                dir = "1";
                tmp = color1;
                color1 = color2;
                color2 = tmp;
                break;

              case "right":
                dir = "1";
                break;

              default:
                return;
            }
            s[oldName] = "none";
            addFilter(s, "progid:DXImageTransform.Microsoft.gradient(startColorstr='" + color1 + "',endColorstr='" + color2 + "', gradientType='" + dir + "')");
        });
    } else {
        var teststyle = document.createElement("div").style;
        teststyle.cssText = "background:-webkit-linear-gradient(top,red,red)";
        if (teststyle.background.length > 0) {
            var startsWithGradient = /^(?:repeating\-)?(?:linear|radial)\-gradient/gi;
            var revdirs = {
                top: "bottom",
                bottom: "top",
                left: "right",
                right: "left"
            };
            function gradientWebkitter(style, value, name) {
                if (startsWithGradient.test(value)) {
                    var pos = value.indexOf("(to ");
                    if (pos > 0) {
                        pos += 4;
                        var posend = value.indexOf(",", pos);
                        var dir = value.slice(pos, posend);
                        dir = dir.split(" ").map(function(v) {
                            return revdirs[v] || v;
                        }).join(" ");
                        value = value.slice(0, pos - 3) + dir + value.slice(posend);
                    }
                    value = "-webkit-" + value;
                }
                style[name] = value;
            }
            setStyleShim("background", gradientWebkitter);
        }
    }
    var bvalue = "b$value";
    var tvalue = "value";
    function isCheckboxlike(el) {
        var t = el.type;
        return t === "checkbox" || t === "radio";
    }
    function stringArrayEqual(a1, a2) {
        var l = a1.length;
        if (l !== a2.length) return false;
        for (var j = 0; j < l; j++) {
            if (a1[j] !== a2[j]) return false;
        }
        return true;
    }
    function stringArrayContains(a, v) {
        for (var j = 0; j < a.length; j++) {
            if (a[j] === v) return true;
        }
        return false;
    }
    function selectedArray(options) {
        var res = [];
        for (var j = 0; j < options.length; j++) {
            if (options[j].selected) res.push(options[j].value);
        }
        return res;
    }
    var prevSetValueCallback = setSetValue(function(el, node, newValue, oldValue) {
        var tagName = el.tagName;
        var isSelect = tagName === "SELECT";
        var isInput = tagName === "INPUT" || tagName === "TEXTAREA";
        if (!isInput && !isSelect) {
            prevSetValueCallback(el, node, newValue, oldValue);
            return;
        }
        if (node.ctx === undefined) node.ctx = {};
        if (oldValue === undefined) {
            node.ctx[bvalue] = newValue;
        }
        var isMultiSelect = isSelect && el.multiple;
        var emitDiff = false;
        if (isMultiSelect) {
            var options = el.options;
            var currentMulti = selectedArray(options);
            if (!stringArrayEqual(newValue, currentMulti)) {
                if (oldValue === undefined || stringArrayEqual(currentMulti, oldValue) || !stringArrayEqual(newValue, node.ctx[bvalue])) {
                    for (var j = 0; j < options.length; j++) {
                        options[j].selected = stringArrayContains(newValue, options[j].value);
                    }
                    currentMulti = selectedArray(options);
                    if (stringArrayEqual(currentMulti, newValue)) {
                        emitDiff = true;
                    }
                } else {
                    emitDiff = true;
                }
            }
        } else if (isInput || isSelect) {
            if (isInput && isCheckboxlike(el)) {
                var currentChecked = el.checked;
                if (newValue !== currentChecked) {
                    if (oldValue === undefined || currentChecked === oldValue || newValue !== node.ctx[bvalue]) {
                        el.checked = newValue;
                    } else {
                        emitDiff = true;
                    }
                }
            } else {
                var isCombobox = isSelect && el.size < 2;
                var currentValue = el[tvalue];
                if (newValue !== currentValue) {
                    if (oldValue === undefined || currentValue === oldValue || newValue !== node.ctx[bvalue]) {
                        if (isSelect) {
                            if (newValue === "") {
                                el.selectedIndex = isCombobox ? 0 : -1;
                            } else {
                                el[tvalue] = newValue;
                            }
                            if (newValue !== "" || isCombobox) {
                                currentValue = el[tvalue];
                                if (newValue !== currentValue) {
                                    emitDiff = true;
                                }
                            }
                        } else {
                            el[tvalue] = newValue;
                        }
                    } else {
                        emitDiff = true;
                    }
                }
            }
        }
        if (emitDiff) {
            emitOnChange(null, el, node);
        } else {
            node.ctx[bvalue] = newValue;
        }
    });
    function emitOnChange(ev, target, node) {
        if (target && target.nodeName === "OPTION") {
            target = document.activeElement;
            node = deref(target);
        }
        if (!node) {
            return false;
        }
        var c = node.component;
        if (!c) return false;
        if (!c.onChange) return false;
        var ctx = node.ctx;
        var tagName = target.tagName;
        var isSelect = tagName === "SELECT";
        var isMultiSelect = isSelect && target.multiple;
        if (isMultiSelect) {
            var vs = selectedArray(target.options);
            if (!stringArrayEqual(ctx[bvalue], vs)) {
                ctx[bvalue] = vs;
                c.onChange(ctx, vs);
            }
        } else if (isCheckboxlike(target)) {
            if (ev && ev.type === "change") {
                setTimeout(function() {
                    emitOnChange(null, target, node);
                }, 10);
                return false;
            }
            if (target.type === "radio") {
                var radios = document.getElementsByName(target.name);
                for (var j = 0; j < radios.length; j++) {
                    var radio = radios[j];
                    var radionode = deref(radio);
                    if (!radionode) continue;
                    var radiocomponent = radionode.component;
                    if (!radiocomponent) continue;
                    if (!radiocomponent.onChange) continue;
                    var radioctx = radionode.ctx;
                    var vrb = radio.checked;
                    if (radioctx[bvalue] !== vrb) {
                        radioctx[bvalue] = vrb;
                        radiocomponent.onChange(radioctx, vrb);
                    }
                }
            } else {
                var vb = target.checked;
                if (ctx[bvalue] !== vb) {
                    ctx[bvalue] = vb;
                    c.onChange(ctx, vb);
                }
            }
        } else {
            var v = target.value;
            if (ctx[bvalue] !== v) {
                ctx[bvalue] = v;
                c.onChange(ctx, v);
            }
        }
        return false;
    }
    var events = [ "input", "cut", "paste", "keydown", "keypress", "keyup", "click", "change" ];
    for (var i = 0; i < events.length; i++) addEvent(events[i], 10, emitOnChange);
    function buildParam(ev) {
        return {
            shift: ev.shiftKey,
            ctrl: ev.ctrlKey,
            alt: ev.altKey,
            meta: ev.metaKey || false,
            which: ev.which || ev.keyCode
        };
    }
    function emitOnKeyDown(ev, target, node) {
        if (!node) return false;
        var param = buildParam(ev);
        if (bubble(node, "onKeyDown", param)) {
            preventDefault(ev);
            return true;
        }
        return false;
    }
    function emitOnKeyUp(ev, target, node) {
        if (!node) return false;
        var param = buildParam(ev);
        if (bubble(node, "onKeyUp", param)) {
            preventDefault(ev);
            return true;
        }
        return false;
    }
    function emitOnKeyPress(ev, target, node) {
        if (!node) return false;
        if (ev.which === 0) return false;
        var param = {
            charCode: ev.which || ev.keyCode
        };
        if (bubble(node, "onKeyPress", param)) {
            preventDefault(ev);
            return true;
        }
        return false;
    }
    addEvent("keydown", 50, emitOnKeyDown);
    addEvent("keyup", 50, emitOnKeyUp);
    addEvent("keypress", 50, emitOnKeyPress);
    var ownerCtx = null;
    var invokingOwner;
    var onClickText = "onClick";
    function isMouseOwner(ctx) {
        return ownerCtx === ctx;
    }
    function isMouseOwnerEvent() {
        return invokingOwner;
    }
    function registerMouseOwner(ctx) {
        ownerCtx = ctx;
    }
    function releaseMouseOwner() {
        ownerCtx = null;
    }
    function invokeMouseOwner(handlerName, param) {
        if (ownerCtx == null) {
            return false;
        }
        var handler = ownerCtx.me.component[handlerName];
        if (!handler) {
            return false;
        }
        invokingOwner = true;
        var stop = handler(ownerCtx, param);
        invokingOwner = false;
        return stop;
    }
    function hasPointerEventsNoneB(node) {
        while (node) {
            var s = node.style;
            if (s) {
                var e = s.pointerEvents;
                if (e !== undefined) {
                    if (e === "none") return true;
                    return false;
                }
            }
            node = node.parent;
        }
        return false;
    }
    function hasPointerEventsNone(target) {
        var bNode = deref(target);
        return hasPointerEventsNoneB(bNode);
    }
    function revertVisibilityChanges(hiddenEls) {
        if (hiddenEls.length) {
            for (var i = hiddenEls.length - 1; i >= 0; --i) {
                hiddenEls[i].t.style.visibility = hiddenEls[i].p;
            }
            return true;
        }
        return false;
    }
    function pushAndHide(hiddenEls, t) {
        hiddenEls.push({
            t: t,
            p: t.style.visibility
        });
        t.style.visibility = "hidden";
    }
    function pointerThroughIE(ev, target, node) {
        var hiddenEls = [];
        var t = target;
        while (hasPointerEventsNone(t)) {
            pushAndHide(hiddenEls, t);
            t = document.elementFromPoint(ev.x, ev.y);
        }
        if (revertVisibilityChanges(hiddenEls)) {
            try {
                t.dispatchEvent(ev);
            } catch (e) {
                return false;
            }
            preventDefault(ev);
            return true;
        }
        return false;
    }
    function addEvent5(name, callback) {
        addEvent(name, 5, callback);
    }
    var pointersEventNames = [ "PointerDown", "PointerMove", "PointerUp", "PointerCancel" ];
    var i;
    if (ieVersion() && ieVersion() < 11) {
        var mouseEvents = [ "click", "dblclick", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "scroll", "wheel" ];
        for (i = 0; i < mouseEvents.length; ++i) {
            addEvent(mouseEvents[i], 1, pointerThroughIE);
        }
    }
    function type2Bobril(t) {
        if (t == "mouse") return 0;
        if (t == "pen") return 2;
        return 1;
    }
    function pointerEventsNoneFix(x, y, target, node) {
        var hiddenEls = [];
        var t = target;
        while (hasPointerEventsNoneB(node)) {
            pushAndHide(hiddenEls, t);
            t = document.elementFromPoint(x, y);
            node = deref(t);
        }
        revertVisibilityChanges(hiddenEls);
        return [ t, node ];
    }
    function buildHandlerPointer(name) {
        return function handlePointerDown(ev, target, node) {
            if (hasPointerEventsNoneB(node)) {
                var fixed = pointerEventsNoneFix(ev.x, ev.y, target, node);
                target = fixed[0];
                node = fixed[1];
            }
            var button = ev.button + 1;
            var type = type2Bobril(ev.pointerType);
            var buttons = ev.buttons;
            if (button === 0 && type === 0 && buttons) {
                button = 1;
                while (!(buttons & 1)) {
                    buttons = buttons >> 1;
                    button++;
                }
            }
            var param = {
                id: ev.pointerId,
                type: type,
                x: ev.clientX,
                y: ev.clientY,
                button: button,
                shift: ev.shiftKey,
                ctrl: ev.ctrlKey,
                alt: ev.altKey,
                meta: ev.metaKey || false
            };
            if (emitEvent("!" + name, param, target, node)) {
                preventDefault(ev);
                return true;
            }
            return false;
        };
    }
    function buildHandlerTouch(name) {
        return function handlePointerDown(ev, target, node) {
            var preventDef = false;
            for (var i = 0; i < ev.changedTouches.length; i++) {
                var t = ev.changedTouches[i];
                target = document.elementFromPoint(t.clientX, t.clientY);
                node = deref(target);
                var param = {
                    id: t.identifier + 2,
                    type: 1,
                    x: t.clientX,
                    y: t.clientY,
                    button: 1,
                    shift: ev.shiftKey,
                    ctrl: ev.ctrlKey,
                    alt: ev.altKey,
                    meta: ev.metaKey || false
                };
                if (emitEvent("!" + name, param, target, node)) preventDef = true;
            }
            if (preventDef) {
                preventDefault(ev);
                return true;
            }
            return false;
        };
    }
    function buildHandlerMouse(name) {
        return function handlePointer(ev, target, node) {
            target = document.elementFromPoint(ev.clientX, ev.clientY);
            node = deref(target);
            if (hasPointerEventsNoneB(node)) {
                var fixed = pointerEventsNoneFix(ev.clientX, ev.clientY, target, node);
                target = fixed[0];
                node = fixed[1];
            }
            var param = {
                id: 1,
                type: 0,
                x: ev.clientX,
                y: ev.clientY,
                button: decodeButton(ev),
                shift: ev.shiftKey,
                ctrl: ev.ctrlKey,
                alt: ev.altKey,
                meta: ev.metaKey || false
            };
            if (emitEvent("!" + name, param, target, node)) {
                preventDefault(ev);
                return true;
            }
            return false;
        };
    }
    if (window.onpointerdown !== undefined) {
        for (i = 0; i < 4; i++) {
            var name = pointersEventNames[i];
            addEvent5(name.toLowerCase(), buildHandlerPointer(name));
        }
    } else if (window.onmspointerdown !== undefined) {
        for (i = 0; i < 4; i++) {
            var name = pointersEventNames[i];
            addEvent5("MS" + name, buildHandlerPointer(name));
        }
    } else {
        if (window.ontouchstart !== undefined) {
            addEvent5("touchstart", buildHandlerTouch(pointersEventNames[0]));
            addEvent5("touchmove", buildHandlerTouch(pointersEventNames[1]));
            addEvent5("touchend", buildHandlerTouch(pointersEventNames[2]));
            addEvent5("touchcancel", buildHandlerTouch(pointersEventNames[3]));
        }
        addEvent5("mousedown", buildHandlerMouse(pointersEventNames[0]));
        addEvent5("mousemove", buildHandlerMouse(pointersEventNames[1]));
        addEvent5("mouseup", buildHandlerMouse(pointersEventNames[2]));
    }
    for (var j = 0; j < 4; j++) {
        (function(name) {
            var onname = "on" + name;
            addEvent("!" + name, 50, function(ev, target, node) {
                return invokeMouseOwner(onname, ev) || bubble(node, onname, ev) != null;
            });
        })(pointersEventNames[j]);
    }
    var pointersDown = newHashObj();
    var toBust = [];
    var firstPointerDown = -1;
    var firstPointerDownTime = 0;
    var firstPointerDownX = 0;
    var firstPointerDownY = 0;
    var tapCanceled = false;
    function diffLess(n1, n2, diff) {
        return Math.abs(n1 - n2) < diff;
    }
    var prevMousePath = [];
    function mouseEnterAndLeave(ev) {
        var t = document.elementFromPoint(ev.x, ev.y);
        var toPath = vdomPath(t);
        var node = toPath.length == 0 ? null : toPath[toPath.length - 1];
        if (hasPointerEventsNoneB(node)) {
            var fixed = pointerEventsNoneFix(ev.x, ev.y, t, node);
            t = fixed[0];
            toPath = vdomPath(t);
        }
        bubble(node, "onMouseOver", ev);
        var common = 0;
        while (common < prevMousePath.length && common < toPath.length && prevMousePath[common] === toPath[common]) common++;
        var i = prevMousePath.length;
        var n;
        var c;
        while (i > common) {
            i--;
            n = prevMousePath[i];
            if (n) {
                c = n.component;
                if (c && c.onMouseLeave) c.onMouseLeave(n.ctx, ev);
            }
        }
        while (i < toPath.length) {
            n = toPath[i];
            if (n) {
                c = n.component;
                if (c && c.onMouseEnter) c.onMouseEnter(n.ctx, ev);
            }
            i++;
        }
        prevMousePath = toPath;
        return false;
    }
    function noPointersDown() {
        return Object.keys(pointersDown).length === 0;
    }
    function bustingPointerDown(ev, target, node) {
        if (firstPointerDown === -1 && noPointersDown()) {
            firstPointerDown = ev.id;
            firstPointerDownTime = __export_now();
            firstPointerDownX = ev.x;
            firstPointerDownY = ev.y;
            tapCanceled = false;
            mouseEnterAndLeave(ev);
        }
        pointersDown[ev.id] = ev.type;
        if (firstPointerDown !== ev.id) {
            tapCanceled = true;
        }
        return false;
    }
    function bustingPointerMove(ev, target, node) {
        if (ev.type === 0 && ev.button === 0 && pointersDown[ev.id] != null) {
            ev.button = 1;
            emitEvent("!PointerUp", ev, target, node);
            ev.button = 0;
        }
        if (firstPointerDown === ev.id) {
            mouseEnterAndLeave(ev);
            if (!diffLess(firstPointerDownX, ev.x, 13) || !diffLess(firstPointerDownY, ev.y, 13)) tapCanceled = true;
        } else if (noPointersDown()) {
            mouseEnterAndLeave(ev);
        }
        return false;
    }
    function bustingPointerUp(ev, target, node) {
        delete pointersDown[ev.id];
        if (firstPointerDown == ev.id) {
            mouseEnterAndLeave(ev);
            firstPointerDown = -1;
            if (ev.type == 1 && !tapCanceled) {
                if (__export_now() - firstPointerDownTime < 750) {
                    emitEvent("!PointerCancel", ev, target, node);
                    var handled = invokeMouseOwner(onClickText, ev) || bubble(node, onClickText, ev) != null;
                    var delay = ieVersion() ? 800 : 500;
                    toBust.push([ ev.x, ev.y, __export_now() + delay, handled ? 1 : 0 ]);
                    return handled;
                }
            }
        }
        return false;
    }
    function bustingPointerCancel(ev, target, node) {
        delete pointersDown[ev.id];
        if (firstPointerDown == ev.id) {
            firstPointerDown = -1;
        }
        return false;
    }
    function bustingClick(ev, target, node) {
        var n = __export_now();
        for (var i = 0; i < toBust.length; i++) {
            var j = toBust[i];
            if (j[2] < n) {
                toBust.splice(i, 1);
                i--;
                continue;
            }
            if (diffLess(j[0], ev.clientX, 50) && diffLess(j[1], ev.clientY, 50)) {
                toBust.splice(i, 1);
                if (j[3]) preventDefault(ev);
                return true;
            }
        }
        return false;
    }
    var bustingEventNames = [ "!PointerDown", "!PointerMove", "!PointerUp", "!PointerCancel", "click" ];
    var bustingEventHandlers = [ bustingPointerDown, bustingPointerMove, bustingPointerUp, bustingPointerCancel, bustingClick ];
    for (var i = 0; i < 5; i++) {
        addEvent(bustingEventNames[i], 3, bustingEventHandlers[i]);
    }
    function createHandlerMouse(handlerName) {
        return function(ev, target, node) {
            if (firstPointerDown != ev.id && !noPointersDown()) return false;
            if (invokeMouseOwner(handlerName, ev) || bubble(node, handlerName, ev)) {
                return true;
            }
            return false;
        };
    }
    var mouseHandlerNames = [ "Down", "Move", "Up", "Up" ];
    for (var i = 0; i < 4; i++) {
        addEvent(bustingEventNames[i], 80, createHandlerMouse("onMouse" + mouseHandlerNames[i]));
    }
    function decodeButton(ev) {
        return ev.which || ev.button;
    }
    function createHandler(handlerName) {
        return function(ev, target, node) {
            var button = decodeButton(ev) || 1;
            if (button !== 1) return false;
            var param = {
                x: ev.clientX,
                y: ev.clientY,
                button: button,
                shift: ev.shiftKey,
                ctrl: ev.ctrlKey,
                alt: ev.altKey,
                meta: ev.metaKey || false
            };
            if (invokeMouseOwner(handlerName, param) || bubble(node, handlerName, param)) {
                preventDefault(ev);
                return true;
            }
            return false;
        };
    }
    function nodeOnPoint(x, y) {
        var target = document.elementFromPoint(x, y);
        var node = deref(target);
        if (hasPointerEventsNoneB(node)) {
            var fixed = pointerEventsNoneFix(x, y, target, node);
            node = fixed[1];
        }
        return node;
    }
    function handleSelectStart(ev, target, node) {
        while (node) {
            var s = node.style;
            if (s) {
                var us = s.userSelect;
                if (us === "none") {
                    preventDefault(ev);
                    return true;
                }
                if (us) {
                    break;
                }
            }
            node = node.parent;
        }
        return false;
    }
    addEvent5("selectstart", handleSelectStart);
    addEvent5("click", createHandler(onClickText));
    addEvent5("dblclick", createHandler("onDoubleClick"));
    var __export_pointersDownCount = function() {
        return Object.keys(pointersDown).length;
    };
    var __export_firstPointerDownId = function() {
        return firstPointerDown;
    };
    var __export_ignoreClick = function(x, y) {
        var delay = ieVersion() ? 800 : 500;
        toBust.push([ x, y, __export_now() + delay, 1 ]);
    };
    var currentActiveElement = null;
    var currentFocusedNode = null;
    var nodestack = [];
    function emitOnFocusChange() {
        var newActiveElement = document.hasFocus() ? document.activeElement : null;
        if (newActiveElement !== currentActiveElement) {
            currentActiveElement = newActiveElement;
            var newstack = vdomPath(currentActiveElement);
            var common = 0;
            while (common < nodestack.length && common < newstack.length && nodestack[common] === newstack[common]) common++;
            var i = nodestack.length - 1;
            var n;
            var c;
            if (i >= common) {
                n = nodestack[i];
                if (n) {
                    c = n.component;
                    if (c && c.onBlur) c.onBlur(n.ctx);
                }
                i--;
            }
            while (i >= common) {
                n = nodestack[i];
                if (n) {
                    c = n.component;
                    if (c && c.onFocusOut) c.onFocusOut(n.ctx);
                }
                i--;
            }
            i = common;
            while (i + 1 < newstack.length) {
                n = newstack[i];
                if (n) {
                    c = n.component;
                    if (c && c.onFocusIn) c.onFocusIn(n.ctx);
                }
                i++;
            }
            if (i < newstack.length) {
                n = newstack[i];
                if (n) {
                    c = n.component;
                    if (c && c.onFocus) c.onFocus(n.ctx);
                }
                i++;
            }
            nodestack = newstack;
            currentFocusedNode = nodestack.length == 0 ? null : nodestack[nodestack.length - 1];
        }
    }
    function emitOnFocusChangeIE() {
        setTimeout(emitOnFocusChange, 10);
        emitOnFocusChange();
    }
    var events = [ "focus", "blur", "keydown", "keyup", "keypress", "mousedown", "mouseup", "mousemove", "touchstart", "touchend" ];
    for (var i = 0; i < events.length; i++) addEvent(events[i], 50, ieVersion() ? emitOnFocusChangeIE : emitOnFocusChange);
    function focused() {
        return currentFocusedNode;
    }
    var focusableTag = /^input$|^select$|^textarea$|^button$/;
    function focus(node) {
        if (node == null) return false;
        if (typeof node === "string") return false;
        var style = node.style;
        if (style != null) {
            if (style.visibility === "hidden") return false;
            if (style.display === "none") return false;
        }
        var attrs = node.attrs;
        if (attrs != null) {
            var ti = attrs.tabindex || attrs.tabIndex;
            if (ti !== undefined || focusableTag.test(node.tag)) {
                var el = node.element;
                el.focus();
                emitOnFocusChange();
                return true;
            }
        }
        var children = node.children;
        if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                if (focus(children[i])) return true;
            }
            return false;
        }
        return focus(children);
    }
    var callbacks = [];
    function emitOnScroll() {
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i]();
        }
        return false;
    }
    addEvent("^scroll", 10, emitOnScroll);
    function addOnScroll(callback) {
        callbacks.push(callback);
    }
    function removeOnScroll(callback) {
        for (var i = 0; i < callbacks.length; i++) {
            if (callbacks[i] === callback) {
                callbacks.splice(i, 1);
                return;
            }
        }
    }
    var isHtml = /^(?:html)$/i;
    var isScrollOrAuto = /^(?:auto)$|^(?:scroll)$/i;
    function isScrollable(el) {
        var styles = window.getComputedStyle(el);
        var res = [ true, true ];
        if (!isHtml.test(el.nodeName)) {
            res[0] = isScrollOrAuto.test(styles.overflowX);
            res[1] = isScrollOrAuto.test(styles.overflowY);
        }
        res[0] = res[0] && el.scrollWidth > el.clientWidth;
        res[1] = res[1] && el.scrollHeight > el.clientHeight;
        return res;
    }
    function getWindowScroll() {
        var left = window.pageXOffset;
        var top = window.pageYOffset;
        return [ left, top ];
    }
    var lastDndId = 0;
    var dnds = [];
    var systemdnd = null;
    var rootId = null;
    var bodyCursorBackup;
    var userSelectBackup;
    var shimedStyle = {
        userSelect: ""
    };
    shimStyle(shimedStyle);
    var shimedStyleKeys = Object.keys(shimedStyle);
    var userSelectPropName = shimedStyleKeys[shimedStyleKeys.length - 1];
    var DndCtx = function(pointerId) {
        this.id = ++lastDndId;
        this.pointerid = pointerId;
        this.enabledOperations = 7;
        this.operation = 0;
        this.started = false;
        this.beforeDrag = true;
        this.local = true;
        this.system = false;
        this.ended = false;
        this.cursor = null;
        this.overNode = null;
        this.targetCtx = null;
        this.dragView = null;
        this.startX = 0;
        this.startY = 0;
        this.distanceToStart = 10;
        this.x = 0;
        this.y = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.totalX = 0;
        this.totalY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.shift = false;
        this.ctrl = false;
        this.alt = false;
        this.meta = false;
        this.data = newHashObj();
        if (pointerId >= 0) pointer2Dnd[pointerId] = this;
        dnds.push(this);
    };
    function lazyCreateRoot() {
        if (rootId == null) {
            var dbs = document.body.style;
            bodyCursorBackup = dbs.cursor;
            userSelectBackup = dbs[userSelectPropName];
            dbs[userSelectPropName] = "none";
            rootId = addRoot(dndRootFactory);
        }
    }
    var DndComp = {
        render: function(ctx, me) {
            var dnd = ctx.data;
            me.tag = "div";
            me.style = {
                position: "absolute",
                left: dnd.x,
                top: dnd.y
            };
            me.children = dnd.dragView(dnd);
        }
    };
    function currentCursor() {
        var cursor = "no-drop";
        if (dnds.length !== 0) {
            var dnd = dnds[0];
            if (dnd.beforeDrag) return "";
            if (dnd.cursor != null) return dnd.cursor;
            if (dnd.system) return "";
            switch (dnd.operation) {
              case 3:
                cursor = "move";
                break;

              case 1:
                cursor = "alias";
                break;

              case 2:
                cursor = "copy";
                break;
            }
        }
        return cursor;
    }
    var DndRootComp = {
        render: function(ctx, me) {
            var res = [];
            for (var i = 0; i < dnds.length; i++) {
                var dnd = dnds[i];
                if (dnd.beforeDrag) continue;
                if (dnd.dragView != null && (dnd.x != 0 || dnd.y != 0)) {
                    res.push({
                        key: "" + dnd.id,
                        data: dnd,
                        component: DndComp
                    });
                }
            }
            me.tag = "div";
            me.style = {
                position: "fixed",
                pointerEvents: "none",
                userSelect: "none",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0
            };
            var dbs = document.body.style;
            var cur = currentCursor();
            if (cur && dbs.cursor !== cur) dbs.cursor = cur;
            me.children = res;
        },
        onDrag: function(ctx) {
            __export_invalidate(ctx);
            return false;
        }
    };
    function dndRootFactory() {
        return {
            component: DndRootComp
        };
    }
    var dndProto = DndCtx.prototype;
    dndProto.setOperation = function(operation) {
        this.operation = operation;
    };
    dndProto.setDragNodeView = function(view) {
        this.dragView = view;
    };
    dndProto.addData = function(type, data) {
        this.data[type] = data;
        return true;
    };
    dndProto.listData = function() {
        return Object.keys(this.data);
    };
    dndProto.hasData = function(type) {
        return this.data[type] !== undefined;
    };
    dndProto.getData = function(type) {
        return this.data[type];
    };
    dndProto.setEnabledOps = function(ops) {
        this.enabledOperations = ops;
    };
    dndProto.cancelDnd = function() {
        dndmoved(null, this);
        this.destroy();
    };
    dndProto.destroy = function() {
        this.ended = true;
        if (this.started) broadcast("onDragEnd", this);
        delete pointer2Dnd[this.pointerid];
        for (var i = 0; i < dnds.length; i++) {
            if (dnds[i] === this) {
                dnds.splice(i, 1);
                break;
            }
        }
        if (systemdnd === this) {
            systemdnd = null;
        }
        if (dnds.length === 0 && rootId != null) {
            removeRoot(rootId);
            rootId = null;
            var dbs = document.body.style;
            dbs.cursor = bodyCursorBackup;
            dbs[userSelectPropName] = userSelectBackup;
        }
    };
    var pointer2Dnd = newHashObj();
    function handlePointerDown(ev, target, node) {
        var dnd = pointer2Dnd[ev.id];
        if (dnd) {
            dnd.cancelDnd();
        }
        if (ev.button <= 1) {
            dnd = new DndCtx(ev.id);
            dnd.startX = ev.x;
            dnd.startY = ev.y;
            dnd.lastX = ev.x;
            dnd.lastY = ev.y;
            dnd.overNode = node;
            updateDndFromPointerEvent(dnd, ev);
            var sourceCtx = bubble(node, "onDragStart", dnd);
            if (sourceCtx) {
                var htmlNode = getDomNode(sourceCtx.me);
                if (htmlNode == null) {
                    dnd.destroy();
                    return false;
                }
                dnd.started = true;
                var boundFn = htmlNode.getBoundingClientRect;
                if (boundFn) {
                    var rect = boundFn.call(htmlNode);
                    dnd.deltaX = rect.left - ev.x;
                    dnd.deltaY = rect.top - ev.y;
                }
                if (dnd.distanceToStart <= 0) {
                    dnd.beforeDrag = false;
                    dndmoved(node, dnd);
                }
                lazyCreateRoot();
            } else {
                dnd.destroy();
            }
        }
        return false;
    }
    function dndmoved(node, dnd) {
        dnd.overNode = node;
        dnd.targetCtx = bubble(node, "onDragOver", dnd);
        if (dnd.targetCtx == null) {
            dnd.operation = 0;
        }
        broadcast("onDrag", dnd);
    }
    function updateDndFromPointerEvent(dnd, ev) {
        dnd.shift = ev.shift;
        dnd.ctrl = ev.ctrl;
        dnd.alt = ev.alt;
        dnd.meta = ev.meta;
        dnd.x = ev.x;
        dnd.y = ev.y;
    }
    function handlePointerMove(ev, target, node) {
        var dnd = pointer2Dnd[ev.id];
        if (!dnd) return false;
        dnd.totalX += Math.abs(ev.x - dnd.lastX);
        dnd.totalY += Math.abs(ev.y - dnd.lastY);
        if (dnd.beforeDrag) {
            if (dnd.totalX + dnd.totalY <= dnd.distanceToStart) {
                dnd.lastX = ev.x;
                dnd.lastY = ev.y;
                return false;
            }
            dnd.beforeDrag = false;
        }
        updateDndFromPointerEvent(dnd, ev);
        dndmoved(node, dnd);
        dnd.lastX = ev.x;
        dnd.lastY = ev.y;
        return true;
    }
    function handlePointerUp(ev, target, node) {
        var dnd = pointer2Dnd[ev.id];
        if (!dnd) return false;
        if (!dnd.beforeDrag) {
            updateDndFromPointerEvent(dnd, ev);
            dndmoved(node, dnd);
            var t = dnd.targetCtx;
            if (t && bubble(t.me, "onDrop", dnd)) {
                dnd.destroy();
            } else {
                dnd.cancelDnd();
            }
            __export_ignoreClick(ev.x, ev.y);
            return true;
        }
        dnd.destroy();
        return false;
    }
    function handlePointerCancel(ev, target, node) {
        var dnd = pointer2Dnd[ev.id];
        if (!dnd) return false;
        if (!dnd.beforeDrag) {
            dnd.cancelDnd();
        } else {
            dnd.destroy();
        }
        return false;
    }
    function updateFromNative(dnd, ev) {
        dnd.shift = ev.shiftKey;
        dnd.ctrl = ev.ctrlKey;
        dnd.alt = ev.altKey;
        dnd.meta = ev.metaKey;
        dnd.x = ev.clientX;
        dnd.y = ev.clientY;
        dnd.totalX += Math.abs(dnd.x - dnd.lastX);
        dnd.totalY += Math.abs(dnd.y - dnd.lastY);
        var node = nodeOnPoint(dnd.x, dnd.y);
        dndmoved(node, dnd);
        dnd.lastX = dnd.x;
        dnd.lastY = dnd.y;
    }
    var effectAllowedTable = [ "none", "link", "copy", "copyLink", "move", "linkMove", "copyMove", "all" ];
    function handleDragStart(ev, target, node) {
        var dnd = systemdnd;
        if (dnd != null) {
            dnd.destroy();
        }
        var activePointerIds = Object.keys(pointer2Dnd);
        if (activePointerIds.length > 0) {
            dnd = pointer2Dnd[activePointerIds[0]];
            dnd.system = true;
            systemdnd = dnd;
        } else {
            var startX = ev.clientX, startY = ev.clientY;
            dnd = new DndCtx(-1);
            dnd.system = true;
            systemdnd = dnd;
            dnd.x = startX;
            dnd.y = startY;
            dnd.lastX = startX;
            dnd.lastY = startY;
            dnd.startX = startX;
            dnd.startY = startY;
            var sourceCtx = bubble(node, "onDragStart", dnd);
            if (sourceCtx) {
                var htmlNode = getDomNode(sourceCtx.me);
                if (htmlNode == null) {
                    dnd.destroy();
                    return false;
                }
                dnd.started = true;
                var boundFn = htmlNode.getBoundingClientRect;
                if (boundFn) {
                    var rect = boundFn.call(htmlNode);
                    dnd.deltaX = rect.left - startX;
                    dnd.deltaY = rect.top - startY;
                }
                lazyCreateRoot();
            } else {
                dnd.destroy();
                return false;
            }
        }
        dnd.beforeDrag = false;
        var eff = effectAllowedTable[dnd.enabledOperations];
        var dt = ev.dataTransfer;
        dt.effectAllowed = eff;
        if (dt.setDragImage) {
            var div = document.createElement("div");
            div.style.pointerEvents = "none";
            dt.setDragImage(div, 0, 0);
        } else {
            var style = ev.target.style;
            var opacityBackup = style.opacity;
            var widthBackup = style.width;
            var heightBackup = style.height;
            var paddingBackup = style.padding;
            style.opacity = "0";
            style.width = "0";
            style.height = "0";
            style.padding = "0";
            window.setTimeout(function() {
                style.opacity = opacityBackup;
                style.width = widthBackup;
                style.height = heightBackup;
                style.padding = paddingBackup;
            }, 0);
        }
        var datas = dnd.data;
        var dataKeys = Object.keys(datas);
        for (var i = 0; i < dataKeys.length; i++) {
            try {
                var k = dataKeys[i];
                var d = datas[k];
                if (typeof d !== "string") d = JSON.stringify(d);
                ev.dataTransfer.setData(k, d);
            } catch (e) {
                if (DEBUG) if (window.console) console.log("Cannot set dnd data to " + dataKeys[i]);
            }
        }
        updateFromNative(dnd, ev);
        return false;
    }
    function setDropEffect(ev, op) {
        ev.dataTransfer.dropEffect = [ "none", "link", "copy", "move" ][op];
    }
    function handleDragOver(ev, target, node) {
        var dnd = systemdnd;
        if (dnd == null) {
            dnd = new DndCtx(-1);
            dnd.system = true;
            systemdnd = dnd;
            dnd.x = ev.clientX;
            dnd.y = ev.clientY;
            dnd.startX = dnd.x;
            dnd.startY = dnd.y;
            dnd.local = false;
            var dt = ev.dataTransfer;
            var eff = 0;
            try {
                var effectAllowed = dt.effectAllowed;
            } catch (e) {}
            for (;eff < 7; eff++) {
                if (effectAllowedTable[eff] === effectAllowed) break;
            }
            dnd.enabledOperations = eff;
            var dttypes = dt.types;
            if (dttypes) {
                for (var i = 0; i < dttypes.length; i++) {
                    var tt = dttypes[i];
                    if (tt === "text/plain") tt = "Text"; else if (tt === "text/uri-list") tt = "Url";
                    dnd.data[tt] = null;
                }
            } else {
                if (dt.getData("Text") !== undefined) dnd.data["Text"] = null;
            }
        }
        updateFromNative(dnd, ev);
        setDropEffect(ev, dnd.operation);
        if (dnd.operation != 0) {
            preventDefault(ev);
            return true;
        }
        return false;
    }
    function handleDrag(ev, target, node) {
        var x = ev.clientX;
        var y = ev.clientY;
        var m = getMedia();
        if (systemdnd != null && (x === 0 && y === 0 || x < 0 || y < 0 || x >= m.width || y >= m.height)) {
            systemdnd.x = 0;
            systemdnd.y = 0;
            systemdnd.operation = 0;
            broadcast("onDrag", systemdnd);
        }
        return false;
    }
    function handleDragEnd(ev, target, node) {
        if (systemdnd != null) {
            systemdnd.destroy();
        }
        return false;
    }
    function handleDrop(ev, target, node) {
        var dnd = systemdnd;
        if (dnd == null) return false;
        dnd.x = ev.clientX;
        dnd.y = ev.clientY;
        if (!dnd.local) {
            var dataKeys = Object.keys(dnd.data);
            var dt = ev.dataTransfer;
            for (var i_4 = 0; i_4 < dataKeys.length; i_4++) {
                var k = dataKeys[i_4];
                var d;
                if (k === "Files") {
                    d = [].slice.call(dt.files, 0);
                } else {
                    d = dt.getData(k);
                }
                dnd.data[k] = d;
            }
        }
        updateFromNative(dnd, ev);
        var t = dnd.targetCtx;
        if (t && bubble(t.me, "onDrop", dnd)) {
            setDropEffect(ev, dnd.operation);
            dnd.destroy();
            preventDefault(ev);
        } else {
            dnd.cancelDnd();
        }
        return true;
    }
    function justPreventDefault(ev, target, node) {
        preventDefault(ev);
        return true;
    }
    function handleDndSelectStart(ev, target, node) {
        if (dnds.length === 0) return false;
        preventDefault(ev);
        return true;
    }
    function anyActiveDnd() {
        for (var i_5 = 0; i_5 < dnds.length; i_5++) {
            var dnd = dnds[i_5];
            if (dnd.beforeDrag) continue;
            return dnd;
        }
        return null;
    }
    addEvent("!PointerDown", 4, handlePointerDown);
    addEvent("!PointerMove", 4, handlePointerMove);
    addEvent("!PointerUp", 4, handlePointerUp);
    addEvent("!PointerCancel", 4, handlePointerCancel);
    addEvent("selectstart", 4, handleDndSelectStart);
    addEvent("dragstart", 5, handleDragStart);
    addEvent("dragover", 5, handleDragOver);
    addEvent("dragend", 5, handleDragEnd);
    addEvent("drag", 5, handleDrag);
    addEvent("drop", 5, handleDrop);
    addEvent("dragenter", 5, justPreventDefault);
    addEvent("dragleave", 5, justPreventDefault);
    var __export_getDnds = function() {
        return dnds;
    };
    function emitOnHashChange() {
        __export_invalidate();
        return false;
    }
    addEvent("hashchange", 10, emitOnHashChange);
    var myAppHistoryDeepness = 0;
    var programPath = "";
    function push(path, inapp) {
        var l = window.location;
        if (inapp) {
            programPath = path;
            l.hash = path.substring(1);
            myAppHistoryDeepness++;
        } else {
            l.href = path;
        }
    }
    function replace(path, inapp) {
        var l = window.location;
        if (inapp) {
            programPath = path;
            l.replace(l.pathname + l.search + path);
        } else {
            l.replace(path);
        }
    }
    function pop() {
        myAppHistoryDeepness--;
        window.history.back();
    }
    var rootRoutes;
    var nameRouteMap = {};
    function encodeUrl(url) {
        return encodeURIComponent(url).replace(/%20/g, "+");
    }
    function decodeUrl(url) {
        return decodeURIComponent(url.replace(/\+/g, " "));
    }
    function encodeUrlPath(path) {
        return String(path).split("/").map(encodeUrl).join("/");
    }
    var paramCompileMatcher = /:([a-zA-Z_$][a-zA-Z0-9_$]*)|[*.()\[\]\\+|{}^$]/g;
    var paramInjectMatcher = /:([a-zA-Z_$][a-zA-Z0-9_$?]*[?]?)|[*]/g;
    var compiledPatterns = {};
    function compilePattern(pattern) {
        if (!(pattern in compiledPatterns)) {
            var paramNames = [];
            var source = pattern.replace(paramCompileMatcher, function(match, paramName) {
                if (paramName) {
                    paramNames.push(paramName);
                    return "([^/?#]+)";
                } else if (match === "*") {
                    paramNames.push("splat");
                    return "(.*?)";
                } else {
                    return "\\" + match;
                }
            });
            compiledPatterns[pattern] = {
                matcher: new RegExp("^" + source + "$", "i"),
                paramNames: paramNames
            };
        }
        return compiledPatterns[pattern];
    }
    function extractParamNames(pattern) {
        return compilePattern(pattern).paramNames;
    }
    function extractParams(pattern, path) {
        var object = compilePattern(pattern);
        var match = decodeUrl(path).match(object.matcher);
        if (!match) return null;
        var params = {};
        var pn = object.paramNames;
        var l = pn.length;
        for (var i = 0; i < l; i++) {
            params[pn[i]] = match[i + 1];
        }
        return params;
    }
    function injectParams(pattern, params) {
        params = params || {};
        var splatIndex = 0;
        return pattern.replace(paramInjectMatcher, function(match, paramName) {
            paramName = paramName || "splat";
            if (paramName.slice(-1) !== "?") {
                if (params[paramName] == null) throw new Error('Missing "' + paramName + '" parameter for path "' + pattern + '"');
            } else {
                paramName = paramName.slice(0, -1);
                if (params[paramName] == null) {
                    return "";
                }
            }
            var segment;
            if (paramName === "splat" && Array.isArray(params[paramName])) {
                segment = params[paramName][splatIndex++];
                if (segment == null) throw new Error("Missing splat # " + splatIndex + ' for path "' + pattern + '"');
            } else {
                segment = params[paramName];
            }
            return encodeUrlPath(segment);
        });
    }
    function findMatch(path, rs, outParams) {
        var l = rs.length;
        var notFoundRoute;
        var defaultRoute;
        var params;
        for (var i = 0; i < l; i++) {
            var r = rs[i];
            if (r.isNotFound) {
                notFoundRoute = r;
                continue;
            }
            if (r.isDefault) {
                defaultRoute = r;
                continue;
            }
            if (r.children) {
                var res = findMatch(path, r.children, outParams);
                if (res) {
                    res.push(r);
                    return res;
                }
            }
            if (r.url) {
                params = extractParams(r.url, path);
                if (params) {
                    outParams.p = params;
                    return [ r ];
                }
            }
        }
        if (defaultRoute) {
            params = extractParams(defaultRoute.url, path);
            if (params) {
                outParams.p = params;
                return [ defaultRoute ];
            }
        }
        if (notFoundRoute) {
            params = extractParams(notFoundRoute.url, path);
            if (params) {
                outParams.p = params;
                return [ notFoundRoute ];
            }
        }
        return null;
    }
    var activeRoutes = [];
    var futureRoutes;
    var activeParams = newHashObj();
    var nodesArray = [];
    var setterOfNodesArray = [];
    var urlRegex = /.*(?:\:|\/).*/;
    function isInApp(name) {
        return !urlRegex.test(name);
    }
    function isAbsolute(url) {
        return url[0] === "/";
    }
    function noop() {
        return null;
    }
    function getSetterOfNodesArray(idx) {
        while (idx >= setterOfNodesArray.length) {
            setterOfNodesArray.push(function(a, i) {
                return function(n) {
                    if (n) a[i] = n;
                };
            }(nodesArray, idx));
        }
        return setterOfNodesArray[idx];
    }
    var firstRouting = true;
    function rootNodeFactory() {
        var browserPath = window.location.hash;
        var path = browserPath.substr(1);
        if (!isAbsolute(path)) path = "/" + path;
        var out = {
            p: {}
        };
        var matches = findMatch(path, rootRoutes, out) || [];
        if (firstRouting) {
            firstRouting = false;
            currentTransition = {
                inApp: true,
                type: 2,
                name: null,
                params: null
            };
            transitionState = -1;
            programPath = browserPath;
        } else {
            if (!currentTransition && matches.length > 0 && browserPath != programPath) {
                runTransition(createRedirectPush(matches[0].name, out.p));
            }
        }
        if (currentTransition && currentTransition.type === 2 && transitionState < 0) {
            currentTransition.inApp = true;
            if (currentTransition.name == null && matches.length > 0) {
                currentTransition.name = matches[0].name;
                currentTransition.params = out.p;
                nextIteration();
            }
            return null;
        }
        if (currentTransition == null) {
            activeRoutes = matches;
            while (nodesArray.length > activeRoutes.length) nodesArray.pop();
            while (nodesArray.length < activeRoutes.length) nodesArray.push(null);
            activeParams = out.p;
        }
        var fn = noop;
        for (var i = 0; i < activeRoutes.length; i++) {
            (function(fninner, r, routeParams, i) {
                fn = function(otherdata) {
                    var data = r.data || {};
                    assign(data, otherdata);
                    data.activeRouteHandler = fninner;
                    data.routeParams = routeParams;
                    var handler = r.handler;
                    var res;
                    if (typeof handler === "function") {
                        res = handler(data);
                    } else {
                        res = {
                            key: undefined,
                            ref: undefined,
                            data: data,
                            component: handler
                        };
                    }
                    if (r.keyBuilder) res.key = r.keyBuilder(routeParams); else res.key = r.name;
                    res.ref = getSetterOfNodesArray(i);
                    return res;
                };
            })(fn, activeRoutes[i], activeParams, i);
        }
        return fn();
    }
    function joinPath(p1, p2) {
        if (isAbsolute(p2)) return p2;
        if (p1[p1.length - 1] === "/") return p1 + p2;
        return p1 + "/" + p2;
    }
    function registerRoutes(url, rs) {
        var l = rs.length;
        for (var i = 0; i < l; i++) {
            var r = rs[i];
            var u = url;
            var name = r.name;
            if (!name && url === "/") {
                name = "root";
                r.name = name;
                nameRouteMap[name] = r;
            } else if (name) {
                nameRouteMap[name] = r;
                u = joinPath(u, name);
            }
            if (r.isDefault) {
                u = url;
            } else if (r.isNotFound) {
                u = joinPath(url, "*");
            } else if (r.url) {
                u = joinPath(url, r.url);
            }
            r.url = u;
            if (r.children) registerRoutes(u, r.children);
        }
    }
    function routes(rootroutes) {
        if (!isArray(rootroutes)) {
            rootroutes = [ rootroutes ];
        }
        registerRoutes("/", rootroutes);
        rootRoutes = rootroutes;
        init(rootNodeFactory);
    }
    function route(config, nestedRoutes) {
        return {
            name: config.name,
            url: config.url,
            data: config.data,
            handler: config.handler,
            keyBuilder: config.keyBuilder,
            children: nestedRoutes
        };
    }
    function routeDefault(config) {
        return {
            name: config.name,
            data: config.data,
            handler: config.handler,
            keyBuilder: config.keyBuilder,
            isDefault: true
        };
    }
    function routeNotFound(config) {
        return {
            name: config.name,
            data: config.data,
            handler: config.handler,
            keyBuilder: config.keyBuilder,
            isNotFound: true
        };
    }
    function isActive(name, params) {
        if (params) {
            for (var prop in params) {
                if (params.hasOwnProperty(prop)) {
                    if (activeParams[prop] !== params[prop]) return false;
                }
            }
        }
        for (var i = 0, l = activeRoutes.length; i < l; i++) {
            if (activeRoutes[i].name === name) {
                return true;
            }
        }
        return false;
    }
    function urlOfRoute(name, params) {
        if (isInApp(name)) {
            var r = nameRouteMap[name];
            if (DEBUG) {
                if (rootRoutes == null) throw Error("Cannot use urlOfRoute before defining routes");
                if (r == null) throw Error("Route with name " + name + " if not defined in urlOfRoute");
            }
            return "#" + injectParams(r.url, params);
        }
        return name;
    }
    function link(node, name, params) {
        node.data = node.data || {};
        node.data.routeName = name;
        node.data.routeParams = params;
        postEnhance(node, {
            render: function(ctx, me) {
                var data = ctx.data;
                me.attrs = me.attrs || {};
                if (me.tag === "a") {
                    me.attrs.href = urlOfRoute(data.routeName, data.routeParams);
                }
                me.className = me.className || "";
                if (isActive(data.routeName, data.routeParams)) {
                    me.className += " active";
                }
            },
            onClick: function(ctx) {
                var data = ctx.data;
                runTransition(createRedirectPush(data.routeName, data.routeParams));
                return true;
            }
        });
        return node;
    }
    function createRedirectPush(name, params) {
        return {
            inApp: isInApp(name),
            type: 0,
            name: name,
            params: params || {}
        };
    }
    function createRedirectReplace(name, params) {
        return {
            inApp: isInApp(name),
            type: 1,
            name: name,
            params: params || {}
        };
    }
    function createBackTransition() {
        return {
            inApp: myAppHistoryDeepness > 0,
            type: 2,
            name: null,
            params: {}
        };
    }
    var currentTransition = null;
    var nextTransition = null;
    var transitionState = 0;
    function doAction(transition) {
        switch (transition.type) {
          case 0:
            push(urlOfRoute(transition.name, transition.params), transition.inApp);
            break;

          case 1:
            replace(urlOfRoute(transition.name, transition.params), transition.inApp);
            break;

          case 2:
            pop();
            break;
        }
        __export_invalidate();
    }
    function nextIteration() {
        while (true) {
            if (transitionState >= 0 && transitionState < activeRoutes.length) {
                var node = nodesArray[transitionState];
                transitionState++;
                if (!node) continue;
                var comp = node.component;
                if (!comp) continue;
                var fn = comp.canDeactivate;
                if (!fn) continue;
                var res = fn.call(comp, node.ctx, currentTransition);
                Promise.resolve(res).then(function(resp) {
                    if (resp === true) {} else if (resp === false) {
                        currentTransition = null;
                        nextTransition = null;
                        return;
                    } else {
                        nextTransition = resp;
                    }
                    nextIteration();
                }).catch(function(err) {
                    if (typeof console !== "undefined" && console.log) console.log(err);
                });
                return;
            } else if (transitionState == activeRoutes.length) {
                if (nextTransition) {
                    if (currentTransition && currentTransition.type == 0) {
                        push(urlOfRoute(currentTransition.name, currentTransition.params), currentTransition.inApp);
                    }
                    currentTransition = nextTransition;
                    nextTransition = null;
                }
                transitionState = -1;
                if (!currentTransition.inApp || currentTransition.type === 2) {
                    doAction(currentTransition);
                    return;
                }
            } else if (transitionState === -1) {
                var out = {
                    p: {}
                };
                if (currentTransition.inApp) {
                    futureRoutes = findMatch(urlOfRoute(currentTransition.name, currentTransition.params).substring(1), rootRoutes, out) || [];
                } else {
                    futureRoutes = [];
                }
                transitionState = -2;
            } else if (transitionState === -2 - futureRoutes.length) {
                if (nextTransition) {
                    transitionState = activeRoutes.length;
                    continue;
                }
                if (currentTransition.type !== 2) {
                    doAction(currentTransition);
                } else {
                    __export_invalidate();
                }
                currentTransition = null;
                return;
            } else {
                if (nextTransition) {
                    transitionState = activeRoutes.length;
                    continue;
                }
                var rr = futureRoutes[futureRoutes.length + 1 + transitionState];
                transitionState--;
                var handler = rr.handler;
                var comp = null;
                if (typeof handler === "function") {
                    var node = handler({});
                    if (!node) continue;
                    comp = node.component;
                } else {
                    comp = handler;
                }
                if (!comp) continue;
                var fn = comp.canActivate;
                if (!fn) continue;
                var res = fn.call(comp, currentTransition);
                Promise.resolve(res).then(function(resp) {
                    if (resp === true) {} else if (resp === false) {
                        currentTransition = null;
                        nextTransition = null;
                        return;
                    } else {
                        nextTransition = resp;
                    }
                    nextIteration();
                }).catch(function(err) {
                    if (typeof console !== "undefined" && console.log) console.log(err);
                });
                return;
            }
        }
    }
    function runTransition(transition) {
        if (currentTransition != null) {
            nextTransition = transition;
            return;
        }
        firstRouting = false;
        currentTransition = transition;
        transitionState = 0;
        nextIteration();
    }
    function getRoutes() {
        return rootRoutes;
    }
    function getActiveRoutes() {
        return activeRoutes;
    }
    function getActiveParams() {
        return activeParams;
    }
    var allStyles = newHashObj();
    var allSprites = newHashObj();
    var allNameHints = newHashObj();
    var dynamicSprites = [];
    var imageCache = newHashObj();
    var rebuildStyles = false;
    var htmlStyle = null;
    var globalCounter = 0;
    var isIE9 = ieVersion() === 9;
    var chainedBeforeFrame = setBeforeFrame(beforeFrame);
    var cssSubRuleDelimiter = /\:|\ |\>/;
    function buildCssSubRule(parent) {
        var matchSplit = cssSubRuleDelimiter.exec(parent);
        if (!matchSplit) return allStyles[parent].name;
        var posSplit = matchSplit.index;
        return allStyles[parent.substring(0, posSplit)].name + parent.substring(posSplit);
    }
    function buildCssRule(parent, name) {
        var result = "";
        if (parent) {
            if (isArray(parent)) {
                for (var i_6 = 0; i_6 < parent.length; i_6++) {
                    if (i_6 > 0) {
                        result += ",";
                    }
                    result += "." + buildCssSubRule(parent[i_6]) + "." + name;
                }
            } else {
                result = "." + buildCssSubRule(parent) + "." + name;
            }
        } else {
            result = "." + name;
        }
        return result;
    }
    function flattenStyle(cur, curPseudo, style, stylePseudo) {
        if (typeof style === "string") {
            var externalStyle = allStyles[style];
            if (externalStyle === undefined) {
                throw new Error("uknown style " + style);
            }
            flattenStyle(cur, curPseudo, externalStyle.style, externalStyle.pseudo);
        } else if (typeof style === "function") {
            style(cur, curPseudo);
        } else if (isArray(style)) {
            for (var i_7 = 0; i_7 < style.length; i_7++) {
                flattenStyle(cur, curPseudo, style[i_7], undefined);
            }
        } else if (typeof style === "object") {
            for (var key in style) {
                if (!Object.prototype.hasOwnProperty.call(style, key)) continue;
                var val = style[key];
                if (typeof val === "function") {
                    val = val(cur, key);
                }
                cur[key] = val;
            }
        }
        if (stylePseudo != null && curPseudo != null) {
            for (var pseudoKey in stylePseudo) {
                var curPseudoVal = curPseudo[pseudoKey];
                if (curPseudoVal === undefined) {
                    curPseudoVal = newHashObj();
                    curPseudo[pseudoKey] = curPseudoVal;
                }
                flattenStyle(curPseudoVal, undefined, stylePseudo[pseudoKey], undefined);
            }
        }
    }
    function beforeFrame() {
        if (rebuildStyles) {
            for (var i_8 = 0; i_8 < dynamicSprites.length; i_8++) {
                var dynSprite = dynamicSprites[i_8];
                var image = imageCache[dynSprite.url];
                if (image == null) continue;
                var colorStr = dynSprite.color();
                if (colorStr !== dynSprite.lastColor) {
                    dynSprite.lastColor = colorStr;
                    if (dynSprite.width == null) dynSprite.width = image.width;
                    if (dynSprite.height == null) dynSprite.height = image.height;
                    var lastUrl = recolorAndClip(image, colorStr, dynSprite.width, dynSprite.height, dynSprite.left, dynSprite.top);
                    var stDef = allStyles[dynSprite.styleid];
                    stDef.style = {
                        backgroundImage: "url(" + lastUrl + ")",
                        width: dynSprite.width,
                        height: dynSprite.height
                    };
                }
            }
            var stylestr = "";
            for (var key in allStyles) {
                var ss = allStyles[key];
                var parent_1 = ss.parent;
                var name_1 = ss.name;
                var style_1 = newHashObj();
                var flattenPseudo = newHashObj();
                var sspseudo = ss.pseudo;
                var ssstyle = ss.style;
                if (typeof ssstyle === "function" && ssstyle.length === 0) {
                    _a = ssstyle(), ssstyle = _a[0], sspseudo = _a[1];
                }
                flattenStyle(undefined, flattenPseudo, undefined, sspseudo);
                flattenStyle(style_1, flattenPseudo, ssstyle, undefined);
                var extractedInlStyle = null;
                if (style_1["pointerEvents"]) {
                    extractedInlStyle = newHashObj();
                    extractedInlStyle["pointerEvents"] = style_1["pointerEvents"];
                }
                if (isIE9) {
                    if (style_1["userSelect"]) {
                        if (extractedInlStyle == null) extractedInlStyle = newHashObj();
                        extractedInlStyle["userSelect"] = style_1["userSelect"];
                        delete style_1["userSelect"];
                    }
                }
                ss.inlStyle = extractedInlStyle;
                shimStyle(style_1);
                var cssStyle = inlineStyleToCssDeclaration(style_1);
                if (cssStyle.length > 0) stylestr += buildCssRule(parent_1, name_1) + " {" + cssStyle + "}\n";
                for (var key2 in flattenPseudo) {
                    var sspi = flattenPseudo[key2];
                    shimStyle(sspi);
                    stylestr += buildCssRule(parent_1, name_1 + ":" + key2) + " {" + inlineStyleToCssDeclaration(sspi) + "}\n";
                }
            }
            var styleElement = document.createElement("style");
            styleElement.type = "text/css";
            if (styleElement.styleSheet) {
                styleElement.styleSheet.cssText = stylestr;
            } else {
                styleElement.appendChild(document.createTextNode(stylestr));
            }
            var head = document.head || document.getElementsByTagName("head")[0];
            if (htmlStyle != null) {
                head.replaceChild(styleElement, htmlStyle);
            } else {
                head.appendChild(styleElement);
            }
            htmlStyle = styleElement;
            rebuildStyles = false;
        }
        chainedBeforeFrame();
        var _a;
    }
    function style(node) {
        var styles = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            styles[_i - 1] = arguments[_i];
        }
        var className = node.className;
        var inlineStyle = node.style;
        var stack = null;
        var i = 0;
        var ca = styles;
        while (true) {
            if (ca.length === i) {
                if (stack === null || stack.length === 0) break;
                ca = stack.pop();
                i = stack.pop() + 1;
                continue;
            }
            var s = ca[i];
            if (s == null || typeof s === "boolean" || s === "") {} else if (typeof s === "string") {
                var sd = allStyles[s];
                if (className == null) className = sd.name; else className = className + " " + sd.name;
                var inls = sd.inlStyle;
                if (inls) {
                    inlineStyle = assign(inlineStyle, inls);
                }
            } else if (isArray(s)) {
                if (ca.length > i + 1) {
                    if (stack == null) stack = [];
                    stack.push(i);
                    stack.push(ca);
                }
                ca = s;
                i = 0;
                continue;
            } else {
                inlineStyle = assign(inlineStyle, s);
            }
            i++;
        }
        node.className = className;
        node.style = inlineStyle;
        return node;
    }
    var uppercasePattern = /([A-Z])/g;
    var msPattern = /^ms-/;
    function hyphenateStyle(s) {
        if (s === "cssFloat") return "float";
        return s.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-");
    }
    function inlineStyleToCssDeclaration(style) {
        var res = "";
        for (var key in style) {
            var v = style[key];
            if (v === undefined) continue;
            res += hyphenateStyle(key) + ":" + (v === "" ? '""' : v) + ";";
        }
        res = res.slice(0, -1);
        return res;
    }
    function styleDef(style, pseudo, nameHint) {
        return styleDefEx(null, style, pseudo, nameHint);
    }
    function styleDefEx(parent, style, pseudo, nameHint) {
        if (nameHint && nameHint !== "b-") {
            if (allNameHints[nameHint]) {
                var counter = 1;
                while (allNameHints[nameHint + counter]) counter++;
                nameHint = nameHint + counter;
            }
            allNameHints[nameHint] = true;
        } else {
            nameHint = "b-" + globalCounter++;
        }
        allStyles[nameHint] = {
            name: nameHint,
            parent: parent,
            style: style,
            inlStyle: null,
            pseudo: pseudo
        };
        invalidateStyles();
        return nameHint;
    }
    function invalidateStyles() {
        rebuildStyles = true;
        __export_invalidate();
    }
    function updateSprite(spDef) {
        var stDef = allStyles[spDef.styleid];
        var style = {
            backgroundImage: "url(" + spDef.url + ")",
            width: spDef.width,
            height: spDef.height
        };
        if (spDef.left || spDef.top) {
            style.backgroundPosition = -spDef.left + "px " + -spDef.top + "px";
        }
        stDef.style = style;
        invalidateStyles();
    }
    function emptyStyleDef(url) {
        return styleDef({
            width: 0,
            height: 0
        }, null, url.replace(/[^a-z0-9_-]/gi, "_"));
    }
    var rgbaRegex = /\s*rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d+|\d*\.\d+)\s*\)\s*/;
    function recolorAndClip(image, colorStr, width, height, left, top) {
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, -left, -top);
        var imgdata = ctx.getImageData(0, 0, width, height);
        var imgd = imgdata.data;
        var rgba = rgbaRegex.exec(colorStr);
        var cred, cgreen, cblue, calpha;
        if (rgba) {
            cred = parseInt(rgba[1], 10);
            cgreen = parseInt(rgba[2], 10);
            cblue = parseInt(rgba[3], 10);
            calpha = Math.round(parseFloat(rgba[4]) * 255);
        } else {
            cred = parseInt(colorStr.substr(1, 2), 16);
            cgreen = parseInt(colorStr.substr(3, 2), 16);
            cblue = parseInt(colorStr.substr(5, 2), 16);
            calpha = parseInt(colorStr.substr(7, 2), 16) || 255;
        }
        if (calpha === 255) {
            for (var i = 0; i < imgd.length; i += 4) {
                var red = imgd[i];
                if (red === imgd[i + 1] && red === imgd[i + 2] && (red === 128 || imgd[i + 3] < 255 && red > 112)) {
                    imgd[i] = cred;
                    imgd[i + 1] = cgreen;
                    imgd[i + 2] = cblue;
                }
            }
        } else {
            for (var i = 0; i < imgd.length; i += 4) {
                var red = imgd[i];
                var alpha = imgd[i + 3];
                if (red === imgd[i + 1] && red === imgd[i + 2] && (red === 128 || alpha < 255 && red > 112)) {
                    if (alpha === 255) {
                        imgd[i] = cred;
                        imgd[i + 1] = cgreen;
                        imgd[i + 2] = cblue;
                        imgd[i + 3] = calpha;
                    } else {
                        alpha = alpha * (1 / 255);
                        imgd[i] = Math.round(cred * alpha);
                        imgd[i + 1] = Math.round(cgreen * alpha);
                        imgd[i + 2] = Math.round(cblue * alpha);
                        imgd[i + 3] = Math.round(calpha * alpha);
                    }
                }
            }
        }
        ctx.putImageData(imgdata, 0, 0);
        return canvas.toDataURL();
    }
    function sprite(url, color, width, height, left, top) {
        left = left || 0;
        top = top || 0;
        if (typeof color === "function") {
            var styleid = emptyStyleDef(url);
            dynamicSprites.push({
                styleid: styleid,
                color: color,
                url: url,
                width: width,
                height: height,
                left: left,
                top: top,
                lastColor: "",
                lastUrl: ""
            });
            if (imageCache[url] === undefined) {
                imageCache[url] = null;
                var image = new Image();
                image.addEventListener("load", function() {
                    imageCache[url] = image;
                    invalidateStyles();
                });
                image.src = url;
            }
            return styleid;
        }
        var key = url + ":" + (color || "") + ":" + (width || 0) + ":" + (height || 0) + ":" + left + ":" + top;
        var spDef = allSprites[key];
        if (spDef) return spDef.styleid;
        var styleid = emptyStyleDef(url);
        spDef = {
            styleid: styleid,
            url: url,
            width: width,
            height: height,
            left: left,
            top: top
        };
        if (width == null || height == null || color != null) {
            var image = new Image();
            image.addEventListener("load", function() {
                if (spDef.width == null) spDef.width = image.width;
                if (spDef.height == null) spDef.height = image.height;
                if (color != null) {
                    spDef.url = recolorAndClip(image, color, spDef.width, spDef.height, spDef.left, spDef.top);
                    spDef.left = 0;
                    spDef.top = 0;
                }
                updateSprite(spDef);
            });
            image.src = url;
        } else {
            updateSprite(spDef);
        }
        allSprites[key] = spDef;
        return styleid;
    }
    var bundlePath = "bundle.png";
    function spriteb(width, height, left, top) {
        var url = bundlePath;
        var key = url + "::" + width + ":" + height + ":" + left + ":" + top;
        var spDef = allSprites[key];
        if (spDef) return spDef.styleid;
        var styleid = styleDef({
            width: 0,
            height: 0
        });
        spDef = {
            styleid: styleid,
            url: url,
            width: width,
            height: height,
            left: left,
            top: top
        };
        updateSprite(spDef);
        allSprites[key] = spDef;
        return styleid;
    }
    function spritebc(color, width, height, left, top) {
        return sprite(bundlePath, color, width, height, left, top);
    }
    function asset(path) {
        return path;
    }
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = angleInDegrees * Math.PI / 180;
        return {
            x: centerX + radius * Math.sin(angleInRadians),
            y: centerY - radius * Math.cos(angleInRadians)
        };
    }
    function svgDescribeArc(x, y, radius, startAngle, endAngle, startWithLine) {
        var absDeltaAngle = Math.abs(endAngle - startAngle);
        var close = false;
        if (absDeltaAngle > 360 - .01) {
            if (endAngle > startAngle) endAngle = startAngle - 359.9; else endAngle = startAngle + 359.9;
            if (radius === 0) return "";
            close = true;
        } else {
            if (radius === 0) {
                return [ startWithLine ? "L" : "M", x, y ].join(" ");
            }
        }
        var start = polarToCartesian(x, y, radius, endAngle);
        var end = polarToCartesian(x, y, radius, startAngle);
        var arcSweep = absDeltaAngle <= 180 ? "0" : "1";
        var largeArg = endAngle > startAngle ? "0" : "1";
        var d = [ startWithLine ? "L" : "M", start.x, start.y, "A", radius, radius, 0, arcSweep, largeArg, end.x, end.y ].join(" ");
        if (close) d += "Z";
        return d;
    }
    function svgPie(x, y, radiusBig, radiusSmall, startAngle, endAngle) {
        var p = svgDescribeArc(x, y, radiusBig, startAngle, endAngle, false);
        var nextWithLine = true;
        if (p[p.length - 1] === "Z") nextWithLine = false;
        if (radiusSmall === 0) {
            if (!nextWithLine) return p;
        }
        return p + svgDescribeArc(x, y, radiusSmall, endAngle, startAngle, nextWithLine) + "Z";
    }
    function svgCircle(x, y, radius) {
        return svgDescribeArc(x, y, radius, 0, 360, false);
    }
    function svgRect(x, y, width, height) {
        return "M" + x + " " + y + "h" + width + "v" + height + "h" + -width + "Z";
    }
    function withKey(node, key) {
        node.key = key;
        return node;
    }
    function styledDiv(children) {
        var styles = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            styles[_i - 1] = arguments[_i];
        }
        return style({
            tag: "div",
            children: children
        }, styles);
    }
    function createVirtualComponent(component) {
        return function(data, children) {
            if (children !== undefined) data.children = children;
            return {
                data: data,
                component: component
            };
        };
    }
    function createComponent(component) {
        var originalRender = component.render;
        if (originalRender) {
            component.render = function(ctx, me, oldMe) {
                me.tag = "div";
                return originalRender.call(component, ctx, me, oldMe);
            };
        } else {
            component.render = function(ctx, me) {
                me.tag = "div";
            };
        }
        return function(data, children) {
            if (children !== undefined) data.children = children;
            return {
                data: data,
                component: component
            };
        };
    }
    function createDerivedComponent(original, after) {
        var originalComponent = original({}).component;
        var merged = mergeComponents(originalComponent, after);
        return createVirtualComponent(merged);
    }
    if (!window.b) window.b = {
        deref: deref,
        getRoots: getRoots,
        setInvalidate: setInvalidate,
        invalidateStyles: invalidateStyles,
        ignoreShouldChange: ignoreShouldChange,
        setAfterFrame: setAfterFrame,
        setBeforeFrame: setBeforeFrame,
        getDnds: __export_getDnds
    };
    var sourceText;
    var pos;
    var length;
    var curLine;
    var curCol;
    var nextLine;
    var nextCol;
    var curToken;
    var errorMsg;
    var EOFToken = -1;
    var ErrorToken = -2;
    var OpenBracketToken = -3;
    var CloseBracketToken = -4;
    var HashToken = -5;
    function advanceNextToken() {
        curLine = nextLine;
        curCol = nextCol;
        if (pos === length) {
            curToken = EOFToken;
            return;
        }
        var ch = sourceText.charCodeAt(pos++);
        if (ch === 13 || ch === 10) {
            nextLine++;
            nextCol = 1;
            if (ch === 13 && pos < length && sourceText.charCodeAt(pos) === 10) {
                pos++;
            }
            curToken = 13;
            return;
        }
        nextCol++;
        if (ch === 92) {
            if (pos === length) {
                curToken = 92;
                return;
            }
            ch = sourceText.charCodeAt(pos++);
            nextCol++;
            if (ch === 92 || ch === 123 || ch === 125 || ch === 35) {
                curToken = ch;
                return;
            }
            if (ch === 117) {
                if (pos + 4 <= length) {
                    var hexcode = sourceText.substr(pos, 4);
                    if (/^[0-9a-f]+$/gi.test(hexcode)) {
                        curToken = parseInt(hexcode, 16);
                        pos += 4;
                        nextCol += 4;
                        return;
                    }
                }
                errorMsg = "After \\u there must be 4 hex characters";
                curToken = ErrorToken;
                return;
            }
            errorMsg = "After \\ there coud be only one of \\{}#u characters";
            curToken = ErrorToken;
            return;
        }
        if (ch === 123) {
            curToken = OpenBracketToken;
        } else if (ch === 125) {
            curToken = CloseBracketToken;
        } else if (ch === 35) {
            curToken = HashToken;
        } else {
            curToken = ch;
        }
    }
    function isError(val) {
        return val != null && typeof val === "object" && val.type === "error";
    }
    function buildError(msg) {
        if (msg === undefined) msg = errorMsg;
        return {
            type: "error",
            msg: msg,
            pos: pos - 1,
            line: curLine,
            col: curCol
        };
    }
    function skipWs() {
        while (curToken === 9 || curToken === 10 || curToken === 13 || curToken === 32) {
            advanceNextToken();
        }
    }
    function parseIdentificator() {
        var identificator = "";
        if (curToken >= 65 && curToken <= 90 || curToken >= 97 && curToken <= 122 || curToken === 95) {
            do {
                identificator += String.fromCharCode(curToken);
                advanceNextToken();
            } while (curToken >= 65 && curToken <= 90 || curToken >= 97 && curToken <= 122 || curToken === 95 || curToken >= 48 && curToken <= 57);
        } else {
            return buildError("Expecting identifier [a-zA-Z_]");
        }
        return identificator;
    }
    function parseChars() {
        var res = "";
        do {
            res += String.fromCharCode(curToken);
            advanceNextToken();
        } while (curToken >= 0 && curToken !== 9 && curToken !== 10 && curToken !== 13 && curToken !== 32);
        return res;
    }
    function parseNumber() {
        var number = "";
        do {
            number += String.fromCharCode(curToken);
            advanceNextToken();
        } while (curToken >= 48 && curToken <= 57);
        return parseInt(number, 10);
    }
    function parseFormat() {
        skipWs();
        if (curToken === ErrorToken) return buildError();
        var identificator = parseIdentificator();
        if (isError(identificator)) return identificator;
        skipWs();
        if (curToken === ErrorToken) return buildError();
        if (curToken === CloseBracketToken) {
            advanceNextToken();
            return {
                type: "arg",
                id: identificator
            };
        }
        if (curToken !== 44) {
            return buildError('Expecting "}" or ","');
        }
        advanceNextToken();
        skipWs();
        var format = {
            type: undefined
        };
        var res = {
            type: "format",
            id: identificator,
            format: format
        };
        var name = parseIdentificator();
        if (isError(name)) return name;
        skipWs();
        if (curToken === ErrorToken) return buildError();
        if (name === "number" || name === "time" || name === "date") {
            format.type = name;
            format.style = null;
            format.options = null;
            if (curToken === CloseBracketToken) {
                advanceNextToken();
                return res;
            }
            if (curToken === 44) {
                advanceNextToken();
                skipWs();
                var style = parseIdentificator();
                if (isError(style)) return name;
                format.style = style;
                format.options = [];
                while (true) {
                    skipWs();
                    if (curToken === ErrorToken) return buildError();
                    if (curToken === CloseBracketToken) {
                        advanceNextToken();
                        return res;
                    }
                    if (curToken === 44) {
                        advanceNextToken();
                        skipWs();
                        var optionName = parseIdentificator();
                        if (isError(optionName)) return optionName;
                        if (curToken === 58) {
                            advanceNextToken();
                            skipWs();
                            var val = void 0;
                            if (curToken >= 48 && curToken <= 57) {
                                val = parseNumber();
                            } else if (curToken === OpenBracketToken) {
                                advanceNextToken();
                                val = parseMsg(false);
                            } else {
                                val = parseIdentificator();
                            }
                            if (isError(val)) return val;
                            format.options.push({
                                key: optionName,
                                value: val
                            });
                        } else {
                            format.options.push({
                                key: optionName
                            });
                        }
                        continue;
                    }
                    break;
                }
            }
            return buildError('Expecting "," or "}"');
        } else if (name === "plural" || name === "selectordinal") {
            var options = [];
            format.type = "plural";
            format.ordinal = name !== "plural";
            format.offset = 0;
            format.options = options;
            if (curToken !== 44) {
                return buildError('Expecting ","');
            }
            advanceNextToken();
            skipWs();
            var offsetAllowed = true;
            while (curToken !== CloseBracketToken) {
                if (curToken < 0) {
                    return buildError('Expecting characters except "{", "#"');
                }
                var chars = parseChars();
                skipWs();
                if (offsetAllowed && /^offset:/.test(chars)) {
                    var m = /^offset:*([0-9]+)$/.exec(chars);
                    if (m) {
                        format.offset = parseInt(m[1], 10);
                    } else if (chars === "offset:") {
                        skipWs();
                        if (curToken < 48 || curToken > 57) {
                            return buildError("Expecting number");
                        }
                        format.offset = parseInt(parseNumber(), 10);
                    } else return buildError('After "offset:" there must be number');
                    offsetAllowed = false;
                    continue;
                }
                offsetAllowed = false;
                var selector = void 0;
                if (/^=[0-9]+$/.test(chars)) {
                    selector = parseInt(chars.substring(1), 10);
                } else {
                    selector = chars;
                }
                if (curToken !== OpenBracketToken) {
                    return buildError('Expecting "{"');
                }
                advanceNextToken();
                var value = parseMsg(false);
                if (isError(value)) return value;
                options.push({
                    selector: selector,
                    value: value
                });
                skipWs();
            }
            advanceNextToken();
            return res;
        } else if (name === "select") {
            var options = [];
            format.type = "select";
            format.options = options;
            if (curToken !== 44) {
                return buildError('Expecting ","');
            }
            advanceNextToken();
            skipWs();
            while (curToken !== CloseBracketToken) {
                if (curToken < 0) {
                    return buildError('Expecting characters except "{", "#"');
                }
                var chars = parseChars();
                skipWs();
                var selector = void 0;
                if (/^=[0-9]+$/.test(chars)) {
                    selector = parseInt(chars.substring(1), 10);
                } else {
                    selector = chars;
                }
                if (curToken !== OpenBracketToken) {
                    return buildError('Expecting "{"');
                }
                advanceNextToken();
                var value = parseMsg(false);
                if (isError(value)) return value;
                options.push({
                    selector: selector,
                    value: value
                });
                skipWs();
            }
            advanceNextToken();
            return res;
        }
        return buildError('Expecting one of "number", "time", "date", "plural", "selectordinal", "select".');
    }
    function parseMsg(endWithEOF) {
        var res = null;
        while (true) {
            if (curToken === ErrorToken) {
                return buildError();
            }
            if (curToken === EOFToken) {
                if (endWithEOF) {
                    if (res === null) return "";
                    return res;
                }
                return buildError('Unexpected end of message missing "}"');
            }
            var val = void 0;
            if (curToken === OpenBracketToken) {
                advanceNextToken();
                val = parseFormat();
            } else if (curToken === HashToken) {
                advanceNextToken();
                val = {
                    type: "hash"
                };
            } else if (curToken === CloseBracketToken) {
                if (endWithEOF) {
                    return buildError('Unexpected "}". Maybe you forgot to prefix it with "\\".');
                }
                advanceNextToken();
                if (res === null) return "";
                return res;
            } else {
                val = "";
                while (curToken >= 0) {
                    val += String.fromCharCode(curToken);
                    advanceNextToken();
                }
            }
            if (isError(val)) return val;
            if (res === null) res = val; else {
                if (Array.isArray(res)) {
                    res.push(val);
                } else {
                    res = [ res, val ];
                }
            }
        }
    }
    function parse(text) {
        pos = 0;
        sourceText = text;
        length = text.length;
        nextLine = 1;
        nextCol = 1;
        advanceNextToken();
        return parseMsg(true);
    }
    var RuntimeFunctionGenerator = function() {
        function RuntimeFunctionGenerator() {
            this.constants = [];
            this.body = "";
            this.argCount = 0;
            this.localCount = 0;
        }
        RuntimeFunctionGenerator.prototype.addConstant = function(value) {
            var cc = this.constants;
            for (var i = 0; i < cc.length; i++) {
                if (cc[i] === value) return "c_" + i;
            }
            cc.push(value);
            return "c_" + (cc.length - 1);
        };
        RuntimeFunctionGenerator.prototype.addArg = function(index) {
            if (index >= this.argCount) this.argCount = index + 1;
            return "a_" + index;
        };
        RuntimeFunctionGenerator.prototype.addBody = function(text) {
            this.body += text;
        };
        RuntimeFunctionGenerator.prototype.addLocal = function() {
            return "l_" + this.localCount++;
        };
        RuntimeFunctionGenerator.prototype.build = function() {
            var innerParams = [];
            for (var i = 0; i < this.argCount; i++) {
                innerParams.push("a_" + i);
            }
            if (this.constants.length > 0) {
                var params = [];
                for (var i = 0; i < this.constants.length; i++) {
                    params.push("c_" + i);
                }
                params.push("return function(" + innerParams.join(",") + ") {\n" + this.body + "\n}");
                return Function.apply(null, params).apply(null, this.constants);
            }
            innerParams.push(this.body);
            return Function.apply(null, innerParams);
        };
        return RuntimeFunctionGenerator;
    }();
    var defs = Object.create(null);
    defs["en"] = {
        pluralFn: function(n, ord) {
            var s = String(n).split("."), v0 = !s[1], t0 = Number(s[0]) == n, n10 = t0 && s[0].slice(-1), n100 = t0 && s[0].slice(-2);
            if (ord) return n10 == 1 && n100 != 11 ? "one" : n10 == 2 && n100 != 12 ? "two" : n10 == 3 && n100 != 13 ? "few" : "other";
            return n == 1 && v0 ? "one" : "other";
        }
    };
    function setPluralRule(locale, pluralFn) {
        var d = defs[locale];
        if (d === undefined) {
            d = {};
        }
        d.pluralFn = pluralFn;
        defs[locale] = d;
    }
    function getLanguageFromLocale(locale) {
        var idx = locale.indexOf("-");
        if (idx >= 0) return locale.substr(0, idx);
        return locale;
    }
    function getPluralRule(locale) {
        var d = defs[locale];
        if (!d) {
            d = defs[getLanguageFromLocale(locale)];
            if (!d) {
                d = defs["en"];
            }
        }
        return d.pluralFn;
    }
    var __bbe = {};
    (function() {
        var exports = {};
        var module = {
            exports: exports
        };
        (function() {
            var numeral, VERSION = "1.5.3", languages = {}, currentLanguage = "en", zeroFormat = null, defaultFormat = "0,0", hasModule = typeof module !== "undefined" && module.exports;
            function Numeral(number) {
                this._value = number;
            }
            function toFixed(value, precision, roundingFunction, optionals) {
                var power = Math.pow(10, precision), optionalsRegExp, output;
                output = (roundingFunction(value * power) / power).toFixed(precision);
                if (optionals) {
                    optionalsRegExp = new RegExp("0{1," + optionals + "}$");
                    output = output.replace(optionalsRegExp, "");
                }
                return output;
            }
            function formatNumeral(n, format, roundingFunction) {
                var output;
                if (format.indexOf("$") > -1) {
                    output = formatCurrency(n, format, roundingFunction);
                } else if (format.indexOf("%") > -1) {
                    output = formatPercentage(n, format, roundingFunction);
                } else if (format.indexOf(":") > -1) {
                    output = formatTime(n, format);
                } else {
                    output = formatNumber(n._value, format, roundingFunction);
                }
                return output;
            }
            function unformatNumeral(n, string) {
                var stringOriginal = string, thousandRegExp, millionRegExp, billionRegExp, trillionRegExp, suffixes = [ "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB" ], bytesMultiplier = false, power;
                if (string.indexOf(":") > -1) {
                    n._value = unformatTime(string);
                } else {
                    if (string === zeroFormat) {
                        n._value = 0;
                    } else {
                        if (languages[currentLanguage].delimiters.decimal !== ".") {
                            string = string.replace(/\./g, "").replace(languages[currentLanguage].delimiters.decimal, ".");
                        }
                        thousandRegExp = new RegExp("[^a-zA-Z]" + languages[currentLanguage].abbreviations.thousand + "(?:\\)|(\\" + languages[currentLanguage].currency.symbol + ")?(?:\\))?)?$");
                        millionRegExp = new RegExp("[^a-zA-Z]" + languages[currentLanguage].abbreviations.million + "(?:\\)|(\\" + languages[currentLanguage].currency.symbol + ")?(?:\\))?)?$");
                        billionRegExp = new RegExp("[^a-zA-Z]" + languages[currentLanguage].abbreviations.billion + "(?:\\)|(\\" + languages[currentLanguage].currency.symbol + ")?(?:\\))?)?$");
                        trillionRegExp = new RegExp("[^a-zA-Z]" + languages[currentLanguage].abbreviations.trillion + "(?:\\)|(\\" + languages[currentLanguage].currency.symbol + ")?(?:\\))?)?$");
                        for (power = 0; power <= suffixes.length; power++) {
                            bytesMultiplier = string.indexOf(suffixes[power]) > -1 ? Math.pow(1024, power + 1) : false;
                            if (bytesMultiplier) {
                                break;
                            }
                        }
                        n._value = (bytesMultiplier ? bytesMultiplier : 1) * (stringOriginal.match(thousandRegExp) ? Math.pow(10, 3) : 1) * (stringOriginal.match(millionRegExp) ? Math.pow(10, 6) : 1) * (stringOriginal.match(billionRegExp) ? Math.pow(10, 9) : 1) * (stringOriginal.match(trillionRegExp) ? Math.pow(10, 12) : 1) * (string.indexOf("%") > -1 ? .01 : 1) * ((string.split("-").length + Math.min(string.split("(").length - 1, string.split(")").length - 1)) % 2 ? 1 : -1) * Number(string.replace(/[^0-9\.]+/g, ""));
                        n._value = bytesMultiplier ? Math.ceil(n._value) : n._value;
                    }
                }
                return n._value;
            }
            function formatCurrency(n, format, roundingFunction) {
                var symbolIndex = format.indexOf("$"), openParenIndex = format.indexOf("("), minusSignIndex = format.indexOf("-"), space = "", spliceIndex, output;
                if (format.indexOf(" $") > -1) {
                    space = " ";
                    format = format.replace(" $", "");
                } else if (format.indexOf("$ ") > -1) {
                    space = " ";
                    format = format.replace("$ ", "");
                } else {
                    format = format.replace("$", "");
                }
                output = formatNumber(n._value, format, roundingFunction);
                if (symbolIndex <= 1) {
                    if (output.indexOf("(") > -1 || output.indexOf("-") > -1) {
                        output = output.split("");
                        spliceIndex = 1;
                        if (symbolIndex < openParenIndex || symbolIndex < minusSignIndex) {
                            spliceIndex = 0;
                        }
                        output.splice(spliceIndex, 0, languages[currentLanguage].currency.symbol + space);
                        output = output.join("");
                    } else {
                        output = languages[currentLanguage].currency.symbol + space + output;
                    }
                } else {
                    if (output.indexOf(")") > -1) {
                        output = output.split("");
                        output.splice(-1, 0, space + languages[currentLanguage].currency.symbol);
                        output = output.join("");
                    } else {
                        output = output + space + languages[currentLanguage].currency.symbol;
                    }
                }
                return output;
            }
            function formatPercentage(n, format, roundingFunction) {
                var space = "", output, value = n._value * 100;
                if (format.indexOf(" %") > -1) {
                    space = " ";
                    format = format.replace(" %", "");
                } else {
                    format = format.replace("%", "");
                }
                output = formatNumber(value, format, roundingFunction);
                if (output.indexOf(")") > -1) {
                    output = output.split("");
                    output.splice(-1, 0, space + "%");
                    output = output.join("");
                } else {
                    output = output + space + "%";
                }
                return output;
            }
            function formatTime(n) {
                var hours = Math.floor(n._value / 60 / 60), minutes = Math.floor((n._value - hours * 60 * 60) / 60), seconds = Math.round(n._value - hours * 60 * 60 - minutes * 60);
                return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
            }
            function unformatTime(string) {
                var timeArray = string.split(":"), seconds = 0;
                if (timeArray.length === 3) {
                    seconds = seconds + Number(timeArray[0]) * 60 * 60;
                    seconds = seconds + Number(timeArray[1]) * 60;
                    seconds = seconds + Number(timeArray[2]);
                } else if (timeArray.length === 2) {
                    seconds = seconds + Number(timeArray[0]) * 60;
                    seconds = seconds + Number(timeArray[1]);
                }
                return Number(seconds);
            }
            function formatNumber(value, format, roundingFunction) {
                var negP = false, signed = false, optDec = false, abbr = "", abbrK = false, abbrM = false, abbrB = false, abbrT = false, abbrForce = false, bytes = "", ord = "", abs = Math.abs(value), suffixes = [ "B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB" ], min, max, power, w, precision, thousands, d = "", neg = false;
                if (value === 0 && zeroFormat !== null) {
                    return zeroFormat;
                } else {
                    if (format.indexOf("(") > -1) {
                        negP = true;
                        format = format.slice(1, -1);
                    } else if (format.indexOf("+") > -1) {
                        signed = true;
                        format = format.replace(/\+/g, "");
                    }
                    if (format.indexOf("a") > -1) {
                        abbrK = format.indexOf("aK") >= 0;
                        abbrM = format.indexOf("aM") >= 0;
                        abbrB = format.indexOf("aB") >= 0;
                        abbrT = format.indexOf("aT") >= 0;
                        abbrForce = abbrK || abbrM || abbrB || abbrT;
                        if (format.indexOf(" a") > -1) {
                            abbr = " ";
                            format = format.replace(" a", "");
                        } else {
                            format = format.replace("a", "");
                        }
                        if (abs >= Math.pow(10, 12) && !abbrForce || abbrT) {
                            abbr = abbr + languages[currentLanguage].abbreviations.trillion;
                            value = value / Math.pow(10, 12);
                        } else if (abs < Math.pow(10, 12) && abs >= Math.pow(10, 9) && !abbrForce || abbrB) {
                            abbr = abbr + languages[currentLanguage].abbreviations.billion;
                            value = value / Math.pow(10, 9);
                        } else if (abs < Math.pow(10, 9) && abs >= Math.pow(10, 6) && !abbrForce || abbrM) {
                            abbr = abbr + languages[currentLanguage].abbreviations.million;
                            value = value / Math.pow(10, 6);
                        } else if (abs < Math.pow(10, 6) && abs >= Math.pow(10, 3) && !abbrForce || abbrK) {
                            abbr = abbr + languages[currentLanguage].abbreviations.thousand;
                            value = value / Math.pow(10, 3);
                        }
                    }
                    if (format.indexOf("b") > -1) {
                        if (format.indexOf(" b") > -1) {
                            bytes = " ";
                            format = format.replace(" b", "");
                        } else {
                            format = format.replace("b", "");
                        }
                        for (power = 0; power <= suffixes.length; power++) {
                            min = Math.pow(1024, power);
                            max = Math.pow(1024, power + 1);
                            if (value >= min && value < max) {
                                bytes = bytes + suffixes[power];
                                if (min > 0) {
                                    value = value / min;
                                }
                                break;
                            }
                        }
                    }
                    if (format.indexOf("o") > -1) {
                        if (format.indexOf(" o") > -1) {
                            ord = " ";
                            format = format.replace(" o", "");
                        } else {
                            format = format.replace("o", "");
                        }
                        ord = ord + languages[currentLanguage].ordinal(value);
                    }
                    if (format.indexOf("[.]") > -1) {
                        optDec = true;
                        format = format.replace("[.]", ".");
                    }
                    w = value.toString().split(".")[0];
                    precision = format.split(".")[1];
                    thousands = format.indexOf(",");
                    if (precision) {
                        if (precision.indexOf("[") > -1) {
                            precision = precision.replace("]", "");
                            precision = precision.split("[");
                            d = toFixed(value, precision[0].length + precision[1].length, roundingFunction, precision[1].length);
                        } else {
                            d = toFixed(value, precision.length, roundingFunction);
                        }
                        w = d.split(".")[0];
                        if (d.split(".")[1].length) {
                            d = languages[currentLanguage].delimiters.decimal + d.split(".")[1];
                        } else {
                            d = "";
                        }
                        if (optDec && Number(d.slice(1)) === 0) {
                            d = "";
                        }
                    } else {
                        w = toFixed(value, null, roundingFunction);
                    }
                    if (w.indexOf("-") > -1) {
                        w = w.slice(1);
                        neg = true;
                    }
                    if (thousands > -1) {
                        w = w.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1" + languages[currentLanguage].delimiters.thousands);
                    }
                    if (format.indexOf(".") === 0) {
                        w = "";
                    }
                    return (negP && neg ? "(" : "") + (!negP && neg ? "-" : "") + (!neg && signed ? "+" : "") + w + d + (ord ? ord : "") + (abbr ? abbr : "") + (bytes ? bytes : "") + (negP && neg ? ")" : "");
                }
            }
            numeral = function(input) {
                if (numeral.isNumeral(input)) {
                    input = input.value();
                } else if (input === 0 || typeof input === "undefined") {
                    input = 0;
                } else if (!Number(input)) {
                    input = numeral.fn.unformat(input);
                }
                return new Numeral(Number(input));
            };
            numeral.version = VERSION;
            numeral.isNumeral = function(obj) {
                return obj instanceof Numeral;
            };
            numeral.language = function(key, values) {
                if (!key) {
                    return currentLanguage;
                }
                if (key && !values) {
                    if (!languages[key]) {
                        throw new Error("Unknown language : " + key);
                    }
                    currentLanguage = key;
                }
                if (values || !languages[key]) {
                    loadLanguage(key, values);
                }
                return numeral;
            };
            numeral.languageData = function(key) {
                if (!key) {
                    return languages[currentLanguage];
                }
                if (!languages[key]) {
                    throw new Error("Unknown language : " + key);
                }
                return languages[key];
            };
            numeral.language("en", {
                delimiters: {
                    thousands: ",",
                    decimal: "."
                },
                abbreviations: {
                    thousand: "k",
                    million: "m",
                    billion: "b",
                    trillion: "t"
                },
                ordinal: function(number) {
                    var b = number % 10;
                    return ~~(number % 100 / 10) === 1 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th";
                },
                currency: {
                    symbol: "$"
                }
            });
            numeral.zeroFormat = function(format) {
                zeroFormat = typeof format === "string" ? format : null;
            };
            numeral.defaultFormat = function(format) {
                defaultFormat = typeof format === "string" ? format : "0.0";
            };
            function loadLanguage(key, values) {
                languages[key] = values;
            }
            if ("function" !== typeof Array.prototype.reduce) {
                Array.prototype.reduce = function(callback, opt_initialValue) {
                    "use strict";
                    if (null === this || "undefined" === typeof this) {
                        throw new TypeError("Array.prototype.reduce called on null or undefined");
                    }
                    if ("function" !== typeof callback) {
                        throw new TypeError(callback + " is not a function");
                    }
                    var index, value, length = this.length >>> 0, isValueSet = false;
                    if (1 < arguments.length) {
                        value = opt_initialValue;
                        isValueSet = true;
                    }
                    for (index = 0; length > index; ++index) {
                        if (this.hasOwnProperty(index)) {
                            if (isValueSet) {
                                value = callback(value, this[index], index, this);
                            } else {
                                value = this[index];
                                isValueSet = true;
                            }
                        }
                    }
                    if (!isValueSet) {
                        throw new TypeError("Reduce of empty array with no initial value");
                    }
                    return value;
                };
            }
            function multiplier(x) {
                var parts = x.toString().split(".");
                if (parts.length < 2) {
                    return 1;
                }
                return Math.pow(10, parts[1].length);
            }
            function correctionFactor() {
                var args = Array.prototype.slice.call(arguments);
                return args.reduce(function(prev, next) {
                    var mp = multiplier(prev), mn = multiplier(next);
                    return mp > mn ? mp : mn;
                }, -Infinity);
            }
            numeral.fn = Numeral.prototype = {
                clone: function() {
                    return numeral(this);
                },
                format: function(inputString, roundingFunction) {
                    return formatNumeral(this, inputString ? inputString : defaultFormat, roundingFunction !== undefined ? roundingFunction : Math.round);
                },
                unformat: function(inputString) {
                    if (Object.prototype.toString.call(inputString) === "[object Number]") {
                        return inputString;
                    }
                    return unformatNumeral(this, inputString ? inputString : defaultFormat);
                },
                value: function() {
                    return this._value;
                },
                valueOf: function() {
                    return this._value;
                },
                set: function(value) {
                    this._value = Number(value);
                    return this;
                },
                add: function(value) {
                    var corrFactor = correctionFactor.call(null, this._value, value);
                    function cback(accum, curr, currI, O) {
                        return accum + corrFactor * curr;
                    }
                    this._value = [ this._value, value ].reduce(cback, 0) / corrFactor;
                    return this;
                },
                subtract: function(value) {
                    var corrFactor = correctionFactor.call(null, this._value, value);
                    function cback(accum, curr, currI, O) {
                        return accum - corrFactor * curr;
                    }
                    this._value = [ value ].reduce(cback, this._value * corrFactor) / corrFactor;
                    return this;
                },
                multiply: function(value) {
                    function cback(accum, curr, currI, O) {
                        var corrFactor = correctionFactor(accum, curr);
                        return accum * corrFactor * (curr * corrFactor) / (corrFactor * corrFactor);
                    }
                    this._value = [ this._value, value ].reduce(cback, 1);
                    return this;
                },
                divide: function(value) {
                    function cback(accum, curr, currI, O) {
                        var corrFactor = correctionFactor(accum, curr);
                        return accum * corrFactor / (curr * corrFactor);
                    }
                    this._value = [ this._value, value ].reduce(cback);
                    return this;
                },
                difference: function(value) {
                    return Math.abs(numeral(this._value).subtract(value).value());
                }
            };
            if (hasModule) {
                module.exports = numeral;
            }
            if (typeof ender === "undefined") {
                this["numeral"] = numeral;
            }
            if (typeof define === "function" && define.amd) {
                define([], function() {
                    return numeral;
                });
            }
        }).call(this);
        __bbe["node_modules/numeral/numeral.js"] = module.exports;
    })();
    (function() {
        var exports = {};
        var module = {
            exports: exports
        };
        (function(global, factory) {
            typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.moment = factory();
        })(this, function() {
            "use strict";
            var hookCallback;
            function utils_hooks__hooks() {
                return hookCallback.apply(null, arguments);
            }
            function setHookCallback(callback) {
                hookCallback = callback;
            }
            function isArray(input) {
                return Object.prototype.toString.call(input) === "[object Array]";
            }
            function isDate(input) {
                return input instanceof Date || Object.prototype.toString.call(input) === "[object Date]";
            }
            function map(arr, fn) {
                var res = [], i;
                for (i = 0; i < arr.length; ++i) {
                    res.push(fn(arr[i], i));
                }
                return res;
            }
            function hasOwnProp(a, b) {
                return Object.prototype.hasOwnProperty.call(a, b);
            }
            function extend(a, b) {
                for (var i in b) {
                    if (hasOwnProp(b, i)) {
                        a[i] = b[i];
                    }
                }
                if (hasOwnProp(b, "toString")) {
                    a.toString = b.toString;
                }
                if (hasOwnProp(b, "valueOf")) {
                    a.valueOf = b.valueOf;
                }
                return a;
            }
            function create_utc__createUTC(input, format, locale, strict) {
                return createLocalOrUTC(input, format, locale, strict, true).utc();
            }
            function defaultParsingFlags() {
                return {
                    empty: false,
                    unusedTokens: [],
                    unusedInput: [],
                    overflow: -2,
                    charsLeftOver: 0,
                    nullInput: false,
                    invalidMonth: null,
                    invalidFormat: false,
                    userInvalidated: false,
                    iso: false
                };
            }
            function getParsingFlags(m) {
                if (m._pf == null) {
                    m._pf = defaultParsingFlags();
                }
                return m._pf;
            }
            function valid__isValid(m) {
                if (m._isValid == null) {
                    var flags = getParsingFlags(m);
                    m._isValid = !isNaN(m._d.getTime()) && flags.overflow < 0 && !flags.empty && !flags.invalidMonth && !flags.invalidWeekday && !flags.nullInput && !flags.invalidFormat && !flags.userInvalidated;
                    if (m._strict) {
                        m._isValid = m._isValid && flags.charsLeftOver === 0 && flags.unusedTokens.length === 0 && flags.bigHour === undefined;
                    }
                }
                return m._isValid;
            }
            function valid__createInvalid(flags) {
                var m = create_utc__createUTC(NaN);
                if (flags != null) {
                    extend(getParsingFlags(m), flags);
                } else {
                    getParsingFlags(m).userInvalidated = true;
                }
                return m;
            }
            var momentProperties = utils_hooks__hooks.momentProperties = [];
            function copyConfig(to, from) {
                var i, prop, val;
                if (typeof from._isAMomentObject !== "undefined") {
                    to._isAMomentObject = from._isAMomentObject;
                }
                if (typeof from._i !== "undefined") {
                    to._i = from._i;
                }
                if (typeof from._f !== "undefined") {
                    to._f = from._f;
                }
                if (typeof from._l !== "undefined") {
                    to._l = from._l;
                }
                if (typeof from._strict !== "undefined") {
                    to._strict = from._strict;
                }
                if (typeof from._tzm !== "undefined") {
                    to._tzm = from._tzm;
                }
                if (typeof from._isUTC !== "undefined") {
                    to._isUTC = from._isUTC;
                }
                if (typeof from._offset !== "undefined") {
                    to._offset = from._offset;
                }
                if (typeof from._pf !== "undefined") {
                    to._pf = getParsingFlags(from);
                }
                if (typeof from._locale !== "undefined") {
                    to._locale = from._locale;
                }
                if (momentProperties.length > 0) {
                    for (i in momentProperties) {
                        prop = momentProperties[i];
                        val = from[prop];
                        if (typeof val !== "undefined") {
                            to[prop] = val;
                        }
                    }
                }
                return to;
            }
            var updateInProgress = false;
            function Moment(config) {
                copyConfig(this, config);
                this._d = new Date(config._d != null ? config._d.getTime() : NaN);
                if (updateInProgress === false) {
                    updateInProgress = true;
                    utils_hooks__hooks.updateOffset(this);
                    updateInProgress = false;
                }
            }
            function isMoment(obj) {
                return obj instanceof Moment || obj != null && obj._isAMomentObject != null;
            }
            function absFloor(number) {
                if (number < 0) {
                    return Math.ceil(number);
                } else {
                    return Math.floor(number);
                }
            }
            function toInt(argumentForCoercion) {
                var coercedNumber = +argumentForCoercion, value = 0;
                if (coercedNumber !== 0 && isFinite(coercedNumber)) {
                    value = absFloor(coercedNumber);
                }
                return value;
            }
            function compareArrays(array1, array2, dontConvert) {
                var len = Math.min(array1.length, array2.length), lengthDiff = Math.abs(array1.length - array2.length), diffs = 0, i;
                for (i = 0; i < len; i++) {
                    if (dontConvert && array1[i] !== array2[i] || !dontConvert && toInt(array1[i]) !== toInt(array2[i])) {
                        diffs++;
                    }
                }
                return diffs + lengthDiff;
            }
            function Locale() {}
            var locales = {};
            var globalLocale;
            function normalizeLocale(key) {
                return key ? key.toLowerCase().replace("_", "-") : key;
            }
            function chooseLocale(names) {
                var i = 0, j, next, locale, split;
                while (i < names.length) {
                    split = normalizeLocale(names[i]).split("-");
                    j = split.length;
                    next = normalizeLocale(names[i + 1]);
                    next = next ? next.split("-") : null;
                    while (j > 0) {
                        locale = loadLocale(split.slice(0, j).join("-"));
                        if (locale) {
                            return locale;
                        }
                        if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                            break;
                        }
                        j--;
                    }
                    i++;
                }
                return null;
            }
            function loadLocale(name) {
                var oldLocale = null;
                if (!locales[name] && typeof module !== "undefined" && module && module.exports) {
                    try {
                        oldLocale = globalLocale._abbr;
                        require("./locale/" + name);
                        locale_locales__getSetGlobalLocale(oldLocale);
                    } catch (e) {}
                }
                return locales[name];
            }
            function locale_locales__getSetGlobalLocale(key, values) {
                var data;
                if (key) {
                    if (typeof values === "undefined") {
                        data = locale_locales__getLocale(key);
                    } else {
                        data = defineLocale(key, values);
                    }
                    if (data) {
                        globalLocale = data;
                    }
                }
                return globalLocale._abbr;
            }
            function defineLocale(name, values) {
                if (values !== null) {
                    values.abbr = name;
                    locales[name] = locales[name] || new Locale();
                    locales[name].set(values);
                    locale_locales__getSetGlobalLocale(name);
                    return locales[name];
                } else {
                    delete locales[name];
                    return null;
                }
            }
            function locale_locales__getLocale(key) {
                var locale;
                if (key && key._locale && key._locale._abbr) {
                    key = key._locale._abbr;
                }
                if (!key) {
                    return globalLocale;
                }
                if (!isArray(key)) {
                    locale = loadLocale(key);
                    if (locale) {
                        return locale;
                    }
                    key = [ key ];
                }
                return chooseLocale(key);
            }
            var aliases = {};
            function addUnitAlias(unit, shorthand) {
                var lowerCase = unit.toLowerCase();
                aliases[lowerCase] = aliases[lowerCase + "s"] = aliases[shorthand] = unit;
            }
            function normalizeUnits(units) {
                return typeof units === "string" ? aliases[units] || aliases[units.toLowerCase()] : undefined;
            }
            function normalizeObjectUnits(inputObject) {
                var normalizedInput = {}, normalizedProp, prop;
                for (prop in inputObject) {
                    if (hasOwnProp(inputObject, prop)) {
                        normalizedProp = normalizeUnits(prop);
                        if (normalizedProp) {
                            normalizedInput[normalizedProp] = inputObject[prop];
                        }
                    }
                }
                return normalizedInput;
            }
            function makeGetSet(unit, keepTime) {
                return function(value) {
                    if (value != null) {
                        get_set__set(this, unit, value);
                        utils_hooks__hooks.updateOffset(this, keepTime);
                        return this;
                    } else {
                        return get_set__get(this, unit);
                    }
                };
            }
            function get_set__get(mom, unit) {
                return mom._d["get" + (mom._isUTC ? "UTC" : "") + unit]();
            }
            function get_set__set(mom, unit, value) {
                return mom._d["set" + (mom._isUTC ? "UTC" : "") + unit](value);
            }
            function getSet(units, value) {
                var unit;
                if (typeof units === "object") {
                    for (unit in units) {
                        this.set(unit, units[unit]);
                    }
                } else {
                    units = normalizeUnits(units);
                    if (typeof this[units] === "function") {
                        return this[units](value);
                    }
                }
                return this;
            }
            function zeroFill(number, targetLength, forceSign) {
                var absNumber = "" + Math.abs(number), zerosToFill = targetLength - absNumber.length, sign = number >= 0;
                return (sign ? forceSign ? "+" : "" : "-") + Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
            }
            var formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;
            var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;
            var formatFunctions = {};
            var formatTokenFunctions = {};
            function addFormatToken(token, padded, ordinal, callback) {
                var func = callback;
                if (typeof callback === "string") {
                    func = function() {
                        return this[callback]();
                    };
                }
                if (token) {
                    formatTokenFunctions[token] = func;
                }
                if (padded) {
                    formatTokenFunctions[padded[0]] = function() {
                        return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
                    };
                }
                if (ordinal) {
                    formatTokenFunctions[ordinal] = function() {
                        return this.localeData().ordinal(func.apply(this, arguments), token);
                    };
                }
            }
            function removeFormattingTokens(input) {
                if (input.match(/\[[\s\S]/)) {
                    return input.replace(/^\[|\]$/g, "");
                }
                return input.replace(/\\/g, "");
            }
            function makeFormatFunction(format) {
                var array = format.match(formattingTokens), i, length;
                for (i = 0, length = array.length; i < length; i++) {
                    if (formatTokenFunctions[array[i]]) {
                        array[i] = formatTokenFunctions[array[i]];
                    } else {
                        array[i] = removeFormattingTokens(array[i]);
                    }
                }
                return function(mom) {
                    var output = "";
                    for (i = 0; i < length; i++) {
                        output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
                    }
                    return output;
                };
            }
            function formatMoment(m, format) {
                if (!m.isValid()) {
                    return m.localeData().invalidDate();
                }
                format = expandFormat(format, m.localeData());
                formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);
                return formatFunctions[format](m);
            }
            function expandFormat(format, locale) {
                var i = 5;
                function replaceLongDateFormatTokens(input) {
                    return locale.longDateFormat(input) || input;
                }
                localFormattingTokens.lastIndex = 0;
                while (i >= 0 && localFormattingTokens.test(format)) {
                    format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
                    localFormattingTokens.lastIndex = 0;
                    i -= 1;
                }
                return format;
            }
            var match1 = /\d/;
            var match2 = /\d\d/;
            var match3 = /\d{3}/;
            var match4 = /\d{4}/;
            var match6 = /[+-]?\d{6}/;
            var match1to2 = /\d\d?/;
            var match1to3 = /\d{1,3}/;
            var match1to4 = /\d{1,4}/;
            var match1to6 = /[+-]?\d{1,6}/;
            var matchUnsigned = /\d+/;
            var matchSigned = /[+-]?\d+/;
            var matchOffset = /Z|[+-]\d\d:?\d\d/gi;
            var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/;
            var matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;
            var regexes = {};
            function isFunction(sth) {
                return typeof sth === "function" && Object.prototype.toString.call(sth) === "[object Function]";
            }
            function addRegexToken(token, regex, strictRegex) {
                regexes[token] = isFunction(regex) ? regex : function(isStrict) {
                    return isStrict && strictRegex ? strictRegex : regex;
                };
            }
            function getParseRegexForToken(token, config) {
                if (!hasOwnProp(regexes, token)) {
                    return new RegExp(unescapeFormat(token));
                }
                return regexes[token](config._strict, config._locale);
            }
            function unescapeFormat(s) {
                return s.replace("\\", "").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function(matched, p1, p2, p3, p4) {
                    return p1 || p2 || p3 || p4;
                }).replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
            }
            var tokens = {};
            function addParseToken(token, callback) {
                var i, func = callback;
                if (typeof token === "string") {
                    token = [ token ];
                }
                if (typeof callback === "number") {
                    func = function(input, array) {
                        array[callback] = toInt(input);
                    };
                }
                for (i = 0; i < token.length; i++) {
                    tokens[token[i]] = func;
                }
            }
            function addWeekParseToken(token, callback) {
                addParseToken(token, function(input, array, config, token) {
                    config._w = config._w || {};
                    callback(input, config._w, config, token);
                });
            }
            function addTimeToArrayFromToken(token, input, config) {
                if (input != null && hasOwnProp(tokens, token)) {
                    tokens[token](input, config._a, config, token);
                }
            }
            var YEAR = 0;
            var MONTH = 1;
            var DATE = 2;
            var HOUR = 3;
            var MINUTE = 4;
            var SECOND = 5;
            var MILLISECOND = 6;
            function daysInMonth(year, month) {
                return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            }
            addFormatToken("M", [ "MM", 2 ], "Mo", function() {
                return this.month() + 1;
            });
            addFormatToken("MMM", 0, 0, function(format) {
                return this.localeData().monthsShort(this, format);
            });
            addFormatToken("MMMM", 0, 0, function(format) {
                return this.localeData().months(this, format);
            });
            addUnitAlias("month", "M");
            addRegexToken("M", match1to2);
            addRegexToken("MM", match1to2, match2);
            addRegexToken("MMM", matchWord);
            addRegexToken("MMMM", matchWord);
            addParseToken([ "M", "MM" ], function(input, array) {
                array[MONTH] = toInt(input) - 1;
            });
            addParseToken([ "MMM", "MMMM" ], function(input, array, config, token) {
                var month = config._locale.monthsParse(input, token, config._strict);
                if (month != null) {
                    array[MONTH] = month;
                } else {
                    getParsingFlags(config).invalidMonth = input;
                }
            });
            var defaultLocaleMonths = "January_February_March_April_May_June_July_August_September_October_November_December".split("_");
            function localeMonths(m) {
                return this._months[m.month()];
            }
            var defaultLocaleMonthsShort = "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_");
            function localeMonthsShort(m) {
                return this._monthsShort[m.month()];
            }
            function localeMonthsParse(monthName, format, strict) {
                var i, mom, regex;
                if (!this._monthsParse) {
                    this._monthsParse = [];
                    this._longMonthsParse = [];
                    this._shortMonthsParse = [];
                }
                for (i = 0; i < 12; i++) {
                    mom = create_utc__createUTC([ 2e3, i ]);
                    if (strict && !this._longMonthsParse[i]) {
                        this._longMonthsParse[i] = new RegExp("^" + this.months(mom, "").replace(".", "") + "$", "i");
                        this._shortMonthsParse[i] = new RegExp("^" + this.monthsShort(mom, "").replace(".", "") + "$", "i");
                    }
                    if (!strict && !this._monthsParse[i]) {
                        regex = "^" + this.months(mom, "") + "|^" + this.monthsShort(mom, "");
                        this._monthsParse[i] = new RegExp(regex.replace(".", ""), "i");
                    }
                    if (strict && format === "MMMM" && this._longMonthsParse[i].test(monthName)) {
                        return i;
                    } else if (strict && format === "MMM" && this._shortMonthsParse[i].test(monthName)) {
                        return i;
                    } else if (!strict && this._monthsParse[i].test(monthName)) {
                        return i;
                    }
                }
            }
            function setMonth(mom, value) {
                var dayOfMonth;
                if (typeof value === "string") {
                    value = mom.localeData().monthsParse(value);
                    if (typeof value !== "number") {
                        return mom;
                    }
                }
                dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
                mom._d["set" + (mom._isUTC ? "UTC" : "") + "Month"](value, dayOfMonth);
                return mom;
            }
            function getSetMonth(value) {
                if (value != null) {
                    setMonth(this, value);
                    utils_hooks__hooks.updateOffset(this, true);
                    return this;
                } else {
                    return get_set__get(this, "Month");
                }
            }
            function getDaysInMonth() {
                return daysInMonth(this.year(), this.month());
            }
            function checkOverflow(m) {
                var overflow;
                var a = m._a;
                if (a && getParsingFlags(m).overflow === -2) {
                    overflow = a[MONTH] < 0 || a[MONTH] > 11 ? MONTH : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH]) ? DATE : a[HOUR] < 0 || a[HOUR] > 24 || a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0) ? HOUR : a[MINUTE] < 0 || a[MINUTE] > 59 ? MINUTE : a[SECOND] < 0 || a[SECOND] > 59 ? SECOND : a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND : -1;
                    if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                        overflow = DATE;
                    }
                    getParsingFlags(m).overflow = overflow;
                }
                return m;
            }
            function warn(msg) {
                if (utils_hooks__hooks.suppressDeprecationWarnings === false && typeof console !== "undefined" && console.warn) {
                    console.warn("Deprecation warning: " + msg);
                }
            }
            function deprecate(msg, fn) {
                var firstTime = true;
                return extend(function() {
                    if (firstTime) {
                        warn(msg + "\n" + new Error().stack);
                        firstTime = false;
                    }
                    return fn.apply(this, arguments);
                }, fn);
            }
            var deprecations = {};
            function deprecateSimple(name, msg) {
                if (!deprecations[name]) {
                    warn(msg);
                    deprecations[name] = true;
                }
            }
            utils_hooks__hooks.suppressDeprecationWarnings = false;
            var from_string__isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
            var isoDates = [ [ "YYYYYY-MM-DD", /[+-]\d{6}-\d{2}-\d{2}/ ], [ "YYYY-MM-DD", /\d{4}-\d{2}-\d{2}/ ], [ "GGGG-[W]WW-E", /\d{4}-W\d{2}-\d/ ], [ "GGGG-[W]WW", /\d{4}-W\d{2}/ ], [ "YYYY-DDD", /\d{4}-\d{3}/ ] ];
            var isoTimes = [ [ "HH:mm:ss.SSSS", /(T| )\d\d:\d\d:\d\d\.\d+/ ], [ "HH:mm:ss", /(T| )\d\d:\d\d:\d\d/ ], [ "HH:mm", /(T| )\d\d:\d\d/ ], [ "HH", /(T| )\d\d/ ] ];
            var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;
            function configFromISO(config) {
                var i, l, string = config._i, match = from_string__isoRegex.exec(string);
                if (match) {
                    getParsingFlags(config).iso = true;
                    for (i = 0, l = isoDates.length; i < l; i++) {
                        if (isoDates[i][1].exec(string)) {
                            config._f = isoDates[i][0];
                            break;
                        }
                    }
                    for (i = 0, l = isoTimes.length; i < l; i++) {
                        if (isoTimes[i][1].exec(string)) {
                            config._f += (match[6] || " ") + isoTimes[i][0];
                            break;
                        }
                    }
                    if (string.match(matchOffset)) {
                        config._f += "Z";
                    }
                    configFromStringAndFormat(config);
                } else {
                    config._isValid = false;
                }
            }
            function configFromString(config) {
                var matched = aspNetJsonRegex.exec(config._i);
                if (matched !== null) {
                    config._d = new Date(+matched[1]);
                    return;
                }
                configFromISO(config);
                if (config._isValid === false) {
                    delete config._isValid;
                    utils_hooks__hooks.createFromInputFallback(config);
                }
            }
            utils_hooks__hooks.createFromInputFallback = deprecate("moment construction falls back to js Date. This is " + "discouraged and will be removed in upcoming major " + "release. Please refer to " + "https://github.com/moment/moment/issues/1407 for more info.", function(config) {
                config._d = new Date(config._i + (config._useUTC ? " UTC" : ""));
            });
            function createDate(y, m, d, h, M, s, ms) {
                var date = new Date(y, m, d, h, M, s, ms);
                if (y < 1970) {
                    date.setFullYear(y);
                }
                return date;
            }
            function createUTCDate(y) {
                var date = new Date(Date.UTC.apply(null, arguments));
                if (y < 1970) {
                    date.setUTCFullYear(y);
                }
                return date;
            }
            addFormatToken(0, [ "YY", 2 ], 0, function() {
                return this.year() % 100;
            });
            addFormatToken(0, [ "YYYY", 4 ], 0, "year");
            addFormatToken(0, [ "YYYYY", 5 ], 0, "year");
            addFormatToken(0, [ "YYYYYY", 6, true ], 0, "year");
            addUnitAlias("year", "y");
            addRegexToken("Y", matchSigned);
            addRegexToken("YY", match1to2, match2);
            addRegexToken("YYYY", match1to4, match4);
            addRegexToken("YYYYY", match1to6, match6);
            addRegexToken("YYYYYY", match1to6, match6);
            addParseToken([ "YYYYY", "YYYYYY" ], YEAR);
            addParseToken("YYYY", function(input, array) {
                array[YEAR] = input.length === 2 ? utils_hooks__hooks.parseTwoDigitYear(input) : toInt(input);
            });
            addParseToken("YY", function(input, array) {
                array[YEAR] = utils_hooks__hooks.parseTwoDigitYear(input);
            });
            function daysInYear(year) {
                return isLeapYear(year) ? 366 : 365;
            }
            function isLeapYear(year) {
                return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
            }
            utils_hooks__hooks.parseTwoDigitYear = function(input) {
                return toInt(input) + (toInt(input) > 68 ? 1900 : 2e3);
            };
            var getSetYear = makeGetSet("FullYear", false);
            function getIsLeapYear() {
                return isLeapYear(this.year());
            }
            addFormatToken("w", [ "ww", 2 ], "wo", "week");
            addFormatToken("W", [ "WW", 2 ], "Wo", "isoWeek");
            addUnitAlias("week", "w");
            addUnitAlias("isoWeek", "W");
            addRegexToken("w", match1to2);
            addRegexToken("ww", match1to2, match2);
            addRegexToken("W", match1to2);
            addRegexToken("WW", match1to2, match2);
            addWeekParseToken([ "w", "ww", "W", "WW" ], function(input, week, config, token) {
                week[token.substr(0, 1)] = toInt(input);
            });
            function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
                var end = firstDayOfWeekOfYear - firstDayOfWeek, daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(), adjustedMoment;
                if (daysToDayOfWeek > end) {
                    daysToDayOfWeek -= 7;
                }
                if (daysToDayOfWeek < end - 7) {
                    daysToDayOfWeek += 7;
                }
                adjustedMoment = local__createLocal(mom).add(daysToDayOfWeek, "d");
                return {
                    week: Math.ceil(adjustedMoment.dayOfYear() / 7),
                    year: adjustedMoment.year()
                };
            }
            function localeWeek(mom) {
                return weekOfYear(mom, this._week.dow, this._week.doy).week;
            }
            var defaultLocaleWeek = {
                dow: 0,
                doy: 6
            };
            function localeFirstDayOfWeek() {
                return this._week.dow;
            }
            function localeFirstDayOfYear() {
                return this._week.doy;
            }
            function getSetWeek(input) {
                var week = this.localeData().week(this);
                return input == null ? week : this.add((input - week) * 7, "d");
            }
            function getSetISOWeek(input) {
                var week = weekOfYear(this, 1, 4).week;
                return input == null ? week : this.add((input - week) * 7, "d");
            }
            addFormatToken("DDD", [ "DDDD", 3 ], "DDDo", "dayOfYear");
            addUnitAlias("dayOfYear", "DDD");
            addRegexToken("DDD", match1to3);
            addRegexToken("DDDD", match3);
            addParseToken([ "DDD", "DDDD" ], function(input, array, config) {
                config._dayOfYear = toInt(input);
            });
            function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
                var week1Jan = 6 + firstDayOfWeek - firstDayOfWeekOfYear, janX = createUTCDate(year, 0, 1 + week1Jan), d = janX.getUTCDay(), dayOfYear;
                if (d < firstDayOfWeek) {
                    d += 7;
                }
                weekday = weekday != null ? 1 * weekday : firstDayOfWeek;
                dayOfYear = 1 + week1Jan + 7 * (week - 1) - d + weekday;
                return {
                    year: dayOfYear > 0 ? year : year - 1,
                    dayOfYear: dayOfYear > 0 ? dayOfYear : daysInYear(year - 1) + dayOfYear
                };
            }
            function getSetDayOfYear(input) {
                var dayOfYear = Math.round((this.clone().startOf("day") - this.clone().startOf("year")) / 864e5) + 1;
                return input == null ? dayOfYear : this.add(input - dayOfYear, "d");
            }
            function defaults(a, b, c) {
                if (a != null) {
                    return a;
                }
                if (b != null) {
                    return b;
                }
                return c;
            }
            function currentDateArray(config) {
                var now = new Date();
                if (config._useUTC) {
                    return [ now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() ];
                }
                return [ now.getFullYear(), now.getMonth(), now.getDate() ];
            }
            function configFromArray(config) {
                var i, date, input = [], currentDate, yearToUse;
                if (config._d) {
                    return;
                }
                currentDate = currentDateArray(config);
                if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
                    dayOfYearFromWeekInfo(config);
                }
                if (config._dayOfYear) {
                    yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);
                    if (config._dayOfYear > daysInYear(yearToUse)) {
                        getParsingFlags(config)._overflowDayOfYear = true;
                    }
                    date = createUTCDate(yearToUse, 0, config._dayOfYear);
                    config._a[MONTH] = date.getUTCMonth();
                    config._a[DATE] = date.getUTCDate();
                }
                for (i = 0; i < 3 && config._a[i] == null; ++i) {
                    config._a[i] = input[i] = currentDate[i];
                }
                for (;i < 7; i++) {
                    config._a[i] = input[i] = config._a[i] == null ? i === 2 ? 1 : 0 : config._a[i];
                }
                if (config._a[HOUR] === 24 && config._a[MINUTE] === 0 && config._a[SECOND] === 0 && config._a[MILLISECOND] === 0) {
                    config._nextDay = true;
                    config._a[HOUR] = 0;
                }
                config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
                if (config._tzm != null) {
                    config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
                }
                if (config._nextDay) {
                    config._a[HOUR] = 24;
                }
            }
            function dayOfYearFromWeekInfo(config) {
                var w, weekYear, week, weekday, dow, doy, temp;
                w = config._w;
                if (w.GG != null || w.W != null || w.E != null) {
                    dow = 1;
                    doy = 4;
                    weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(local__createLocal(), 1, 4).year);
                    week = defaults(w.W, 1);
                    weekday = defaults(w.E, 1);
                } else {
                    dow = config._locale._week.dow;
                    doy = config._locale._week.doy;
                    weekYear = defaults(w.gg, config._a[YEAR], weekOfYear(local__createLocal(), dow, doy).year);
                    week = defaults(w.w, 1);
                    if (w.d != null) {
                        weekday = w.d;
                        if (weekday < dow) {
                            ++week;
                        }
                    } else if (w.e != null) {
                        weekday = w.e + dow;
                    } else {
                        weekday = dow;
                    }
                }
                temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);
                config._a[YEAR] = temp.year;
                config._dayOfYear = temp.dayOfYear;
            }
            utils_hooks__hooks.ISO_8601 = function() {};
            function configFromStringAndFormat(config) {
                if (config._f === utils_hooks__hooks.ISO_8601) {
                    configFromISO(config);
                    return;
                }
                config._a = [];
                getParsingFlags(config).empty = true;
                var string = "" + config._i, i, parsedInput, tokens, token, skipped, stringLength = string.length, totalParsedInputLength = 0;
                tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];
                for (i = 0; i < tokens.length; i++) {
                    token = tokens[i];
                    parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
                    if (parsedInput) {
                        skipped = string.substr(0, string.indexOf(parsedInput));
                        if (skipped.length > 0) {
                            getParsingFlags(config).unusedInput.push(skipped);
                        }
                        string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                        totalParsedInputLength += parsedInput.length;
                    }
                    if (formatTokenFunctions[token]) {
                        if (parsedInput) {
                            getParsingFlags(config).empty = false;
                        } else {
                            getParsingFlags(config).unusedTokens.push(token);
                        }
                        addTimeToArrayFromToken(token, parsedInput, config);
                    } else if (config._strict && !parsedInput) {
                        getParsingFlags(config).unusedTokens.push(token);
                    }
                }
                getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
                if (string.length > 0) {
                    getParsingFlags(config).unusedInput.push(string);
                }
                if (getParsingFlags(config).bigHour === true && config._a[HOUR] <= 12 && config._a[HOUR] > 0) {
                    getParsingFlags(config).bigHour = undefined;
                }
                config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);
                configFromArray(config);
                checkOverflow(config);
            }
            function meridiemFixWrap(locale, hour, meridiem) {
                var isPm;
                if (meridiem == null) {
                    return hour;
                }
                if (locale.meridiemHour != null) {
                    return locale.meridiemHour(hour, meridiem);
                } else if (locale.isPM != null) {
                    isPm = locale.isPM(meridiem);
                    if (isPm && hour < 12) {
                        hour += 12;
                    }
                    if (!isPm && hour === 12) {
                        hour = 0;
                    }
                    return hour;
                } else {
                    return hour;
                }
            }
            function configFromStringAndArray(config) {
                var tempConfig, bestMoment, scoreToBeat, i, currentScore;
                if (config._f.length === 0) {
                    getParsingFlags(config).invalidFormat = true;
                    config._d = new Date(NaN);
                    return;
                }
                for (i = 0; i < config._f.length; i++) {
                    currentScore = 0;
                    tempConfig = copyConfig({}, config);
                    if (config._useUTC != null) {
                        tempConfig._useUTC = config._useUTC;
                    }
                    tempConfig._f = config._f[i];
                    configFromStringAndFormat(tempConfig);
                    if (!valid__isValid(tempConfig)) {
                        continue;
                    }
                    currentScore += getParsingFlags(tempConfig).charsLeftOver;
                    currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;
                    getParsingFlags(tempConfig).score = currentScore;
                    if (scoreToBeat == null || currentScore < scoreToBeat) {
                        scoreToBeat = currentScore;
                        bestMoment = tempConfig;
                    }
                }
                extend(config, bestMoment || tempConfig);
            }
            function configFromObject(config) {
                if (config._d) {
                    return;
                }
                var i = normalizeObjectUnits(config._i);
                config._a = [ i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond ];
                configFromArray(config);
            }
            function createFromConfig(config) {
                var res = new Moment(checkOverflow(prepareConfig(config)));
                if (res._nextDay) {
                    res.add(1, "d");
                    res._nextDay = undefined;
                }
                return res;
            }
            function prepareConfig(config) {
                var input = config._i, format = config._f;
                config._locale = config._locale || locale_locales__getLocale(config._l);
                if (input === null || format === undefined && input === "") {
                    return valid__createInvalid({
                        nullInput: true
                    });
                }
                if (typeof input === "string") {
                    config._i = input = config._locale.preparse(input);
                }
                if (isMoment(input)) {
                    return new Moment(checkOverflow(input));
                } else if (isArray(format)) {
                    configFromStringAndArray(config);
                } else if (format) {
                    configFromStringAndFormat(config);
                } else if (isDate(input)) {
                    config._d = input;
                } else {
                    configFromInput(config);
                }
                return config;
            }
            function configFromInput(config) {
                var input = config._i;
                if (input === undefined) {
                    config._d = new Date();
                } else if (isDate(input)) {
                    config._d = new Date(+input);
                } else if (typeof input === "string") {
                    configFromString(config);
                } else if (isArray(input)) {
                    config._a = map(input.slice(0), function(obj) {
                        return parseInt(obj, 10);
                    });
                    configFromArray(config);
                } else if (typeof input === "object") {
                    configFromObject(config);
                } else if (typeof input === "number") {
                    config._d = new Date(input);
                } else {
                    utils_hooks__hooks.createFromInputFallback(config);
                }
            }
            function createLocalOrUTC(input, format, locale, strict, isUTC) {
                var c = {};
                if (typeof locale === "boolean") {
                    strict = locale;
                    locale = undefined;
                }
                c._isAMomentObject = true;
                c._useUTC = c._isUTC = isUTC;
                c._l = locale;
                c._i = input;
                c._f = format;
                c._strict = strict;
                return createFromConfig(c);
            }
            function local__createLocal(input, format, locale, strict) {
                return createLocalOrUTC(input, format, locale, strict, false);
            }
            var prototypeMin = deprecate("moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548", function() {
                var other = local__createLocal.apply(null, arguments);
                return other < this ? this : other;
            });
            var prototypeMax = deprecate("moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548", function() {
                var other = local__createLocal.apply(null, arguments);
                return other > this ? this : other;
            });
            function pickBy(fn, moments) {
                var res, i;
                if (moments.length === 1 && isArray(moments[0])) {
                    moments = moments[0];
                }
                if (!moments.length) {
                    return local__createLocal();
                }
                res = moments[0];
                for (i = 1; i < moments.length; ++i) {
                    if (!moments[i].isValid() || moments[i][fn](res)) {
                        res = moments[i];
                    }
                }
                return res;
            }
            function min() {
                var args = [].slice.call(arguments, 0);
                return pickBy("isBefore", args);
            }
            function max() {
                var args = [].slice.call(arguments, 0);
                return pickBy("isAfter", args);
            }
            function Duration(duration) {
                var normalizedInput = normalizeObjectUnits(duration), years = normalizedInput.year || 0, quarters = normalizedInput.quarter || 0, months = normalizedInput.month || 0, weeks = normalizedInput.week || 0, days = normalizedInput.day || 0, hours = normalizedInput.hour || 0, minutes = normalizedInput.minute || 0, seconds = normalizedInput.second || 0, milliseconds = normalizedInput.millisecond || 0;
                this._milliseconds = +milliseconds + seconds * 1e3 + minutes * 6e4 + hours * 36e5;
                this._days = +days + weeks * 7;
                this._months = +months + quarters * 3 + years * 12;
                this._data = {};
                this._locale = locale_locales__getLocale();
                this._bubble();
            }
            function isDuration(obj) {
                return obj instanceof Duration;
            }
            function offset(token, separator) {
                addFormatToken(token, 0, 0, function() {
                    var offset = this.utcOffset();
                    var sign = "+";
                    if (offset < 0) {
                        offset = -offset;
                        sign = "-";
                    }
                    return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~offset % 60, 2);
                });
            }
            offset("Z", ":");
            offset("ZZ", "");
            addRegexToken("Z", matchOffset);
            addRegexToken("ZZ", matchOffset);
            addParseToken([ "Z", "ZZ" ], function(input, array, config) {
                config._useUTC = true;
                config._tzm = offsetFromString(input);
            });
            var chunkOffset = /([\+\-]|\d\d)/gi;
            function offsetFromString(string) {
                var matches = (string || "").match(matchOffset) || [];
                var chunk = matches[matches.length - 1] || [];
                var parts = (chunk + "").match(chunkOffset) || [ "-", 0, 0 ];
                var minutes = +(parts[1] * 60) + toInt(parts[2]);
                return parts[0] === "+" ? minutes : -minutes;
            }
            function cloneWithOffset(input, model) {
                var res, diff;
                if (model._isUTC) {
                    res = model.clone();
                    diff = (isMoment(input) || isDate(input) ? +input : +local__createLocal(input)) - +res;
                    res._d.setTime(+res._d + diff);
                    utils_hooks__hooks.updateOffset(res, false);
                    return res;
                } else {
                    return local__createLocal(input).local();
                }
            }
            function getDateOffset(m) {
                return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
            }
            utils_hooks__hooks.updateOffset = function() {};
            function getSetOffset(input, keepLocalTime) {
                var offset = this._offset || 0, localAdjust;
                if (input != null) {
                    if (typeof input === "string") {
                        input = offsetFromString(input);
                    }
                    if (Math.abs(input) < 16) {
                        input = input * 60;
                    }
                    if (!this._isUTC && keepLocalTime) {
                        localAdjust = getDateOffset(this);
                    }
                    this._offset = input;
                    this._isUTC = true;
                    if (localAdjust != null) {
                        this.add(localAdjust, "m");
                    }
                    if (offset !== input) {
                        if (!keepLocalTime || this._changeInProgress) {
                            add_subtract__addSubtract(this, create__createDuration(input - offset, "m"), 1, false);
                        } else if (!this._changeInProgress) {
                            this._changeInProgress = true;
                            utils_hooks__hooks.updateOffset(this, true);
                            this._changeInProgress = null;
                        }
                    }
                    return this;
                } else {
                    return this._isUTC ? offset : getDateOffset(this);
                }
            }
            function getSetZone(input, keepLocalTime) {
                if (input != null) {
                    if (typeof input !== "string") {
                        input = -input;
                    }
                    this.utcOffset(input, keepLocalTime);
                    return this;
                } else {
                    return -this.utcOffset();
                }
            }
            function setOffsetToUTC(keepLocalTime) {
                return this.utcOffset(0, keepLocalTime);
            }
            function setOffsetToLocal(keepLocalTime) {
                if (this._isUTC) {
                    this.utcOffset(0, keepLocalTime);
                    this._isUTC = false;
                    if (keepLocalTime) {
                        this.subtract(getDateOffset(this), "m");
                    }
                }
                return this;
            }
            function setOffsetToParsedOffset() {
                if (this._tzm) {
                    this.utcOffset(this._tzm);
                } else if (typeof this._i === "string") {
                    this.utcOffset(offsetFromString(this._i));
                }
                return this;
            }
            function hasAlignedHourOffset(input) {
                input = input ? local__createLocal(input).utcOffset() : 0;
                return (this.utcOffset() - input) % 60 === 0;
            }
            function isDaylightSavingTime() {
                return this.utcOffset() > this.clone().month(0).utcOffset() || this.utcOffset() > this.clone().month(5).utcOffset();
            }
            function isDaylightSavingTimeShifted() {
                if (typeof this._isDSTShifted !== "undefined") {
                    return this._isDSTShifted;
                }
                var c = {};
                copyConfig(c, this);
                c = prepareConfig(c);
                if (c._a) {
                    var other = c._isUTC ? create_utc__createUTC(c._a) : local__createLocal(c._a);
                    this._isDSTShifted = this.isValid() && compareArrays(c._a, other.toArray()) > 0;
                } else {
                    this._isDSTShifted = false;
                }
                return this._isDSTShifted;
            }
            function isLocal() {
                return !this._isUTC;
            }
            function isUtcOffset() {
                return this._isUTC;
            }
            function isUtc() {
                return this._isUTC && this._offset === 0;
            }
            var aspNetRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/;
            var create__isoRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/;
            function create__createDuration(input, key) {
                var duration = input, match = null, sign, ret, diffRes;
                if (isDuration(input)) {
                    duration = {
                        ms: input._milliseconds,
                        d: input._days,
                        M: input._months
                    };
                } else if (typeof input === "number") {
                    duration = {};
                    if (key) {
                        duration[key] = input;
                    } else {
                        duration.milliseconds = input;
                    }
                } else if (!!(match = aspNetRegex.exec(input))) {
                    sign = match[1] === "-" ? -1 : 1;
                    duration = {
                        y: 0,
                        d: toInt(match[DATE]) * sign,
                        h: toInt(match[HOUR]) * sign,
                        m: toInt(match[MINUTE]) * sign,
                        s: toInt(match[SECOND]) * sign,
                        ms: toInt(match[MILLISECOND]) * sign
                    };
                } else if (!!(match = create__isoRegex.exec(input))) {
                    sign = match[1] === "-" ? -1 : 1;
                    duration = {
                        y: parseIso(match[2], sign),
                        M: parseIso(match[3], sign),
                        d: parseIso(match[4], sign),
                        h: parseIso(match[5], sign),
                        m: parseIso(match[6], sign),
                        s: parseIso(match[7], sign),
                        w: parseIso(match[8], sign)
                    };
                } else if (duration == null) {
                    duration = {};
                } else if (typeof duration === "object" && ("from" in duration || "to" in duration)) {
                    diffRes = momentsDifference(local__createLocal(duration.from), local__createLocal(duration.to));
                    duration = {};
                    duration.ms = diffRes.milliseconds;
                    duration.M = diffRes.months;
                }
                ret = new Duration(duration);
                if (isDuration(input) && hasOwnProp(input, "_locale")) {
                    ret._locale = input._locale;
                }
                return ret;
            }
            create__createDuration.fn = Duration.prototype;
            function parseIso(inp, sign) {
                var res = inp && parseFloat(inp.replace(",", "."));
                return (isNaN(res) ? 0 : res) * sign;
            }
            function positiveMomentsDifference(base, other) {
                var res = {
                    milliseconds: 0,
                    months: 0
                };
                res.months = other.month() - base.month() + (other.year() - base.year()) * 12;
                if (base.clone().add(res.months, "M").isAfter(other)) {
                    --res.months;
                }
                res.milliseconds = +other - +base.clone().add(res.months, "M");
                return res;
            }
            function momentsDifference(base, other) {
                var res;
                other = cloneWithOffset(other, base);
                if (base.isBefore(other)) {
                    res = positiveMomentsDifference(base, other);
                } else {
                    res = positiveMomentsDifference(other, base);
                    res.milliseconds = -res.milliseconds;
                    res.months = -res.months;
                }
                return res;
            }
            function createAdder(direction, name) {
                return function(val, period) {
                    var dur, tmp;
                    if (period !== null && !isNaN(+period)) {
                        deprecateSimple(name, "moment()." + name + "(period, number) is deprecated. Please use moment()." + name + "(number, period).");
                        tmp = val;
                        val = period;
                        period = tmp;
                    }
                    val = typeof val === "string" ? +val : val;
                    dur = create__createDuration(val, period);
                    add_subtract__addSubtract(this, dur, direction);
                    return this;
                };
            }
            function add_subtract__addSubtract(mom, duration, isAdding, updateOffset) {
                var milliseconds = duration._milliseconds, days = duration._days, months = duration._months;
                updateOffset = updateOffset == null ? true : updateOffset;
                if (milliseconds) {
                    mom._d.setTime(+mom._d + milliseconds * isAdding);
                }
                if (days) {
                    get_set__set(mom, "Date", get_set__get(mom, "Date") + days * isAdding);
                }
                if (months) {
                    setMonth(mom, get_set__get(mom, "Month") + months * isAdding);
                }
                if (updateOffset) {
                    utils_hooks__hooks.updateOffset(mom, days || months);
                }
            }
            var add_subtract__add = createAdder(1, "add");
            var add_subtract__subtract = createAdder(-1, "subtract");
            function moment_calendar__calendar(time, formats) {
                var now = time || local__createLocal(), sod = cloneWithOffset(now, this).startOf("day"), diff = this.diff(sod, "days", true), format = diff < -6 ? "sameElse" : diff < -1 ? "lastWeek" : diff < 0 ? "lastDay" : diff < 1 ? "sameDay" : diff < 2 ? "nextDay" : diff < 7 ? "nextWeek" : "sameElse";
                return this.format(formats && formats[format] || this.localeData().calendar(format, this, local__createLocal(now)));
            }
            function clone() {
                return new Moment(this);
            }
            function isAfter(input, units) {
                var inputMs;
                units = normalizeUnits(typeof units !== "undefined" ? units : "millisecond");
                if (units === "millisecond") {
                    input = isMoment(input) ? input : local__createLocal(input);
                    return +this > +input;
                } else {
                    inputMs = isMoment(input) ? +input : +local__createLocal(input);
                    return inputMs < +this.clone().startOf(units);
                }
            }
            function isBefore(input, units) {
                var inputMs;
                units = normalizeUnits(typeof units !== "undefined" ? units : "millisecond");
                if (units === "millisecond") {
                    input = isMoment(input) ? input : local__createLocal(input);
                    return +this < +input;
                } else {
                    inputMs = isMoment(input) ? +input : +local__createLocal(input);
                    return +this.clone().endOf(units) < inputMs;
                }
            }
            function isBetween(from, to, units) {
                return this.isAfter(from, units) && this.isBefore(to, units);
            }
            function isSame(input, units) {
                var inputMs;
                units = normalizeUnits(units || "millisecond");
                if (units === "millisecond") {
                    input = isMoment(input) ? input : local__createLocal(input);
                    return +this === +input;
                } else {
                    inputMs = +local__createLocal(input);
                    return +this.clone().startOf(units) <= inputMs && inputMs <= +this.clone().endOf(units);
                }
            }
            function diff(input, units, asFloat) {
                var that = cloneWithOffset(input, this), zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4, delta, output;
                units = normalizeUnits(units);
                if (units === "year" || units === "month" || units === "quarter") {
                    output = monthDiff(this, that);
                    if (units === "quarter") {
                        output = output / 3;
                    } else if (units === "year") {
                        output = output / 12;
                    }
                } else {
                    delta = this - that;
                    output = units === "second" ? delta / 1e3 : units === "minute" ? delta / 6e4 : units === "hour" ? delta / 36e5 : units === "day" ? (delta - zoneDelta) / 864e5 : units === "week" ? (delta - zoneDelta) / 6048e5 : delta;
                }
                return asFloat ? output : absFloor(output);
            }
            function monthDiff(a, b) {
                var wholeMonthDiff = (b.year() - a.year()) * 12 + (b.month() - a.month()), anchor = a.clone().add(wholeMonthDiff, "months"), anchor2, adjust;
                if (b - anchor < 0) {
                    anchor2 = a.clone().add(wholeMonthDiff - 1, "months");
                    adjust = (b - anchor) / (anchor - anchor2);
                } else {
                    anchor2 = a.clone().add(wholeMonthDiff + 1, "months");
                    adjust = (b - anchor) / (anchor2 - anchor);
                }
                return -(wholeMonthDiff + adjust);
            }
            utils_hooks__hooks.defaultFormat = "YYYY-MM-DDTHH:mm:ssZ";
            function toString() {
                return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
            }
            function moment_format__toISOString() {
                var m = this.clone().utc();
                if (0 < m.year() && m.year() <= 9999) {
                    if ("function" === typeof Date.prototype.toISOString) {
                        return this.toDate().toISOString();
                    } else {
                        return formatMoment(m, "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
                    }
                } else {
                    return formatMoment(m, "YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
                }
            }
            function format(inputString) {
                var output = formatMoment(this, inputString || utils_hooks__hooks.defaultFormat);
                return this.localeData().postformat(output);
            }
            function from(time, withoutSuffix) {
                if (!this.isValid()) {
                    return this.localeData().invalidDate();
                }
                return create__createDuration({
                    to: this,
                    from: time
                }).locale(this.locale()).humanize(!withoutSuffix);
            }
            function fromNow(withoutSuffix) {
                return this.from(local__createLocal(), withoutSuffix);
            }
            function to(time, withoutSuffix) {
                if (!this.isValid()) {
                    return this.localeData().invalidDate();
                }
                return create__createDuration({
                    from: this,
                    to: time
                }).locale(this.locale()).humanize(!withoutSuffix);
            }
            function toNow(withoutSuffix) {
                return this.to(local__createLocal(), withoutSuffix);
            }
            function locale(key) {
                var newLocaleData;
                if (key === undefined) {
                    return this._locale._abbr;
                } else {
                    newLocaleData = locale_locales__getLocale(key);
                    if (newLocaleData != null) {
                        this._locale = newLocaleData;
                    }
                    return this;
                }
            }
            var lang = deprecate("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.", function(key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            });
            function localeData() {
                return this._locale;
            }
            function startOf(units) {
                units = normalizeUnits(units);
                switch (units) {
                  case "year":
                    this.month(0);

                  case "quarter":
                  case "month":
                    this.date(1);

                  case "week":
                  case "isoWeek":
                  case "day":
                    this.hours(0);

                  case "hour":
                    this.minutes(0);

                  case "minute":
                    this.seconds(0);

                  case "second":
                    this.milliseconds(0);
                }
                if (units === "week") {
                    this.weekday(0);
                }
                if (units === "isoWeek") {
                    this.isoWeekday(1);
                }
                if (units === "quarter") {
                    this.month(Math.floor(this.month() / 3) * 3);
                }
                return this;
            }
            function endOf(units) {
                units = normalizeUnits(units);
                if (units === undefined || units === "millisecond") {
                    return this;
                }
                return this.startOf(units).add(1, units === "isoWeek" ? "week" : units).subtract(1, "ms");
            }
            function to_type__valueOf() {
                return +this._d - (this._offset || 0) * 6e4;
            }
            function unix() {
                return Math.floor(+this / 1e3);
            }
            function toDate() {
                return this._offset ? new Date(+this) : this._d;
            }
            function toArray() {
                var m = this;
                return [ m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond() ];
            }
            function toObject() {
                var m = this;
                return {
                    years: m.year(),
                    months: m.month(),
                    date: m.date(),
                    hours: m.hours(),
                    minutes: m.minutes(),
                    seconds: m.seconds(),
                    milliseconds: m.milliseconds()
                };
            }
            function moment_valid__isValid() {
                return valid__isValid(this);
            }
            function parsingFlags() {
                return extend({}, getParsingFlags(this));
            }
            function invalidAt() {
                return getParsingFlags(this).overflow;
            }
            addFormatToken(0, [ "gg", 2 ], 0, function() {
                return this.weekYear() % 100;
            });
            addFormatToken(0, [ "GG", 2 ], 0, function() {
                return this.isoWeekYear() % 100;
            });
            function addWeekYearFormatToken(token, getter) {
                addFormatToken(0, [ token, token.length ], 0, getter);
            }
            addWeekYearFormatToken("gggg", "weekYear");
            addWeekYearFormatToken("ggggg", "weekYear");
            addWeekYearFormatToken("GGGG", "isoWeekYear");
            addWeekYearFormatToken("GGGGG", "isoWeekYear");
            addUnitAlias("weekYear", "gg");
            addUnitAlias("isoWeekYear", "GG");
            addRegexToken("G", matchSigned);
            addRegexToken("g", matchSigned);
            addRegexToken("GG", match1to2, match2);
            addRegexToken("gg", match1to2, match2);
            addRegexToken("GGGG", match1to4, match4);
            addRegexToken("gggg", match1to4, match4);
            addRegexToken("GGGGG", match1to6, match6);
            addRegexToken("ggggg", match1to6, match6);
            addWeekParseToken([ "gggg", "ggggg", "GGGG", "GGGGG" ], function(input, week, config, token) {
                week[token.substr(0, 2)] = toInt(input);
            });
            addWeekParseToken([ "gg", "GG" ], function(input, week, config, token) {
                week[token] = utils_hooks__hooks.parseTwoDigitYear(input);
            });
            function weeksInYear(year, dow, doy) {
                return weekOfYear(local__createLocal([ year, 11, 31 + dow - doy ]), dow, doy).week;
            }
            function getSetWeekYear(input) {
                var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
                return input == null ? year : this.add(input - year, "y");
            }
            function getSetISOWeekYear(input) {
                var year = weekOfYear(this, 1, 4).year;
                return input == null ? year : this.add(input - year, "y");
            }
            function getISOWeeksInYear() {
                return weeksInYear(this.year(), 1, 4);
            }
            function getWeeksInYear() {
                var weekInfo = this.localeData()._week;
                return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
            }
            addFormatToken("Q", 0, 0, "quarter");
            addUnitAlias("quarter", "Q");
            addRegexToken("Q", match1);
            addParseToken("Q", function(input, array) {
                array[MONTH] = (toInt(input) - 1) * 3;
            });
            function getSetQuarter(input) {
                return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
            }
            addFormatToken("D", [ "DD", 2 ], "Do", "date");
            addUnitAlias("date", "D");
            addRegexToken("D", match1to2);
            addRegexToken("DD", match1to2, match2);
            addRegexToken("Do", function(isStrict, locale) {
                return isStrict ? locale._ordinalParse : locale._ordinalParseLenient;
            });
            addParseToken([ "D", "DD" ], DATE);
            addParseToken("Do", function(input, array) {
                array[DATE] = toInt(input.match(match1to2)[0], 10);
            });
            var getSetDayOfMonth = makeGetSet("Date", true);
            addFormatToken("d", 0, "do", "day");
            addFormatToken("dd", 0, 0, function(format) {
                return this.localeData().weekdaysMin(this, format);
            });
            addFormatToken("ddd", 0, 0, function(format) {
                return this.localeData().weekdaysShort(this, format);
            });
            addFormatToken("dddd", 0, 0, function(format) {
                return this.localeData().weekdays(this, format);
            });
            addFormatToken("e", 0, 0, "weekday");
            addFormatToken("E", 0, 0, "isoWeekday");
            addUnitAlias("day", "d");
            addUnitAlias("weekday", "e");
            addUnitAlias("isoWeekday", "E");
            addRegexToken("d", match1to2);
            addRegexToken("e", match1to2);
            addRegexToken("E", match1to2);
            addRegexToken("dd", matchWord);
            addRegexToken("ddd", matchWord);
            addRegexToken("dddd", matchWord);
            addWeekParseToken([ "dd", "ddd", "dddd" ], function(input, week, config) {
                var weekday = config._locale.weekdaysParse(input);
                if (weekday != null) {
                    week.d = weekday;
                } else {
                    getParsingFlags(config).invalidWeekday = input;
                }
            });
            addWeekParseToken([ "d", "e", "E" ], function(input, week, config, token) {
                week[token] = toInt(input);
            });
            function parseWeekday(input, locale) {
                if (typeof input !== "string") {
                    return input;
                }
                if (!isNaN(input)) {
                    return parseInt(input, 10);
                }
                input = locale.weekdaysParse(input);
                if (typeof input === "number") {
                    return input;
                }
                return null;
            }
            var defaultLocaleWeekdays = "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_");
            function localeWeekdays(m) {
                return this._weekdays[m.day()];
            }
            var defaultLocaleWeekdaysShort = "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_");
            function localeWeekdaysShort(m) {
                return this._weekdaysShort[m.day()];
            }
            var defaultLocaleWeekdaysMin = "Su_Mo_Tu_We_Th_Fr_Sa".split("_");
            function localeWeekdaysMin(m) {
                return this._weekdaysMin[m.day()];
            }
            function localeWeekdaysParse(weekdayName) {
                var i, mom, regex;
                this._weekdaysParse = this._weekdaysParse || [];
                for (i = 0; i < 7; i++) {
                    if (!this._weekdaysParse[i]) {
                        mom = local__createLocal([ 2e3, 1 ]).day(i);
                        regex = "^" + this.weekdays(mom, "") + "|^" + this.weekdaysShort(mom, "") + "|^" + this.weekdaysMin(mom, "");
                        this._weekdaysParse[i] = new RegExp(regex.replace(".", ""), "i");
                    }
                    if (this._weekdaysParse[i].test(weekdayName)) {
                        return i;
                    }
                }
            }
            function getSetDayOfWeek(input) {
                var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
                if (input != null) {
                    input = parseWeekday(input, this.localeData());
                    return this.add(input - day, "d");
                } else {
                    return day;
                }
            }
            function getSetLocaleDayOfWeek(input) {
                var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
                return input == null ? weekday : this.add(input - weekday, "d");
            }
            function getSetISODayOfWeek(input) {
                return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
            }
            addFormatToken("H", [ "HH", 2 ], 0, "hour");
            addFormatToken("h", [ "hh", 2 ], 0, function() {
                return this.hours() % 12 || 12;
            });
            function meridiem(token, lowercase) {
                addFormatToken(token, 0, 0, function() {
                    return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
                });
            }
            meridiem("a", true);
            meridiem("A", false);
            addUnitAlias("hour", "h");
            function matchMeridiem(isStrict, locale) {
                return locale._meridiemParse;
            }
            addRegexToken("a", matchMeridiem);
            addRegexToken("A", matchMeridiem);
            addRegexToken("H", match1to2);
            addRegexToken("h", match1to2);
            addRegexToken("HH", match1to2, match2);
            addRegexToken("hh", match1to2, match2);
            addParseToken([ "H", "HH" ], HOUR);
            addParseToken([ "a", "A" ], function(input, array, config) {
                config._isPm = config._locale.isPM(input);
                config._meridiem = input;
            });
            addParseToken([ "h", "hh" ], function(input, array, config) {
                array[HOUR] = toInt(input);
                getParsingFlags(config).bigHour = true;
            });
            function localeIsPM(input) {
                return (input + "").toLowerCase().charAt(0) === "p";
            }
            var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
            function localeMeridiem(hours, minutes, isLower) {
                if (hours > 11) {
                    return isLower ? "pm" : "PM";
                } else {
                    return isLower ? "am" : "AM";
                }
            }
            var getSetHour = makeGetSet("Hours", true);
            addFormatToken("m", [ "mm", 2 ], 0, "minute");
            addUnitAlias("minute", "m");
            addRegexToken("m", match1to2);
            addRegexToken("mm", match1to2, match2);
            addParseToken([ "m", "mm" ], MINUTE);
            var getSetMinute = makeGetSet("Minutes", false);
            addFormatToken("s", [ "ss", 2 ], 0, "second");
            addUnitAlias("second", "s");
            addRegexToken("s", match1to2);
            addRegexToken("ss", match1to2, match2);
            addParseToken([ "s", "ss" ], SECOND);
            var getSetSecond = makeGetSet("Seconds", false);
            addFormatToken("S", 0, 0, function() {
                return ~~(this.millisecond() / 100);
            });
            addFormatToken(0, [ "SS", 2 ], 0, function() {
                return ~~(this.millisecond() / 10);
            });
            addFormatToken(0, [ "SSS", 3 ], 0, "millisecond");
            addFormatToken(0, [ "SSSS", 4 ], 0, function() {
                return this.millisecond() * 10;
            });
            addFormatToken(0, [ "SSSSS", 5 ], 0, function() {
                return this.millisecond() * 100;
            });
            addFormatToken(0, [ "SSSSSS", 6 ], 0, function() {
                return this.millisecond() * 1e3;
            });
            addFormatToken(0, [ "SSSSSSS", 7 ], 0, function() {
                return this.millisecond() * 1e4;
            });
            addFormatToken(0, [ "SSSSSSSS", 8 ], 0, function() {
                return this.millisecond() * 1e5;
            });
            addFormatToken(0, [ "SSSSSSSSS", 9 ], 0, function() {
                return this.millisecond() * 1e6;
            });
            addUnitAlias("millisecond", "ms");
            addRegexToken("S", match1to3, match1);
            addRegexToken("SS", match1to3, match2);
            addRegexToken("SSS", match1to3, match3);
            var token;
            for (token = "SSSS"; token.length <= 9; token += "S") {
                addRegexToken(token, matchUnsigned);
            }
            function parseMs(input, array) {
                array[MILLISECOND] = toInt(("0." + input) * 1e3);
            }
            for (token = "S"; token.length <= 9; token += "S") {
                addParseToken(token, parseMs);
            }
            var getSetMillisecond = makeGetSet("Milliseconds", false);
            addFormatToken("z", 0, 0, "zoneAbbr");
            addFormatToken("zz", 0, 0, "zoneName");
            function getZoneAbbr() {
                return this._isUTC ? "UTC" : "";
            }
            function getZoneName() {
                return this._isUTC ? "Coordinated Universal Time" : "";
            }
            var momentPrototype__proto = Moment.prototype;
            momentPrototype__proto.add = add_subtract__add;
            momentPrototype__proto.calendar = moment_calendar__calendar;
            momentPrototype__proto.clone = clone;
            momentPrototype__proto.diff = diff;
            momentPrototype__proto.endOf = endOf;
            momentPrototype__proto.format = format;
            momentPrototype__proto.from = from;
            momentPrototype__proto.fromNow = fromNow;
            momentPrototype__proto.to = to;
            momentPrototype__proto.toNow = toNow;
            momentPrototype__proto.get = getSet;
            momentPrototype__proto.invalidAt = invalidAt;
            momentPrototype__proto.isAfter = isAfter;
            momentPrototype__proto.isBefore = isBefore;
            momentPrototype__proto.isBetween = isBetween;
            momentPrototype__proto.isSame = isSame;
            momentPrototype__proto.isValid = moment_valid__isValid;
            momentPrototype__proto.lang = lang;
            momentPrototype__proto.locale = locale;
            momentPrototype__proto.localeData = localeData;
            momentPrototype__proto.max = prototypeMax;
            momentPrototype__proto.min = prototypeMin;
            momentPrototype__proto.parsingFlags = parsingFlags;
            momentPrototype__proto.set = getSet;
            momentPrototype__proto.startOf = startOf;
            momentPrototype__proto.subtract = add_subtract__subtract;
            momentPrototype__proto.toArray = toArray;
            momentPrototype__proto.toObject = toObject;
            momentPrototype__proto.toDate = toDate;
            momentPrototype__proto.toISOString = moment_format__toISOString;
            momentPrototype__proto.toJSON = moment_format__toISOString;
            momentPrototype__proto.toString = toString;
            momentPrototype__proto.unix = unix;
            momentPrototype__proto.valueOf = to_type__valueOf;
            momentPrototype__proto.year = getSetYear;
            momentPrototype__proto.isLeapYear = getIsLeapYear;
            momentPrototype__proto.weekYear = getSetWeekYear;
            momentPrototype__proto.isoWeekYear = getSetISOWeekYear;
            momentPrototype__proto.quarter = momentPrototype__proto.quarters = getSetQuarter;
            momentPrototype__proto.month = getSetMonth;
            momentPrototype__proto.daysInMonth = getDaysInMonth;
            momentPrototype__proto.week = momentPrototype__proto.weeks = getSetWeek;
            momentPrototype__proto.isoWeek = momentPrototype__proto.isoWeeks = getSetISOWeek;
            momentPrototype__proto.weeksInYear = getWeeksInYear;
            momentPrototype__proto.isoWeeksInYear = getISOWeeksInYear;
            momentPrototype__proto.date = getSetDayOfMonth;
            momentPrototype__proto.day = momentPrototype__proto.days = getSetDayOfWeek;
            momentPrototype__proto.weekday = getSetLocaleDayOfWeek;
            momentPrototype__proto.isoWeekday = getSetISODayOfWeek;
            momentPrototype__proto.dayOfYear = getSetDayOfYear;
            momentPrototype__proto.hour = momentPrototype__proto.hours = getSetHour;
            momentPrototype__proto.minute = momentPrototype__proto.minutes = getSetMinute;
            momentPrototype__proto.second = momentPrototype__proto.seconds = getSetSecond;
            momentPrototype__proto.millisecond = momentPrototype__proto.milliseconds = getSetMillisecond;
            momentPrototype__proto.utcOffset = getSetOffset;
            momentPrototype__proto.utc = setOffsetToUTC;
            momentPrototype__proto.local = setOffsetToLocal;
            momentPrototype__proto.parseZone = setOffsetToParsedOffset;
            momentPrototype__proto.hasAlignedHourOffset = hasAlignedHourOffset;
            momentPrototype__proto.isDST = isDaylightSavingTime;
            momentPrototype__proto.isDSTShifted = isDaylightSavingTimeShifted;
            momentPrototype__proto.isLocal = isLocal;
            momentPrototype__proto.isUtcOffset = isUtcOffset;
            momentPrototype__proto.isUtc = isUtc;
            momentPrototype__proto.isUTC = isUtc;
            momentPrototype__proto.zoneAbbr = getZoneAbbr;
            momentPrototype__proto.zoneName = getZoneName;
            momentPrototype__proto.dates = deprecate("dates accessor is deprecated. Use date instead.", getSetDayOfMonth);
            momentPrototype__proto.months = deprecate("months accessor is deprecated. Use month instead", getSetMonth);
            momentPrototype__proto.years = deprecate("years accessor is deprecated. Use year instead", getSetYear);
            momentPrototype__proto.zone = deprecate("moment().zone is deprecated, use moment().utcOffset instead. https://github.com/moment/moment/issues/1779", getSetZone);
            var momentPrototype = momentPrototype__proto;
            function moment__createUnix(input) {
                return local__createLocal(input * 1e3);
            }
            function moment__createInZone() {
                return local__createLocal.apply(null, arguments).parseZone();
            }
            var defaultCalendar = {
                sameDay: "[Today at] LT",
                nextDay: "[Tomorrow at] LT",
                nextWeek: "dddd [at] LT",
                lastDay: "[Yesterday at] LT",
                lastWeek: "[Last] dddd [at] LT",
                sameElse: "L"
            };
            function locale_calendar__calendar(key, mom, now) {
                var output = this._calendar[key];
                return typeof output === "function" ? output.call(mom, now) : output;
            }
            var defaultLongDateFormat = {
                LTS: "h:mm:ss A",
                LT: "h:mm A",
                L: "MM/DD/YYYY",
                LL: "MMMM D, YYYY",
                LLL: "MMMM D, YYYY h:mm A",
                LLLL: "dddd, MMMM D, YYYY h:mm A"
            };
            function longDateFormat(key) {
                var format = this._longDateFormat[key], formatUpper = this._longDateFormat[key.toUpperCase()];
                if (format || !formatUpper) {
                    return format;
                }
                this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function(val) {
                    return val.slice(1);
                });
                return this._longDateFormat[key];
            }
            var defaultInvalidDate = "Invalid date";
            function invalidDate() {
                return this._invalidDate;
            }
            var defaultOrdinal = "%d";
            var defaultOrdinalParse = /\d{1,2}/;
            function ordinal(number) {
                return this._ordinal.replace("%d", number);
            }
            function preParsePostFormat(string) {
                return string;
            }
            var defaultRelativeTime = {
                future: "in %s",
                past: "%s ago",
                s: "a few seconds",
                m: "a minute",
                mm: "%d minutes",
                h: "an hour",
                hh: "%d hours",
                d: "a day",
                dd: "%d days",
                M: "a month",
                MM: "%d months",
                y: "a year",
                yy: "%d years"
            };
            function relative__relativeTime(number, withoutSuffix, string, isFuture) {
                var output = this._relativeTime[string];
                return typeof output === "function" ? output(number, withoutSuffix, string, isFuture) : output.replace(/%d/i, number);
            }
            function pastFuture(diff, output) {
                var format = this._relativeTime[diff > 0 ? "future" : "past"];
                return typeof format === "function" ? format(output) : format.replace(/%s/i, output);
            }
            function locale_set__set(config) {
                var prop, i;
                for (i in config) {
                    prop = config[i];
                    if (typeof prop === "function") {
                        this[i] = prop;
                    } else {
                        this["_" + i] = prop;
                    }
                }
                this._ordinalParseLenient = new RegExp(this._ordinalParse.source + "|" + /\d{1,2}/.source);
            }
            var prototype__proto = Locale.prototype;
            prototype__proto._calendar = defaultCalendar;
            prototype__proto.calendar = locale_calendar__calendar;
            prototype__proto._longDateFormat = defaultLongDateFormat;
            prototype__proto.longDateFormat = longDateFormat;
            prototype__proto._invalidDate = defaultInvalidDate;
            prototype__proto.invalidDate = invalidDate;
            prototype__proto._ordinal = defaultOrdinal;
            prototype__proto.ordinal = ordinal;
            prototype__proto._ordinalParse = defaultOrdinalParse;
            prototype__proto.preparse = preParsePostFormat;
            prototype__proto.postformat = preParsePostFormat;
            prototype__proto._relativeTime = defaultRelativeTime;
            prototype__proto.relativeTime = relative__relativeTime;
            prototype__proto.pastFuture = pastFuture;
            prototype__proto.set = locale_set__set;
            prototype__proto.months = localeMonths;
            prototype__proto._months = defaultLocaleMonths;
            prototype__proto.monthsShort = localeMonthsShort;
            prototype__proto._monthsShort = defaultLocaleMonthsShort;
            prototype__proto.monthsParse = localeMonthsParse;
            prototype__proto.week = localeWeek;
            prototype__proto._week = defaultLocaleWeek;
            prototype__proto.firstDayOfYear = localeFirstDayOfYear;
            prototype__proto.firstDayOfWeek = localeFirstDayOfWeek;
            prototype__proto.weekdays = localeWeekdays;
            prototype__proto._weekdays = defaultLocaleWeekdays;
            prototype__proto.weekdaysMin = localeWeekdaysMin;
            prototype__proto._weekdaysMin = defaultLocaleWeekdaysMin;
            prototype__proto.weekdaysShort = localeWeekdaysShort;
            prototype__proto._weekdaysShort = defaultLocaleWeekdaysShort;
            prototype__proto.weekdaysParse = localeWeekdaysParse;
            prototype__proto.isPM = localeIsPM;
            prototype__proto._meridiemParse = defaultLocaleMeridiemParse;
            prototype__proto.meridiem = localeMeridiem;
            function lists__get(format, index, field, setter) {
                var locale = locale_locales__getLocale();
                var utc = create_utc__createUTC().set(setter, index);
                return locale[field](utc, format);
            }
            function list(format, index, field, count, setter) {
                if (typeof format === "number") {
                    index = format;
                    format = undefined;
                }
                format = format || "";
                if (index != null) {
                    return lists__get(format, index, field, setter);
                }
                var i;
                var out = [];
                for (i = 0; i < count; i++) {
                    out[i] = lists__get(format, i, field, setter);
                }
                return out;
            }
            function lists__listMonths(format, index) {
                return list(format, index, "months", 12, "month");
            }
            function lists__listMonthsShort(format, index) {
                return list(format, index, "monthsShort", 12, "month");
            }
            function lists__listWeekdays(format, index) {
                return list(format, index, "weekdays", 7, "day");
            }
            function lists__listWeekdaysShort(format, index) {
                return list(format, index, "weekdaysShort", 7, "day");
            }
            function lists__listWeekdaysMin(format, index) {
                return list(format, index, "weekdaysMin", 7, "day");
            }
            locale_locales__getSetGlobalLocale("en", {
                ordinalParse: /\d{1,2}(th|st|nd|rd)/,
                ordinal: function(number) {
                    var b = number % 10, output = toInt(number % 100 / 10) === 1 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th";
                    return number + output;
                }
            });
            utils_hooks__hooks.lang = deprecate("moment.lang is deprecated. Use moment.locale instead.", locale_locales__getSetGlobalLocale);
            utils_hooks__hooks.langData = deprecate("moment.langData is deprecated. Use moment.localeData instead.", locale_locales__getLocale);
            var mathAbs = Math.abs;
            function duration_abs__abs() {
                var data = this._data;
                this._milliseconds = mathAbs(this._milliseconds);
                this._days = mathAbs(this._days);
                this._months = mathAbs(this._months);
                data.milliseconds = mathAbs(data.milliseconds);
                data.seconds = mathAbs(data.seconds);
                data.minutes = mathAbs(data.minutes);
                data.hours = mathAbs(data.hours);
                data.months = mathAbs(data.months);
                data.years = mathAbs(data.years);
                return this;
            }
            function duration_add_subtract__addSubtract(duration, input, value, direction) {
                var other = create__createDuration(input, value);
                duration._milliseconds += direction * other._milliseconds;
                duration._days += direction * other._days;
                duration._months += direction * other._months;
                return duration._bubble();
            }
            function duration_add_subtract__add(input, value) {
                return duration_add_subtract__addSubtract(this, input, value, 1);
            }
            function duration_add_subtract__subtract(input, value) {
                return duration_add_subtract__addSubtract(this, input, value, -1);
            }
            function absCeil(number) {
                if (number < 0) {
                    return Math.floor(number);
                } else {
                    return Math.ceil(number);
                }
            }
            function bubble() {
                var milliseconds = this._milliseconds;
                var days = this._days;
                var months = this._months;
                var data = this._data;
                var seconds, minutes, hours, years, monthsFromDays;
                if (!(milliseconds >= 0 && days >= 0 && months >= 0 || milliseconds <= 0 && days <= 0 && months <= 0)) {
                    milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
                    days = 0;
                    months = 0;
                }
                data.milliseconds = milliseconds % 1e3;
                seconds = absFloor(milliseconds / 1e3);
                data.seconds = seconds % 60;
                minutes = absFloor(seconds / 60);
                data.minutes = minutes % 60;
                hours = absFloor(minutes / 60);
                data.hours = hours % 24;
                days += absFloor(hours / 24);
                monthsFromDays = absFloor(daysToMonths(days));
                months += monthsFromDays;
                days -= absCeil(monthsToDays(monthsFromDays));
                years = absFloor(months / 12);
                months %= 12;
                data.days = days;
                data.months = months;
                data.years = years;
                return this;
            }
            function daysToMonths(days) {
                return days * 4800 / 146097;
            }
            function monthsToDays(months) {
                return months * 146097 / 4800;
            }
            function as(units) {
                var days;
                var months;
                var milliseconds = this._milliseconds;
                units = normalizeUnits(units);
                if (units === "month" || units === "year") {
                    days = this._days + milliseconds / 864e5;
                    months = this._months + daysToMonths(days);
                    return units === "month" ? months : months / 12;
                } else {
                    days = this._days + Math.round(monthsToDays(this._months));
                    switch (units) {
                      case "week":
                        return days / 7 + milliseconds / 6048e5;

                      case "day":
                        return days + milliseconds / 864e5;

                      case "hour":
                        return days * 24 + milliseconds / 36e5;

                      case "minute":
                        return days * 1440 + milliseconds / 6e4;

                      case "second":
                        return days * 86400 + milliseconds / 1e3;

                      case "millisecond":
                        return Math.floor(days * 864e5) + milliseconds;

                      default:
                        throw new Error("Unknown unit " + units);
                    }
                }
            }
            function duration_as__valueOf() {
                return this._milliseconds + this._days * 864e5 + this._months % 12 * 2592e6 + toInt(this._months / 12) * 31536e6;
            }
            function makeAs(alias) {
                return function() {
                    return this.as(alias);
                };
            }
            var asMilliseconds = makeAs("ms");
            var asSeconds = makeAs("s");
            var asMinutes = makeAs("m");
            var asHours = makeAs("h");
            var asDays = makeAs("d");
            var asWeeks = makeAs("w");
            var asMonths = makeAs("M");
            var asYears = makeAs("y");
            function duration_get__get(units) {
                units = normalizeUnits(units);
                return this[units + "s"]();
            }
            function makeGetter(name) {
                return function() {
                    return this._data[name];
                };
            }
            var milliseconds = makeGetter("milliseconds");
            var seconds = makeGetter("seconds");
            var minutes = makeGetter("minutes");
            var hours = makeGetter("hours");
            var days = makeGetter("days");
            var months = makeGetter("months");
            var years = makeGetter("years");
            function weeks() {
                return absFloor(this.days() / 7);
            }
            var round = Math.round;
            var thresholds = {
                s: 45,
                m: 45,
                h: 22,
                d: 26,
                M: 11
            };
            function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
                return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
            }
            function duration_humanize__relativeTime(posNegDuration, withoutSuffix, locale) {
                var duration = create__createDuration(posNegDuration).abs();
                var seconds = round(duration.as("s"));
                var minutes = round(duration.as("m"));
                var hours = round(duration.as("h"));
                var days = round(duration.as("d"));
                var months = round(duration.as("M"));
                var years = round(duration.as("y"));
                var a = seconds < thresholds.s && [ "s", seconds ] || minutes === 1 && [ "m" ] || minutes < thresholds.m && [ "mm", minutes ] || hours === 1 && [ "h" ] || hours < thresholds.h && [ "hh", hours ] || days === 1 && [ "d" ] || days < thresholds.d && [ "dd", days ] || months === 1 && [ "M" ] || months < thresholds.M && [ "MM", months ] || years === 1 && [ "y" ] || [ "yy", years ];
                a[2] = withoutSuffix;
                a[3] = +posNegDuration > 0;
                a[4] = locale;
                return substituteTimeAgo.apply(null, a);
            }
            function duration_humanize__getSetRelativeTimeThreshold(threshold, limit) {
                if (thresholds[threshold] === undefined) {
                    return false;
                }
                if (limit === undefined) {
                    return thresholds[threshold];
                }
                thresholds[threshold] = limit;
                return true;
            }
            function humanize(withSuffix) {
                var locale = this.localeData();
                var output = duration_humanize__relativeTime(this, !withSuffix, locale);
                if (withSuffix) {
                    output = locale.pastFuture(+this, output);
                }
                return locale.postformat(output);
            }
            var iso_string__abs = Math.abs;
            function iso_string__toISOString() {
                var seconds = iso_string__abs(this._milliseconds) / 1e3;
                var days = iso_string__abs(this._days);
                var months = iso_string__abs(this._months);
                var minutes, hours, years;
                minutes = absFloor(seconds / 60);
                hours = absFloor(minutes / 60);
                seconds %= 60;
                minutes %= 60;
                years = absFloor(months / 12);
                months %= 12;
                var Y = years;
                var M = months;
                var D = days;
                var h = hours;
                var m = minutes;
                var s = seconds;
                var total = this.asSeconds();
                if (!total) {
                    return "P0D";
                }
                return (total < 0 ? "-" : "") + "P" + (Y ? Y + "Y" : "") + (M ? M + "M" : "") + (D ? D + "D" : "") + (h || m || s ? "T" : "") + (h ? h + "H" : "") + (m ? m + "M" : "") + (s ? s + "S" : "");
            }
            var duration_prototype__proto = Duration.prototype;
            duration_prototype__proto.abs = duration_abs__abs;
            duration_prototype__proto.add = duration_add_subtract__add;
            duration_prototype__proto.subtract = duration_add_subtract__subtract;
            duration_prototype__proto.as = as;
            duration_prototype__proto.asMilliseconds = asMilliseconds;
            duration_prototype__proto.asSeconds = asSeconds;
            duration_prototype__proto.asMinutes = asMinutes;
            duration_prototype__proto.asHours = asHours;
            duration_prototype__proto.asDays = asDays;
            duration_prototype__proto.asWeeks = asWeeks;
            duration_prototype__proto.asMonths = asMonths;
            duration_prototype__proto.asYears = asYears;
            duration_prototype__proto.valueOf = duration_as__valueOf;
            duration_prototype__proto._bubble = bubble;
            duration_prototype__proto.get = duration_get__get;
            duration_prototype__proto.milliseconds = milliseconds;
            duration_prototype__proto.seconds = seconds;
            duration_prototype__proto.minutes = minutes;
            duration_prototype__proto.hours = hours;
            duration_prototype__proto.days = days;
            duration_prototype__proto.weeks = weeks;
            duration_prototype__proto.months = months;
            duration_prototype__proto.years = years;
            duration_prototype__proto.humanize = humanize;
            duration_prototype__proto.toISOString = iso_string__toISOString;
            duration_prototype__proto.toString = iso_string__toISOString;
            duration_prototype__proto.toJSON = iso_string__toISOString;
            duration_prototype__proto.locale = locale;
            duration_prototype__proto.localeData = localeData;
            duration_prototype__proto.toIsoString = deprecate("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)", iso_string__toISOString);
            duration_prototype__proto.lang = lang;
            addFormatToken("X", 0, 0, "unix");
            addFormatToken("x", 0, 0, "valueOf");
            addRegexToken("x", matchSigned);
            addRegexToken("X", matchTimestamp);
            addParseToken("X", function(input, array, config) {
                config._d = new Date(parseFloat(input, 10) * 1e3);
            });
            addParseToken("x", function(input, array, config) {
                config._d = new Date(toInt(input));
            });
            utils_hooks__hooks.version = "2.10.6";
            setHookCallback(local__createLocal);
            utils_hooks__hooks.fn = momentPrototype;
            utils_hooks__hooks.min = min;
            utils_hooks__hooks.max = max;
            utils_hooks__hooks.utc = create_utc__createUTC;
            utils_hooks__hooks.unix = moment__createUnix;
            utils_hooks__hooks.months = lists__listMonths;
            utils_hooks__hooks.isDate = isDate;
            utils_hooks__hooks.locale = locale_locales__getSetGlobalLocale;
            utils_hooks__hooks.invalid = valid__createInvalid;
            utils_hooks__hooks.duration = create__createDuration;
            utils_hooks__hooks.isMoment = isMoment;
            utils_hooks__hooks.weekdays = lists__listWeekdays;
            utils_hooks__hooks.parseZone = moment__createInZone;
            utils_hooks__hooks.localeData = locale_locales__getLocale;
            utils_hooks__hooks.isDuration = isDuration;
            utils_hooks__hooks.monthsShort = lists__listMonthsShort;
            utils_hooks__hooks.weekdaysMin = lists__listWeekdaysMin;
            utils_hooks__hooks.defineLocale = defineLocale;
            utils_hooks__hooks.weekdaysShort = lists__listWeekdaysShort;
            utils_hooks__hooks.normalizeUnits = normalizeUnits;
            utils_hooks__hooks.relativeTimeThreshold = duration_humanize__getSetRelativeTimeThreshold;
            var _moment = utils_hooks__hooks;
            return _moment;
        });
        __bbe["node_modules/moment/moment.js"] = module.exports;
    })();
    var numeral = __bbe["node_modules/numeral/numeral.js"];
    var moment = __bbe["node_modules/moment/moment.js"];
    window.moment = moment;
    function AnyFormatter(locale, type, style, options) {
        var language = getLanguageFromLocale(locale);
        switch (type) {
          case "number":
            {
                if (style === "custom" && "format" in options) {
                    return function(val, opt) {
                        numeral.language(language);
                        return numeral(val).format(opt.format);
                    };
                }
                if (style === "default") {
                    return function(val, opt) {
                        numeral.language(language);
                        return numeral(val).format("0,0.[0000]");
                    };
                }
                if (style === "percent") {
                    return function(val, opt) {
                        numeral.language(language);
                        return numeral(val).format("0%");
                    };
                }
                if (style === "bytes") {
                    return function(val, opt) {
                        numeral.language(language);
                        return numeral(val).format("0b");
                    };
                }
                break;
            }

          case "date":
          case "time":
            {
                if (style === "relative") {
                    if (options["noago"] === true) {
                        return function(val, opt) {
                            return moment(val).locale(language).fromNow(true);
                        };
                    }
                    if (options["noago"] === null) {
                        return function(val, opt) {
                            return moment(val).locale(language).fromNow(opt["noago"]);
                        };
                    }
                    return function(val, opt) {
                        return moment(val).locale(language).fromNow(false);
                    };
                }
                if (style === "calendar") {
                    return function(val, opt) {
                        return moment(val).locale(language).calendar();
                    };
                }
                if (style === "custom" && "format" in options) {
                    return function(val, opt) {
                        return moment(val).locale(language).format(opt.format);
                    };
                }
                return function(val, opt) {
                    return moment(val).locale(language).format(style);
                };
            }
        }
    }
    function compile(locale, msgAst) {
        if (typeof msgAst === "string") {
            return function() {
                return msgAst;
            };
        }
        if (Array.isArray(msgAst)) {
            if (msgAst.length === 0) return function() {
                return "";
            };
            var comp = new RuntimeFunctionGenerator();
            var argParams = comp.addArg(0);
            var argHash = comp.addArg(1);
            comp.addBody("return ");
            for (var i = 0; i < msgAst.length; i++) {
                if (i > 0) comp.addBody("+");
                var item = msgAst[i];
                if (typeof item === "string") {
                    comp.addBody(comp.addConstant(item));
                } else {
                    comp.addBody(comp.addConstant(compile(locale, item)) + ("(" + argParams + "," + argHash + ")"));
                }
            }
            comp.addBody(";");
            return comp.build();
        }
        switch (msgAst.type) {
          case "arg":
            return function(name) {
                return function(params) {
                    return params[name];
                };
            }(msgAst.id);

          case "hash":
            return function(params, hashArg) {
                if (hashArg === undefined) return "#";
                return hashArg;
            };

          case "format":
            var comp = new RuntimeFunctionGenerator();
            var argParams = comp.addArg(0);
            var localArg = comp.addLocal();
            comp.addBody("var " + localArg + "=" + argParams + "[" + comp.addConstant(msgAst.id) + "];");
            var type = msgAst.format.type;
            switch (type) {
              case "plural":
                {
                    var localArgOffset = comp.addLocal();
                    comp.addBody("var " + localArgOffset + "=" + localArg + "-" + msgAst.format.offset + ";");
                    var options = msgAst.format.options;
                    for (var i = 0; i < options.length; i++) {
                        var opt = options[i];
                        if (typeof opt.selector !== "number") continue;
                        var fn = comp.addConstant(compile(locale, opt.value));
                        comp.addBody("if (" + localArgOffset + "===" + opt.selector + ") return " + fn + "(" + argParams + ",''+" + localArgOffset + ");");
                    }
                    var localCase = comp.addLocal();
                    var pluralFn = comp.addConstant(getPluralRule(locale));
                    comp.addBody("var " + localCase + "=" + pluralFn + "(" + localArgOffset + "," + (msgAst.format.ordinal ? "true" : "false") + ");");
                    for (var i = 0; i < options.length; i++) {
                        var opt = options[i];
                        if (typeof opt.selector !== "string") continue;
                        if (opt.selector === "other") continue;
                        var fn = comp.addConstant(compile(locale, opt.value));
                        comp.addBody("if (" + localCase + "===" + comp.addConstant(opt.selector) + ") return " + fn + "(" + argParams + ",''+" + localArgOffset + ");");
                    }
                    for (var i = 0; i < options.length; i++) {
                        var opt = options[i];
                        if (opt.selector !== "other") continue;
                        var fn = comp.addConstant(compile(locale, opt.value));
                        comp.addBody("return " + fn + "(" + argParams + ",''+" + localArgOffset + ");");
                    }
                    break;
                }

              case "select":
                {
                    var options = msgAst.format.options;
                    for (var i = 0; i < options.length; i++) {
                        var opt = options[i];
                        if (typeof opt.selector !== "string") continue;
                        if (opt.selector === "other") continue;
                        var fn = comp.addConstant(compile(locale, opt.value));
                        comp.addBody("if (" + localArg + "===" + comp.addConstant(opt.selector) + ") return " + fn + "(" + argParams + "," + localArg + ");");
                    }
                    for (var i = 0; i < options.length; i++) {
                        var opt = options[i];
                        if (opt.selector !== "other") continue;
                        var fn = comp.addConstant(compile(locale, opt.value));
                        comp.addBody("return " + fn + "(" + argParams + "," + localArg + ");");
                    }
                    break;
                }

              case "number":
              case "date":
              case "time":
                {
                    var style = msgAst.format.style || "default";
                    var options = msgAst.format.options;
                    if (options) {
                        var opt = {};
                        var complex = false;
                        for (var i = 0; i < options.length; i++) {
                            if (typeof options[i].value === "object") {
                                complex = true;
                                opt[options[i].key] = null;
                            } else {
                                var val = options[i].value;
                                if (val === undefined) val = true;
                                opt[options[i].key] = val;
                            }
                        }
                        var formatFn = comp.addConstant(AnyFormatter(locale, type, style, opt));
                        if (complex) {
                            var optConst = comp.addConstant(opt);
                            var optLocal = comp.addLocal();
                            var hashArg = comp.addArg(1);
                            comp.addBody("var " + optLocal + "=" + optConst + ";");
                            for (var i = 0; i < options.length; i++) {
                                if (typeof options[i].value === "object") {
                                    var fnConst = comp.addConstant(compile(locale, options[i].value));
                                    comp.addBody(optLocal + "[" + comp.addConstant(options[i].key) + "]=" + fnConst + "(" + argParams + "," + hashArg + ");");
                                }
                            }
                            comp.addBody("return " + formatFn + "(" + localArg + "," + optLocal + ");");
                        } else {
                            comp.addBody("return " + formatFn + "(" + localArg + "," + comp.addConstant(opt) + ");");
                        }
                    } else {
                        var formatFn = comp.addConstant(AnyFormatter(locale, type, style, null));
                        comp.addBody("return " + formatFn + "(" + localArg + ");");
                    }
                }
            }
            return comp.build();
        }
    }
    function jsonp(url) {
        return new Promise(function(r, e) {
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.charset = "utf-8";
            script.onload = function() {
                r();
            };
            script.onerror = function(ev) {
                e("Failed to load " + url);
            };
            script.src = url;
            document.head.appendChild(script);
        });
    }
    var cfg = {};
    var loadedLocales = Object.create(null);
    var registeredTranslations = Object.create(null);
    var initWasStarted = false;
    var currentLocale = "";
    var currentTranslations = [];
    var currentCachedFormat = [];
    var stringCachedFormats = Object.create(null);
    function currentTranslationMessage(message) {
        var text = currentTranslations[message];
        if (text === undefined) {
            throw new Error("message " + message + " is not defined");
        }
        return text;
    }
    function t(message, params, translationHelp) {
        if (currentLocale.length === 0) {
            throw new Error("before using t you need to wait for initialization of g11n");
        }
        var format;
        if (typeof message === "number") {
            if (params == null) {
                return currentTranslationMessage(message);
            }
            format = currentCachedFormat[message];
            if (format === undefined) {
                var ast = parse(currentTranslationMessage(message));
                if (ast.type === "error") {
                    throw new Error("message " + message + " in " + currentLocale + " has error: " + ast.msg);
                }
                format = compile(currentLocale, ast);
                currentCachedFormat[message] = format;
            }
        } else {
            if (params == null) return message;
            format = stringCachedFormats[message];
            if (format === undefined) {
                var ast = parse(message);
                if (ast.type === "error") {
                    throw new Error('message "' + message + '" has error: ' + ast.msg + " on position: " + ast.pos);
                }
                format = compile(currentLocale, ast);
                stringCachedFormats[message] = format;
            }
        }
        return format(params);
    }
    function initGlobalization(config) {
        if (initWasStarted) {
            throw new Error("initLocalization must be called only once");
        }
        cfg = config;
        initWasStarted = true;
        var prom = Promise.resolve(null);
        prom = prom.then(function() {
            return setLocale(config.defaultLocale || "en");
        });
        setBeforeInit(function(cb) {
            prom.then(cb);
        });
        return prom;
    }
    function setLocale(locale) {
        var prom = Promise.resolve(null);
        if (currentLocale === locale) return prom;
        if (!loadedLocales[locale]) {
            loadedLocales[locale] = true;
            var pathToTranslation = cfg.pathToTranslation;
            if (pathToTranslation) {
                var p = pathToTranslation(locale);
                if (p) {
                    prom = prom.then(function() {
                        return jsonp(p);
                    });
                }
            }
        }
        prom = prom.then(function() {
            currentLocale = locale;
            currentTranslations = registeredTranslations[locale] || [];
            currentCachedFormat = [];
            currentCachedFormat.length = currentTranslations.length;
            ignoreShouldChange();
        });
        return prom;
    }
    function getLocale() {
        return currentLocale;
    }
    function registerTranslations(locale, localeDefs, msgs) {
        if (Array.isArray(localeDefs)) {
            if (localeDefs.length >= 1) setPluralRule(locale, localeDefs[0]);
        }
        if (Array.isArray(msgs)) registeredTranslations[locale] = msgs;
        loadedLocales[locale] = true;
    }
    if (window) window["bobrilRegisterTranslations"] = registerTranslations;
    var __export_hasOwnProperty;;
    var iconShine = sprite("light.png", "#80ff80");
    var iconOff = sprite("light.png", "#e03030");
    var __export_default = createComponent({
        render: function(ctx, me) {
            style(me, ctx.data.value ? iconShine : iconOff);
        },
        onClick: function(ctx) {
            ctx.data.onChange(!ctx.data.value);
            return true;
        }
    });
    var iconShine_lightSwitch2 = sprite("light.png", "#80ff80");
    var iconOff_lightSwitch2 = sprite("light.png", "#e03030");
    var __export_default_lightSwitch2 = createComponent({
        render: function(ctx, me) {
            style(me, ctx.data.value ? iconShine_lightSwitch2 : iconOff_lightSwitch2);
        },
        onClick: function(ctx) {
            ctx.data.onChange(!ctx.data.value);
            return true;
        }
    });
    var v1 = false;
    initGlobalization({});
    var counter = 0;
    setInterval(function() {
        counter++;
        __export_invalidate();
    }, 1e3);
    var mystyle = styleDef(function() {
        return [ {
            backgroundColor: "blue"
        } ];
    }, null, "mystyle");
    var page = createComponent({
        render: function(ctx, me, oldMe) {
            me.children = [ style({
                tag: "h1",
                children: "Hello World! " + counter
            }, mystyle), __export_default({
                value: v1,
                onChange: function(v) {
                    v1 = v;
                    __export_invalidate();
                }
            }), __export_default_lightSwitch2({
                value: v1,
                onChange: function(v) {
                    v1 = v;
                    __export_invalidate();
                }
            }), {
                tag: "p",
                children: [ "See examples on ", {
                    tag: "a",
                    attrs: {
                        href: "https://github.com/Bobris/Bobril"
                    },
                    children: "Bobril GitHub pages"
                }, t("! {d, date, LLLL}", {
                    d: __export_now()
                }) ]
            } ];
        }
    });
    init(function() {
        return page({});
    });
})();