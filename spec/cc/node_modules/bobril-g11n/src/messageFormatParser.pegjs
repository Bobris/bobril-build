// This is not used. Rewritten by hand to shorter, faster code with better error reporting
// Inspired by https://github.com/yahoo/intl-messageformat-parser and https://github.com/SlexAxton/messageformat.js

start
    = concatPattern

concatPattern
    = items:messageElement* {
        if (items.length===0) return '';
        if (items.length===1) return items[0];
        return items;
    }

messageElement
    = text
    / argument
    / '#' { return { type: 'hash' }; }

text
    = text:(_ chars _)+ {
        var res = '';
        for (var i = 0; i < text.length; i++) {
            var inner = text[i];
            for (var j = 0; j < inner.length; j++) {
                res += inner[j];
            }
        }
        return res;
    }
    / $(ws)

identifier
    = $([a-z_]i[0-9a-z_]i*)

argument
    = '{' _ id:identifier _ format:(',' _ format)? _ '}' {
        if (format) return {
            type: 'format',
            id: id,
            format: format && format[2]
        };
        return { type: 'arg', id: id };
    }

format
    = simpleFormat
    / pluralFormat
    / selectOrdinalFormat
    / selectFormat

param
    = number
    / identifier
    / '{' res:concatPattern '}' { return res; }

option
    = ',' _ key:identifier value:(':' _ param )? {
        if (value) return { key: key, value: value[2] };
		return { key: key };
	}

simpleFormat
    = type:('number' / 'date' / 'time') _ style:(',' _ identifier _ option*)? {
        return {
            type: type,
            style: style && style[2],
			options: style && style[4]
        };
    }

pluralFormat
    = 'plural' _ ',' _ pluralStyle:pluralStyle {
        return {
            type: 'plural',
            ordinal: false,
            offset: pluralStyle.offset || 0,
            options: pluralStyle.options
        };
    }

selectOrdinalFormat
    = 'selectordinal' _ ',' _ pluralStyle:pluralStyle {
        return {
            type: 'plural',
            ordinal: true,
            offset: pluralStyle.offset || 0,
            options: pluralStyle.options
        }
    }

selectFormat
    = 'select' _ ',' _ options:optionalFormatPattern+ {
        return {
            type: 'select',
            options: options
        };
    }

selector
    = '=' num:number { return num; }
    / chars

optionalFormatPattern
    = _ selector:selector _ '{' _ pattern:concatPattern _ '}' {
        return {
            selector: selector,
            value: pattern
        };
    }

offset
    = 'offset:' _ number:number {
        return number;
    }

pluralStyle
    = offset:offset? _ options:optionalFormatPattern+ {
        return {
            offset: offset,
            options: options
        };
    }

ws 'whitespace' = [ \t\n\r]+
_ 'optionalWhitespace' = $(ws?)

digit = [0-9]
hexDigit = [0-9a-f]i

number = digits:('0' / $([1-9] digit*)) {
    return parseInt(digits, 10);
}

char
    = [^{}\\\0-\x1F\x7f \t\n\r#]
    / '\\\\' { return '\\'; }
    / '\\#' { return '#'; }
    / '\\{' { return '\u007B'; }
    / '\\}' { return '\u007D'; }
    / '\\u' digits:$(hexDigit hexDigit hexDigit hexDigit) {
        return String.fromCharCode(parseInt(digits, 16));
    }

chars = chars:char+ { return chars.join(''); }
