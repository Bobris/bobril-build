import { IState, ICursor } from 'node_modules/bobflux/dist/index';

export interface ITodoAppState extends IState {
	todos: string[];
	todoName: string;
}

export let todoAppCursor: ICursor<ITodoAppState> = {
	key: ''
};

export let createDefaultTodoAppState = (): ITodoAppState => {
	return {
		todos: [],
		todoName: ''
	};
};