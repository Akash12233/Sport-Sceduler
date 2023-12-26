const mongoose = require("mongoose");

mongoose.connect("mongodb://0.0.0.0:27017/sports_scheduler")
  .then(() => {
    console.log('mongoose connected');
  })
  .catch((error) => {
    console.error('mongoose connection failed:', error);
  });


const sportsSchema = new mongoose.Schema({
  sport_name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, // Assuming "User" is the name of the referenced model
});

sportsSchema.statics.createsports = function ({ sport, userId }) {
  return this.create({
    sport_name: sport,
    userId: userId,
  });
};

sportsSchema.statics.deleteSport = async function (id) {
  try {
    const result = await this.deleteOne({ _id: id });
    if (result.deletedCount === 1) {
      console.log("Deleted successfully");
    }
  } catch (err) {
    console.log(err);
  }
};

sportsSchema.statics.getSports = function () {
  return this.find();
};

sportsSchema.statics.findSportByName = async function (sportname, userId) {
  const getSport = await this.findOne({
    sport_name: sportname,
    userId: userId,
  });

  return !getSport; // Assuming you want to return true if the sport is not found
};

sportsSchema.statics.findSportById = function (id) {
  return this.findById(id);
};

sportsSchema.statics.getSportByUserId = function (userId) {
  return this.find({
    userId: userId,
  });
};

const Sports = mongoose.model("Sports", sportsSchema);

module.exports = Sports;
