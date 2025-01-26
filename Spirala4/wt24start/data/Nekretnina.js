// models/Nekretnina.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Nekretnina = sequelize.define('Nekretnina', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tip_nekretnine: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  naziv: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  kvadratura: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  cijena: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  tip_grijanja: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  lokacija: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  godina_izgradnje: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  datum_objave: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  opis: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'Nekretnina', // Eksplicitno postavite ime tabele
  timestamps: false, // Onemogući automatsko dodavanje `createdAt` i `updatedAt`
});

Nekretnina.prototype.getInteresovanja = async function () {
  const upiti = await this.getUpits(); // Dohvati upite
  const zahtjevi = await this.getZahtjevs(); // Dohvati zahtjeve
  const ponude = await this.getPonudas(); // Dohvati ponude

  // Kombinuj sve u jedan niz
  const interesovanja = [...upiti, ...zahtjevi, ...ponude];

  return interesovanja;
};

module.exports = Nekretnina;