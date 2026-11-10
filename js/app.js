import { routes } from "./routes.js";
import {
  APP_CONFIG,
  CARBON_CREDIT_PRICE,
  EMISSION_FACTORS,
  TRANSPORTS
} from "./config.js";
import {
  calculateAllEmissions,
  calculateCarbonCredits,
  getDistance
} from "./calculator.js";
import {
  closeAutocomplete,
  hideSection,
  renderAutocomplete,
  renderCarbonCredits,
  renderComparison,
  renderTripResult,
  resetInterface,
  setActiveAutocompleteSuggestion,
  showMessage,
  showSection
} from "./ui.js";

function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: #${id}.`);
  }

  return element;
}

function normalizeCityName(city) {
  return city.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function createCityList() {
  const cities = new Map();

  routes.forEach((route) => {
    [
      { name: route.origin, state: route.originState },
      { name: route.destination, state: route.destinationState }
    ].forEach((city) => {
      const key = normalizeCityName(city.name);
      if (!cities.has(key)) {
        cities.set(key, {
          ...city,
          label: `${city.name}, ${city.state}`
        });
      }
    });
  });

  return Array.from(cities.values());
}

function initializeApp() {
  const form = getElement("trip-form");
  const originInput = getElement("origin");
  const destinationInput = getElement("destination");
  const distanceInput = getElement("distance");
  const transportInputs = Array.from(document.querySelectorAll('[name="transport"]'));
  const cities = createCityList();
  let distanceSource = null;
  let lastRouteKey = "";

  function getRouteKey() {
    return `${normalizeCityName(originInput.value)}>${normalizeCityName(destinationInput.value)}`;
  }

  function clearFieldError(inputId, errorId) {
    getElement(inputId).removeAttribute("aria-invalid");
    getElement(errorId).textContent = "";
  }

  function setFieldError(inputId, errorId, message) {
    getElement(inputId).setAttribute("aria-invalid", "true");
    getElement(errorId).textContent = message;
  }

  function clearTransportError() {
    transportInputs.forEach((input) => input.removeAttribute("aria-invalid"));
    getElement("transport-error").textContent = "";
  }

  function hideResults() {
    ["trip-result-section", "comparison-section", "carbon-credits-section"].forEach(hideSection);
  }

  function updateDistanceSource() {
    const routeKey = getRouteKey();
    const routeChanged = routeKey !== lastRouteKey;

    if (routeChanged && distanceSource !== "database") {
      distanceInput.value = "";
      distanceSource = null;
    }

    lastRouteKey = routeKey;

    const result = getDistance(originInput.value, destinationInput.value, routes, null);

    if (result.success && result.source === "database") {
      distanceInput.value = String(result.distanceKm);
      distanceInput.readOnly = true;
      distanceSource = "database";
      getElement("distance-source").textContent = result.message;
      clearFieldError("distance", "distance-error");
      return;
    }

    if (distanceSource === "database") {
      distanceInput.value = "";
    }

    distanceInput.readOnly = false;
    distanceSource = distanceInput.value ? "manual" : null;

    if (!originInput.value.trim() || !destinationInput.value.trim()) {
      getElement("distance-source").textContent = "Aguardando a seleção das cidades.";
    } else if (result.message === "A origem e o destino devem ser diferentes.") {
      getElement("distance-source").textContent = result.message;
    } else if (distanceSource === "manual") {
      getElement("distance-source").textContent = "Rota não cadastrada; distância informada manualmente.";
    } else {
      getElement("distance-source").textContent = "Rota não encontrada na base simulada. Informe a distância manualmente.";
    }
  }

  function getSuggestions(query) {
    const normalizedQuery = normalizeCityName(query);

    if (!normalizedQuery) {
      return [];
    }

    return cities
      .filter(({ name, state, label }) => (
        normalizeCityName(name).includes(normalizedQuery) ||
        normalizeCityName(state).includes(normalizedQuery) ||
        normalizeCityName(label).includes(normalizedQuery)
      ))
      .slice(0, APP_CONFIG.validation.autocompleteSuggestionLimit);
  }

  function selectSuggestion(input, option) {
    input.value = option.dataset.value;
    closeAutocomplete(input);
    clearFieldError(input.id, `${input.id}-error`);
    clearFieldError("distance", "distance-error");
    hideResults();
    showMessage("");
    updateDistanceSource();
  }

  function connectAutocomplete(input) {
    const list = getElement(input.getAttribute("aria-controls"));

    input.addEventListener("input", () => {
      renderAutocomplete(input, getSuggestions(input.value));
      clearFieldError(input.id, `${input.id}-error`);
      clearFieldError("distance", "distance-error");
      hideResults();
      showMessage("");
      updateDistanceSource();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (list.hidden) {
          renderAutocomplete(input, getSuggestions(input.value));
        }

        const options = Array.from(list.querySelectorAll('[role="option"]'));

        if (options.length === 0) {
          return;
        }

        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const activeIndex = options.findIndex((option) => option.id === input.getAttribute("aria-activedescendant"));
        const nextIndex = activeIndex === -1
          ? (direction === 1 ? 0 : options.length - 1)
          : activeIndex + direction;
        setActiveAutocompleteSuggestion(input, nextIndex);
      } else if (event.key === "Enter") {
        const options = Array.from(list.querySelectorAll('[role="option"]'));
        const activeIndex = options.findIndex((option) => option.id === input.getAttribute("aria-activedescendant"));

        if (activeIndex >= 0) {
          event.preventDefault();
          selectSuggestion(input, options[activeIndex]);
        }
      } else if (event.key === "Escape") {
        closeAutocomplete(input);
      }
    });

    input.addEventListener("blur", () => {
      closeAutocomplete(input);
    });

    list.addEventListener("pointerdown", (event) => {
      const option = event.target.closest('[role="option"]');

      if (!option) {
        return;
      }

      event.preventDefault();
      selectSuggestion(input, option);
    });
  }

  function validateAndCalculate(event) {
    event.preventDefault();
    hideResults();
    showMessage("");

    let isValid = true;
    const origin = originInput.value.trim();
    const destination = destinationInput.value.trim();
    const selectedTransport = transportInputs.find((input) => input.checked)?.value;

    clearFieldError("origin", "origin-error");
    clearFieldError("destination", "destination-error");
    clearFieldError("distance", "distance-error");
    clearTransportError();

    if (!origin) {
      setFieldError("origin", "origin-error", "Informe a cidade de origem.");
      isValid = false;
    }

    if (!destination) {
      setFieldError("destination", "destination-error", "Informe a cidade de destino.");
      isValid = false;
    }

    if (origin && destination && normalizeCityName(origin) === normalizeCityName(destination)) {
      setFieldError("destination", "destination-error", "A origem e o destino devem ser diferentes.");
      isValid = false;
    }

    if (!selectedTransport) {
      transportInputs.forEach((input) => input.setAttribute("aria-invalid", "true"));
      getElement("transport-error").textContent = "Selecione um meio de transporte.";
      isValid = false;
    }

    let distanceResult = null;
    if (origin && destination && normalizeCityName(origin) !== normalizeCityName(destination)) {
      distanceResult = getDistance(origin, destination, routes, distanceInput.value);

      if (!distanceResult.success) {
        setFieldError("distance", "distance-error", distanceResult.message);
        isValid = false;
      } else if (
        distanceResult.source === "manual" &&
        distanceResult.distanceKm < APP_CONFIG.validation.minimumDistanceKm
      ) {
        setFieldError(
          "distance",
          "distance-error",
          `A distância deve ser de pelo menos ${APP_CONFIG.validation.minimumDistanceKm} km.`
        );
        isValid = false;
      }
    }

    if (!isValid) {
      showMessage("Revise os campos destacados antes de calcular.");
      const firstInvalidField = document.querySelector('[aria-invalid="true"]');
      firstInvalidField?.focus();
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(EMISSION_FACTORS, selectedTransport)) {
      throw new RangeError(`Fator de emissão não configurado para ${selectedTransport}.`);
    }

    const allEmissions = calculateAllEmissions(distanceResult.distanceKm, EMISSION_FACTORS);
    const selectedEmission = allEmissions[selectedTransport];
    const credits = calculateCarbonCredits(selectedEmission.emissionKg, CARBON_CREDIT_PRICE);

    renderTripResult({
      origin,
      destination,
      distanceKm: distanceResult.distanceKm,
      distanceSource: distanceResult.source,
      transport: selectedTransport,
      emissionFactor: selectedEmission.emissionFactor,
      emissionKg: selectedEmission.emissionKg,
      emissionTonnes: selectedEmission.emissionTonnes
    });
    renderComparison({
      emissions: allEmissions,
      selectedTransport
    });
    renderCarbonCredits(credits);

    showSection("trip-result-section");
    showSection("comparison-section");
    showSection("carbon-credits-section");
    getElement("trip-result-section").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  }

  connectAutocomplete(originInput);
  connectAutocomplete(destinationInput);

  distanceInput.addEventListener("input", () => {
    if (!distanceInput.readOnly) {
      distanceSource = distanceInput.value ? "manual" : null;
      getElement("distance-source").textContent = distanceSource
        ? "Distância informada manualmente."
        : "Rota não encontrada na base simulada. Informe a distância manualmente.";
    }

    clearFieldError("distance", "distance-error");
    hideResults();
    showMessage("");
  });

  transportInputs.forEach((input) => {
    input.addEventListener("change", () => {
      clearTransportError();
      hideResults();
      showMessage("");
    });
  });

  form.addEventListener("submit", validateAndCalculate);
  getElement("new-simulation").addEventListener("click", () => {
    resetInterface();
    distanceInput.readOnly = false;
    distanceSource = null;
    lastRouteKey = "";
    originInput.focus();
  });
}

initializeApp();
