import User from '../../models/user';
import Joi from '@hapi/joi';
import requsetIp from 'request-ip';
import crypto from 'crypto';

/*
  GET /api/users?page=
*/
export const list = async (ctx) => {
  // query는 문자열이기 때문에 숫자로 변환해 주어야 합니다.
  // 값이 주어지지 않았다면 1을 기본으로 사용합니다.
  const page = parseInt(ctx.query.page || '1', 10);

  if (page < 1) {
    ctx.status = 400;
    return;
  }

  try {
    const users = await User.find({}, { name: 1, score: 1 })
      .sort({ score: -1 })
      .limit(10)
      .skip((page - 1) * 10)
      .exec();
    const userCount = await User.countDocuments({}).exec();
    ctx.set('Last-Page', Math.ceil(userCount / 10));
    ctx.body = users.map((user) => user.toJSON());
  } catch (error) {
    ctx.throw(500, error);
  }
};

/*
  GET /api/users/adminList?page=
*/
export const adminList = async (ctx) => {
  // query는 문자열이기 때문에 숫자로 변환해 주어야 합니다.
  // 값이 주어지지 않았다면 1을 기본으로 사용합니다.
  const page = parseInt(ctx.query.page || '1', 10);

  if (page < 1) {
    ctx.status = 400;
    return;
  }

  try {
    const users = await User.find({})
      .sort({ publishedDate: 1 })
      .limit(10)
      .skip((page - 1) * 10)
      .exec();
    const userCount = await User.countDocuments({}).exec();
    ctx.set('Last-Page', Math.ceil(userCount / 10));
    ctx.body = users.map((user) => {
      user.hp = decrypt(user.hp);
      user.email = decrypt(user.email);
      return user;
    });
  } catch (error) {
    ctx.throw(500, error);
  }
};

/*
  GET /api/users/load
*/
export const load = async (ctx) => {
  try {
    const user = new User();
    const token = user.generateToken();
    ctx.cookies.set('access_token', token, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
      httpOnly: true,
    });
    if (!token) {
      ctx.status = 400;
    } else {
      ctx.body = token;
    }
  } catch (error) {
    ctx.throw(500, error);
  }
};

/*
  POST /api/users
  {
    "name" : "유저",
    "score" : 30,
    "hp" : "01011114444",
    "email" : "ggg@ggg.com",
    "marketing" : "동의",
    "publishedDate" : new Date()
  }
 */
export const register = async (ctx) => {
  const schema = Joi.object().keys({
    // 객체가 다음 필드를 가지고 있음을 검증
    name: Joi.string().required(), // required()가 있으면 필수 항목
    score: Joi.number().required(),
    hp: Joi.string().required(),
    email: Joi.string().required(),
    marketing: Joi.string().required(),
    publishedDate: Joi.date().required(),
  });

  // 검증하고 나서 검증 실패인 경우 에러 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400; // Bad Request
    ctx.body = result.error;
    return;
  }
  let { name, score, hp, email, marketing, publishedDate } = ctx.request.body;

  hp = encrypt(hp);
  email = encrypt(email);

  const exist = await User.findOne({
    hp: hp,
  });

  if (exist) {
    if (score > exist.score) {
      ctx.body = { exist: exist };
    } else {
      ctx.body = 'NOT UPDATE';
    }
  } else {
    let ip = requsetIp.getClientIp(ctx.request);

    if (ip.indexOf('::ffff:') > -1) {
      ip = ip.replace('::ffff:', '');
    }

    const user = new User({
      name,
      score,
      hp,
      email,
      marketing,
      ip,
      publishedDate,
    });

    try {
      await user.save();
      ctx.body = user;
    } catch (error) {
      ctx.throw(500, error);
    }
  }
};

/*
  POST /api/users/find?page=
  {
    "name" : "김"
  }
*/
export const find = async (ctx) => {
  const body = ctx.request.body || {};
  if (Object.keys(body).length > 0) {
    const key = Object.keys(body)[0];
    if (key == 'hp' || key == 'email') {
      body[key] = encrypt(body[key]);
    }
    body[key] = { $regex: '.*' + body[key] + '.*' };
  }
  const page = parseInt(ctx.query.page || '1', 10);

  if (page < 1) {
    ctx.status = 400;
    return;
  }

  try {
    const users = await User.find(body)
      .sort({ publishedDate: 1 })
      .limit(10)
      .skip((page - 1) * 10)
      .exec();
    const userCount = await User.countDocuments(body).exec();
    ctx.set('Last-Page', Math.ceil(userCount / 10));
    ctx.body = users.map((user) => {
      user.hp = decrypt(user.hp);
      user.email = decrypt(user.email);
      return user;
    });
  } catch (error) {
    ctx.throw(500, error);
  }
};

/*
  PATCH /api/users/:_id
  {
    "name" : "",
    "score" : "",
    "publishedDate" : "",
  }
*/
export const update = async (ctx) => {
  // write에서 사용한 schema와 비슷한데, required()가 없습니다.
  const schema = Joi.object().keys({
    name: Joi.string(),
    score: Joi.number(),
    hp: Joi.string(),
    email: Joi.string(),
    marketing: Joi.string(),
    publishedDate: Joi.date(),
  });

  // 검증하고 나서 검증 실패인 경우 에러 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400; // Bad Request
    ctx.body = result.error;
    return;
  }

  const { _id } = ctx.params;

  try {
    let nextData = { ...ctx.request.body }; // 객체를 복사하고 body 값이 주어졌으면 HTML 필터링
    nextData.hp = encrypt(nextData.hp);
    nextData.email = encrypt(nextData.email);

    const updateUser = await User.findByIdAndUpdate(_id, nextData, {
      new: true, // 이 값을 설정하면 업데이트된 데이터를 반환합니다.
      // false일 때는 업데이트되기 전의 데이터를 반환합니다.
    }).exec();
    if (!updateUser) {
      ctx.status = 404;
      return;
    }
    ctx.body = updateUser;
  } catch (error) {
    ctx.throw(500, error);
  }
};

/*
  DELETE /api/users/:_id
*/
export const remove = async (ctx) => {
  const { _id } = ctx.params;
  try {
    await User.findByIdAndRemove(_id).exec();
    ctx.status = 204; // No Content (성공하기는 했지만 응답할 데이터는 없음)
  } catch (error) {
    ctx.throw(500, error);
  }
};

/*
  DELETE /api/users/
*/
export const removeAll = async (ctx) => {
  const { _id } = ctx.params;
  try {
    await User.remove().exec();
    ctx.status = 204; // No Content (성공하기는 했지만 응답할 데이터는 없음)
  } catch (error) {
    ctx.throw(500, error);
  }
};

// 암호화
function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = process.env.ENCRYPTION_KEY;

  const secretKeyToByteArray = Buffer.from(key, 'utf-8');
  const ivParameter = Buffer.from(key.slice(0, 16));

  var cipher = crypto.createCipheriv(
    algorithm,
    secretKeyToByteArray,
    ivParameter
  );
  var crypted = cipher.update(text, 'utf8', 'base64');
  crypted += cipher.final('base64');

  return crypted;
}

// 복호화
function decrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = process.env.ENCRYPTION_KEY;

  const secretKeyToByteArray = Buffer.from(key, 'utf-8');
  const ivParameter = Buffer.from(key.slice(0, 16));

  var cipher = crypto.createDecipheriv(
    algorithm,
    secretKeyToByteArray,
    ivParameter
  );
  var crypted = cipher.update(text, 'base64', 'utf8');
  crypted += cipher.final('utf8');

  return crypted;
}
