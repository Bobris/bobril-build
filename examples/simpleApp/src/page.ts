import * as b from 'node_modules/bobril/index';
import { getState } from 'node_modules/bobflux/dist/index';
import * as Button from './components/button';
import * as Textbox from './components/textbox';
import { todoAppCursor } from './state';
import { changeTodoName } from './actions/changeTodoName';
import { addTodo } from './actions/addTodo';

export let page = b.createComponent({
    render(ctx: b.IBobrilCtx, me: b.IBobrilNode, oldMe?: b.IBobrilCacheNode): void {
        let state = getState(todoAppCursor);

        me.children = [
            { tag: 'h1', children: 'TODO' },
            {
                tag: 'p',
                children: [
                    Textbox.create({
                        value: state.todoName, onChange: (newValue) => changeTodoName(newValue)
                    }),
                    Button.create({
                        title: 'ADD', onClick: () => addTodo()
                    })
                ]
            },
            state.todos.map(item => {
                return { tag: 'p', children: item };
            })
        ];
    }
});