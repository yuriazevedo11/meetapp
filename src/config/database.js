module.exports = {
  dialect: 'postgres',
  host: process.env.localhost,
  username: process.env.postgres,
  password: process.env.docker,
  database: process.env.meetapp,
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
  },
};
