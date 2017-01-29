import * as b from 'bobril';
import { mainPage } from './mainPage';

b.routes(
    b.route({ handler: mainPage })
);
