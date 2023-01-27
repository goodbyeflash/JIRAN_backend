require('dotenv').config();
import serve from 'koa-static';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import mongoose from 'mongoose';

import api from './api';
import jwtMiddleware from './lib/jwtMiddleware';
import jwtMiddlewareAdmin from './lib/jwtMiddlewareAdmin';

// 비구조화 할당을 통해 process.env 내부 값에 대한 레퍼런스 만들기
const { PORT, MONGO_URI } = process.env;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB!');
  })
  .catch((e) => {
    console.error(e);
  });

const app = new Koa();
const router = new Router();

app.use(serve('../frontend/build'));

// 라우터 설정
router.use('/api', api.routes()); // api 라우트 적용

app.use(async (ctx, next) => {
  const corsWhitelist = ['localhost', 'jmember.kr'];
  if (corsWhitelist.indexOf(ctx.request.headers.host) !== -1) {
    ctx.set('Access-Control-Allow-Origin', ctx.request.headers.origin);
    ctx.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Set-Cookie, Last-Page, x-api-key'
    );
    ctx.set('Access-Control-Allow-Methods', 'POST, GET, DELETE, PATCH');
    ctx.set('Access-Control-Allow-Credentials', true);
    ctx.set('Access-Control-Expose-Headers', 'Last-Page');
    if (ctx.get('x-api-key') && ctx.get('x-api-key') != process.env.API_KEY) {
      return;
    }
    await next();
  }
});

// 라우터 적용 전에 bodyParser 적용
app.use(bodyParser());
app.use(jwtMiddleware);
app.use(jwtMiddlewareAdmin);

// app 인스턴스에 라우터 적용
app.use(router.routes()).use(router.allowedMethods());

// // PORT가 지정되어 있지 않다면 80을 사용
const port = PORT || 80;

app.listen(port, () => {
  console.log('📋 Listening to port %d', port);
});
