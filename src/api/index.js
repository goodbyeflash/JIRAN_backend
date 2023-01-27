import Router from 'koa-router';
import users from './users';
import admins from './admins';

const api = new Router();

api.use('/users', users.routes());
api.use('/admins', admins.routes());

// 라우터를 내보냅니다.
export default api;
