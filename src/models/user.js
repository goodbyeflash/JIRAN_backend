import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';

const UserSchema = new Schema({
  name: String,
  score: Number,
  hp: String,
  email: String,
  marketing: String,
  ip: String,
  publishedDate: Date,
});

UserSchema.methods.generateToken = function () {
  const token = jwt.sign(
    // 첫 번째 파라미터에는 토큰 안에 집어넣고 싶은 데이터를 넣습니다.
    {
      isRegister: true,
    },
    process.env.JWT_SECRET, // 두 번째 파라미터에는 JWT 암호를 넣습니다.
    {
      expiresIn: '7d',
    }
  );
  return token;
};

const User = mongoose.model('User', UserSchema);
export default User;
