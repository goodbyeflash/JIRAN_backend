require('dotenv').config();
import serve from 'koa-static';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import mongoose from 'mongoose';
import https from 'https';
import fs from 'fs';
import path from 'path';

import api from './api';
import jwtMiddleware from './lib/jwtMiddleware';

// 비구조화 할당을 통해 process.env 내부 값에 대한 레퍼런스 만들기
const { PORT, MONGO_URI, NODE_ENV } = process.env;

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
  const corsWhitelist = ['http://localhost:8080'];
  if (corsWhitelist.indexOf(ctx.request.headers.origin) !== -1) {
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

// app 인스턴스에 라우터 적용
app.use(router.routes()).use(router.allowedMethods());

// // PORT가 지정되어 있지 않다면 80을 사용
const port = PORT || 80;

// if (NODE_ENV == 'production') {
//   const config = {
//     domain: 'publicdesign.co.kr',
//     https: {
//       port: port,
//       options: {
//         key: fs
//           .readFileSync(path.resolve(process.cwd(), './ssl/?.key'), 'utf8')
//           .toString(),
//         cert: fs
//           .readFileSync(path.resolve(process.cwd(), './ssl/?.pem'), 'utf8')
//           .toString(),
//         ca: fs
//           .readFileSync(path.resolve(process.cwd(), './ssl/?.pem'), 'utf8')
//           .toString(),
//       },
//     },
//   };
//   // Https 적용
//   let serverCallback = app.callback();
//   try {
//     const httpsServer = https.createServer(
//       config.https.options,
//       serverCallback,
//     );

//     httpsServer.listen(config.https.port, (err) => {
//       if (err) {
//         console.error('HTTPS server FAIL: ', err, err && err.stack);
//       } else {
//         console.log(
//           `HTTPS server OK: https://${config.domain}:${config.https.port}`,
//         );
//       }
//     });
//   } catch (ex) {
//     console.error('Failed to start HTTPS server\n', ex, ex && ex.stack);
//   }
// } else {
app.listen(port, () => {
  console.log('📋 Listening to port %d', port);
});
//}
