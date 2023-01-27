import Router from 'koa-router';
import * as usersCtrl from './users.ctrl';
import checkLoggedIn from '../../lib/checkLoggedIn';
import checkLoggedInAdmin from '../../lib/checkLoggedInAdmin';

const users = new Router();

users.get('/', usersCtrl.list);
users.get('/adminList', checkLoggedInAdmin, usersCtrl.adminList);
users.get('/load', usersCtrl.load);
users.post('/', checkLoggedIn, usersCtrl.register);
users.patch('/:_id', checkLoggedIn, usersCtrl.update);
users.post('/find', checkLoggedInAdmin, usersCtrl.find);
users.delete('/list', checkLoggedInAdmin, usersCtrl.removeAll);

export default users;
