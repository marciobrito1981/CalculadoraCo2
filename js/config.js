export const APP_CONFIG = Object.freeze({
  name: "Calculadora de Emissão de Carbono",
  distanceUnit: "km",
  emissionUnit: "kg CO₂e",
  kilogramsPerTonne: 1000,
  validation: Object.freeze({
    minimumDistanceKm: 0.01,
    autocompleteSuggestionLimit: 8
  }),
  precision: Object.freeze({
    distance: 1,
    emissionKg: 3,
    emissionTonnes: 6,
    emissionPercentage: 1,
    emissionFactor: 3,
    carbonCredits: 6
  })
});

export const EMISSION_FACTORS = Object.freeze({
  bicycle: 0,
  car: 0.192,
  bus: 0.089,
  truck: 0.75
});

export const CARBON_CREDIT_PRICE = 50;

export const TRANSPORTS = Object.freeze({
  bicycle: Object.freeze({ name: "Bicicleta", icon: "🚲" }),
  car: Object.freeze({ name: "Carro", icon: "🚗" }),
  bus: Object.freeze({ name: "Ônibus", icon: "🚌" }),
  truck: Object.freeze({ name: "Caminhão", icon: "🚚" })
});
