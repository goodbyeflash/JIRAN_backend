import Router from 'koa-router';
import * as usersCtrl from './users.ctrl';
import checkLoggedIn from '../../lib/checkLoggedIn';

const users = new Router();

users.get('/', usersCtrl.list);
users.get('/load', usersCtrl.load);
users.post('/', checkLoggedIn, usersCtrl.register);
users.patch('/:_id', checkLoggedIn, usersCtrl.update);

export default users;
