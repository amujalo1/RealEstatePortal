// models/Upit.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Upit = sequelize.define('Upit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tekst_upita: {
    type: DataTypes.TEXT,
    allowNull: false,
  }}, {
    tableName: 'Upit', // Eksplicitno postavite ime tabele
    timestamps: false, // Onemogući automatsko dodavanje `createdAt` i `updatedAt`
  }
);

module.exports = Upit;