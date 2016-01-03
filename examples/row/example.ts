import * as b from 'bobril';
import core from 'bobrilstrap-core';
import row from './index';

b.init(() => [
    core({}),
    row({}, 'First row'),
    row({}, 'Second row'),
]);
