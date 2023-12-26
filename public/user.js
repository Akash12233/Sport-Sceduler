const mongoose = require('mongoose');
mongoose.connect("mongodb://0.0.0.0:27017/sports_scheduler")
  .then(() => {
    console.log('mongoose connected');
  })
  .catch((error) => {
    console.error('mongoose connection failed:', error);
  });

const userSchema = new mongoose.Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'player'], 
  required: true, },
  sessionId: {
    type: [Number],
    default: [0],
  },
});

userSchema.statics.getUser = function (userId) {
  return this.findById(userId);
};

userSchema.statics.AddsessionIdinuser = async function (sessionId, userId) {
  const user = await this.getUser(userId);
  user.sessionId.push(sessionId);
  return user.save();
};

userSchema.statics.removeSessionId = async function (sessionId, userId) {
  const user = await this.getUser(userId);
  user.sessionId.pull(sessionId);
  return user.save();
};

const User = mongoose.model('user', userSchema);

module.exports = User;
