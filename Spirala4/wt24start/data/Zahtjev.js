// models/Zahtjev.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Zahtjev = sequelize.define('Zahtjev', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  trazeniDatum: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  tekst_upita: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  odobren: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'Zahtjev', // Eksplicitno postavite ime tabele
  timestamps: false, // Onemogući automatsko dodavanje `createdAt` i `updatedAt`
});

module.exports = Zahtjev;