import Router from 'koa-router';
import users from './users';

const api = new Router();

api.use('/users', users.routes());

// 라우터를 내보냅니다.
export default api;
