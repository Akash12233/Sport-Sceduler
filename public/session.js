const mongoose = require('mongoose');

mongoose.connect("mongodb://0.0.0.0:27017/sports_scheduler")
  .then(() => {
    console.log('mongoose connected');
  })
  .catch((error) => {
    console.error('mongoose connection failed:', error);
  });


const sessionSchema = new mongoose.Schema({
  sportname: { type: String, required: true },
  time: { type: Date, required: true },
  address: { type: String, required: true },
  playername: [{ type: String }],
  noplayers: { type: Number, required: true },
  sessioncreated: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

sessionSchema.statics.addPlayer = async function (id, player) {
  const session = await this.findById(id);
  session.playername.push(player);
  console.log(session.playername);
  return session.save();
};

sessionSchema.statics.addSession = function ({
  sportname,
  dateTime,
  address,
  players,
  noplayers,
  sessioncreated,
  userId,
}) {
  return this.create({
    sportname: sportname,
    time: dateTime,
    userId: userId,
    address: address,
    playername: players,
    noplayers: noplayers,
    sessioncreated: sessioncreated,
  });
};

sessionSchema.statics.deleteSession = function (name, userId) {
  return this.deleteOne({
    sportname: name,
    userId: userId,
  });
};

sessionSchema.statics.getSessions = function ({ sportname, userId }) {
  return this.find({
    sportname: sportname,
    sessioncreated: true,
    userId: userId,
    time: {
      $gt: new Date(),
    },
  });
};

sessionSchema.statics.getAllSessions = function ({ sportname }) {
  return this.find({
    sportname: sportname,
    sessioncreated: true,
    time: {
      $gt: new Date(),
    },
  });
};

sessionSchema.statics.getAllSessionsTest = function ({ sportname }) {
  return this.find({
    sportname: sportname,
    sessioncreated: true,
  });
};

sessionSchema.statics.getPreviousSessions = function (sportname) {
  return this.find({
    sportname: sportname,
    sessioncreated: false,
    time: {
      $lt: new Date(),
    },
  });
};

sessionSchema.statics.cancelSession = function (id) {
  return this.updateOne(
    {
      userId: id,
    },
    {
      sessioncreated: false,
    }
  );
};

sessionSchema.statics.getSessionById = function (id) {
  return this.findById(id);
};

sessionSchema.statics.getPlayedSessions = function (userId) {
  return this.find({
    userId: userId,
    sessioncreated: true,
    time: {
      $lt: new Date(),
    },
  });
};

sessionSchema.statics.removePlayer = async function (playername, id) {
  const session = await this.findById(id);
  const index = session.playername.indexOf(playername);
  session.playername.splice(index, 1);
  return session.save();
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
