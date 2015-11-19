import { createAction, shallowCopy } from 'node_modules/bobflux/dist/index';
import { ITodoAppState, todoAppCursor} from '../state';

let changeTodoNameHandler = (state: ITodoAppState, todoName: string): ITodoAppState => {
	if (todoName === state.todoName)
		return state;

	return shallowCopy(state, copy=> {
		copy.todoName = todoName;
		return copy;
	})
};

export let changeTodoName = createAction<ITodoAppState, string>(todoAppCursor, changeTodoNameHandler);