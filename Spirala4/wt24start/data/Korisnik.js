// models/Korisnik.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Korisnik = sequelize.define('Korisnik', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ime: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  prezime: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'korisnik', // Eksplicitno postavite ime tabele
  timestamps: false, // Onemogući automatsko dodavanje `createdAt` i `updatedAt`
});

module.exports = Korisnik;