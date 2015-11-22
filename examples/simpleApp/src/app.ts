import * as b from 'node_modules/bobril/index';
import { page as mainPage } from './page';
import { bootstrap } from 'node_modules/bobflux/dist/index';
import { createDefaultTodoAppState  } from './state';

bootstrap(createDefaultTodoAppState());

b.routes(
    b.route({ handler: mainPage })
);
