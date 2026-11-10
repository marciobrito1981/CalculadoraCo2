import { APP_CONFIG } from "./config.js";

function normalizeCityName(city) {
  return String(city).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function getPositiveNumber(value) {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function validateNonNegativeNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} deve ser um número finito.`);
  }

  if (value < 0) {
    throw new RangeError(`${name} não pode ser negativo.`);
  }
}

export function getDistance(origin, destination, routes, manualDistanceKm) {
  const normalizedOrigin = normalizeCityName(origin ?? "");
  const normalizedDestination = normalizeCityName(destination ?? "");

  if (!normalizedOrigin || !normalizedDestination) {
    return {
      success: false,
      distanceKm: null,
      source: null,
      message: "Informe as cidades de origem e destino."
    };
  }

  if (normalizedOrigin === normalizedDestination) {
    return {
      success: false,
      distanceKm: null,
      source: null,
      message: "A origem e o destino devem ser diferentes."
    };
  }

  if (!Array.isArray(routes)) {
    throw new TypeError("A lista de rotas deve ser um array.");
  }

  const route = routes.find((candidate) => {
    const routeOrigin = normalizeCityName(candidate.origin ?? "");
    const routeDestination = normalizeCityName(candidate.destination ?? "");

    return (
      (routeOrigin === normalizedOrigin && routeDestination === normalizedDestination) ||
      (routeOrigin === normalizedDestination && routeDestination === normalizedOrigin)
    );
  });

  if (route) {
    if (typeof route.distanceKm !== "number" || !Number.isFinite(route.distanceKm) || route.distanceKm <= 0) {
      return {
        success: false,
        distanceKm: null,
        source: null,
        message: "A distância cadastrada para esta rota é inválida."
      };
    }

    return {
      success: true,
      distanceKm: route.distanceKm,
      source: "database",
      message: "Distância encontrada na base simulada de rotas."
    };
  }

  const manualDistance = getPositiveNumber(manualDistanceKm);

  if (manualDistance !== null) {
    return {
      success: true,
      distanceKm: manualDistance,
      source: "manual",
      message: "Distância informada manualmente."
    };
  }

  return {
    success: false,
    distanceKm: null,
    source: null,
    message: "Rota não encontrada. Informe uma distância manual maior que zero."
  };
}

export function calculateEmission(distanceKm, emissionFactor) {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new RangeError("A distância deve ser um número maior que zero.");
  }

  validateNonNegativeNumber(emissionFactor, "O fator de emissão");
  return distanceKm * emissionFactor;
}

export function calculateAllEmissions(distanceKm, emissionFactors) {
  if (
    emissionFactors === null ||
    typeof emissionFactors !== "object" ||
    Array.isArray(emissionFactors) ||
    Object.keys(emissionFactors).length === 0
  ) {
    throw new TypeError("Os fatores de emissão devem ser um objeto não vazio.");
  }

  const entries = Object.entries(emissionFactors);
  const emissions = entries.map(([transport, emissionFactor]) => ({
    transport,
    emissionFactor,
    emissionKg: calculateEmission(distanceKm, emissionFactor)
  }));
  const maximumEmissionKg = Math.max(...emissions.map(({ emissionKg }) => emissionKg));

  return Object.fromEntries(
    emissions.map(({ transport, emissionFactor, emissionKg }) => [
      transport,
      {
        distanceKm,
        emissionFactor,
        emissionKg,
        emissionTonnes: emissionKg / APP_CONFIG.kilogramsPerTonne,
        percentageOfMaximum: maximumEmissionKg === 0 ? 0 : (emissionKg / maximumEmissionKg) * 100
      }
    ])
  );
}

export function calculateCarbonCredits(emissionKg, creditPrice) {
  validateNonNegativeNumber(emissionKg, "A emissão");
  validateNonNegativeNumber(creditPrice, "O preço do crédito");

  const emissionTonnes = emissionKg / APP_CONFIG.kilogramsPerTonne;
  const creditsNeeded = emissionTonnes;

  return {
    emissionKg,
    emissionTonnes,
    creditsNeeded,
    creditPrice,
    estimatedCost: creditsNeeded * creditPrice
  };
}
