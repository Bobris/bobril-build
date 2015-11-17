import * as b from 'node_modules/bobril/index';
import { page as mainPage } from './page';

b.routes(
    b.route({ handler: mainPage })
);
