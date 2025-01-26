// models/Ponuda.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Ponuda = sequelize.define('Ponuda', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tekst_upita: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  cijenaPonude: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  datumPonude: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  odbijenaPonuda: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'Ponuda', // Eksplicitno postavite ime tabele
  timestamps: false, // Onemogući automatsko dodavanje `createdAt` i `updatedAt`
});

module.exports = Ponuda;