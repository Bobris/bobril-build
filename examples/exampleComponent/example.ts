import * as b from 'bobril';
import Button from './index';

b.init(() => {
    return b.styledDiv(
        Button({ onAction: () => alert("Aaaand action") }, "Click me"),
        { padding: 10 });
});
