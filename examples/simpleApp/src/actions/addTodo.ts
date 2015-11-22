import { createAction, shallowCopy } from 'node_modules/bobflux/dist/index';
import { ITodoAppState, todoAppCursor} from '../state';

let addTodoHandler = (state: ITodoAppState): ITodoAppState => {
	if(!state.todoName || state.todoName.trim().length === 0)
		return state;

	return shallowCopy(state, copy => {
		copy.todos = [...state.todos, state.todoName];
		copy.todoName = '';
		return copy;
	})
};

export let addTodo = createAction(todoAppCursor, addTodoHandler);