import { APP_CONFIG, TRANSPORTS } from "./config.js";

const numberFormatters = new Map();
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: #${id}.`);
  }

  return element;
}

function getListForInput(input) {
  const listId = input.getAttribute("aria-controls");

  if (!listId) {
    throw new Error("O campo de autocompletar não informa sua lista de sugestões.");
  }

  return getElement(listId);
}

function formatNumber(value, maximumFractionDigits) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError("Não é possível exibir um valor numérico inválido.");
  }

  if (!numberFormatters.has(maximumFractionDigits)) {
    numberFormatters.set(
      maximumFractionDigits,
      new Intl.NumberFormat("pt-BR", { maximumFractionDigits })
    );
  }

  return numberFormatters.get(maximumFractionDigits).format(value);
}

function normalizeText(value) {
  return String(value).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function renderAutocomplete(input, suggestions) {
  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError("O autocompletar precisa receber um campo de texto.");
  }

  if (!Array.isArray(suggestions)) {
    throw new TypeError("As sugestões de autocompletar devem ser um array.");
  }

  const list = getListForInput(input);
  const seenCities = new Set();
  const options = suggestions
    .map((suggestion) => {
      if (typeof suggestion === "string") {
        return { name: suggestion, state: "", label: suggestion };
      }

      if (!suggestion || typeof suggestion.name !== "string") {
        throw new TypeError("Cada sugestão deve ser um nome de cidade ou um objeto com name.");
      }

      return {
        name: suggestion.name,
        state: typeof suggestion.state === "string" ? suggestion.state : "",
        label: typeof suggestion.label === "string"
          ? suggestion.label
          : [suggestion.name, suggestion.state].filter(Boolean).join(", ")
      };
    })
    .filter(({ name }) => {
      const key = normalizeText(name);

      if (!key || seenCities.has(key)) {
        return false;
      }

      seenCities.add(key);
      return true;
    })
    .slice(0, APP_CONFIG.validation.autocompleteSuggestionLimit);

  list.replaceChildren();

  options.forEach(({ name, label }, index) => {
    const option = document.createElement("li");
    option.className = "autocomplete__suggestion";
    option.id = `${input.id}-option-${index}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.dataset.value = name;
    option.textContent = label;
    list.append(option);
  });

  const hasOptions = options.length > 0;
  list.hidden = !hasOptions;
  input.setAttribute("aria-expanded", String(hasOptions));
  input.removeAttribute("aria-activedescendant");
}

export function closeAutocomplete(input) {
  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError("O autocompletar precisa receber um campo de texto.");
  }

  const list = getListForInput(input);
  list.hidden = true;
  list.querySelectorAll('[role="option"]').forEach((option) => {
    option.setAttribute("aria-selected", "false");
  });
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

export function setActiveAutocompleteSuggestion(input, index) {
  if (!(input instanceof HTMLInputElement) || !Number.isInteger(index)) {
    throw new TypeError("Informe um campo de texto e o índice inteiro da sugestão.");
  }

  const list = getListForInput(input);
  const options = Array.from(list.querySelectorAll('[role="option"]'));

  if (options.length === 0) {
    return -1;
  }

  const activeIndex = ((index % options.length) + options.length) % options.length;

  options.forEach((option, optionIndex) => {
    option.setAttribute("aria-selected", String(optionIndex === activeIndex));
  });
  input.setAttribute("aria-activedescendant", options[activeIndex].id);
  options[activeIndex].scrollIntoView({ block: "nearest" });

  return activeIndex;
}

export function renderTripResult(result) {
  const transport = TRANSPORTS[result.transport];

  if (!transport) {
    throw new RangeError(`Meio de transporte desconhecido: ${result.transport}.`);
  }

  const sourceLabels = {
    database: "Base simulada de rotas",
    manual: "Informada manualmente"
  };
  const distanceSource = sourceLabels[result.distanceSource];

  if (!distanceSource) {
    throw new RangeError(`Origem da distância desconhecida: ${result.distanceSource}.`);
  }

  getElement("result-origin").textContent = result.origin;
  getElement("result-destination").textContent = result.destination;
  getElement("result-distance").textContent = `${formatNumber(result.distanceKm, Math.max(2, APP_CONFIG.precision.distance))} ${APP_CONFIG.distanceUnit}`;
  getElement("result-distance-source").textContent = distanceSource;
  getElement("result-transport").textContent = `${transport.icon} ${transport.name}`;
  getElement("result-factor").textContent = `${formatNumber(result.emissionFactor, APP_CONFIG.precision.emissionFactor)} kg CO₂e/km`;
  getElement("result-emission-kg").textContent = `${formatNumber(result.emissionKg, APP_CONFIG.precision.emissionKg)} ${APP_CONFIG.emissionUnit}`;
  getElement("result-emission-tonnes").textContent =
    `${formatNumber(result.emissionTonnes, APP_CONFIG.precision.emissionTonnes)} t CO₂e`;
}

export function renderComparison(comparison) {
  if (!comparison || !comparison.emissions || typeof comparison.emissions !== "object") {
    throw new TypeError("A comparação precisa conter os resultados de emissão.");
  }

  const entries = Object.entries(comparison.emissions);
  if (entries.length === 0) {
    throw new TypeError("A comparação não contém meios de transporte.");
  }

  const values = entries.map(([, result]) => result.emissionKg);
  const lowestEmission = Math.min(...values);
  const highestEmission = Math.max(...values);

  entries.forEach(([transportKey, result]) => {
    const transport = TRANSPORTS[transportKey];

    if (!transport) {
      throw new RangeError(`Meio de transporte desconhecido: ${transportKey}.`);
    }

    const item = document.querySelector(`.comparison-item[data-transport="${transportKey}"]`);

    if (!item) {
      throw new Error(`Card de comparação não encontrado para ${transportKey}.`);
    }

    const selected = transportKey === comparison.selectedTransport;
    const lowest = result.emissionKg === lowestEmission;
    const highest = result.emissionKg === highestEmission;
    const badge = item.querySelector(".comparison-item__badge");
    const bar = getElement(`bar-${transportKey}`);

    item.classList.toggle("comparison-item--selected", selected);
    item.classList.toggle("comparison-item--lowest", lowest);
    item.classList.toggle("comparison-item--highest", highest);
    badge.hidden = !selected;
    getElement(`comparison-${transportKey}`).textContent =
      `${formatNumber(result.emissionKg, APP_CONFIG.precision.emissionKg)} ${APP_CONFIG.emissionUnit}`;
    bar.style.width = `${Math.min(100, Math.max(0, result.percentageOfMaximum))}%`;
    item.querySelector(".comparison-item__track").setAttribute(
      "aria-label",
      `${transport.name}: ${formatNumber(result.percentageOfMaximum, APP_CONFIG.precision.emissionPercentage)}% da emissão do meio mais poluente`
    );

    const distinctions = [];
    if (lowest) {
      distinctions.push("Menor emissão");
    }
    if (highest) {
      distinctions.push("Maior emissão");
    }
    if (selected) {
      distinctions.push("Meio selecionado");
    }

    const summary = [
      `${formatNumber(result.distanceKm, Math.max(2, APP_CONFIG.precision.distance))} ${APP_CONFIG.distanceUnit}`,
      `${formatNumber(result.emissionFactor, APP_CONFIG.precision.emissionFactor)} kg CO₂e/km`,
      `${formatNumber(result.emissionTonnes, APP_CONFIG.precision.emissionTonnes)} t CO₂e`,
      `${formatNumber(result.percentageOfMaximum, APP_CONFIG.precision.emissionPercentage)}% do maior`,
      ...distinctions
    ];
    getElement(`summary-${transportKey}`).textContent = summary.join(" · ");
  });
}

export function renderCarbonCredits(credits) {
  getElement("credits-emission").textContent =
    `${formatNumber(credits.emissionKg, APP_CONFIG.precision.emissionKg)} ${APP_CONFIG.emissionUnit}`;
  getElement("credits-quantity").textContent =
    `${formatNumber(credits.creditsNeeded, APP_CONFIG.precision.carbonCredits)} créditos`;
  getElement("credits-unit-price").textContent = currencyFormatter.format(credits.creditPrice);
  getElement("credits-total").textContent = currencyFormatter.format(credits.estimatedCost);
}

export function showSection(sectionId) {
  getElement(sectionId).hidden = false;
}

export function hideSection(sectionId) {
  getElement(sectionId).hidden = true;
}

export function showMessage(message, type = "error") {
  const messageElement = getElement("form-message");
  messageElement.textContent = message;

  if (message) {
    messageElement.dataset.type = type;
  } else {
    messageElement.removeAttribute("data-type");
  }
}

export function resetInterface() {
  const form = getElement("trip-form");
  form.reset();

  ["origin", "destination"].forEach((inputId) => {
    const input = getElement(inputId);
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-activedescendant");
    input.setAttribute("aria-expanded", "false");

    const list = getListForInput(input);
    list.replaceChildren();
    list.hidden = true;
  });

  getElement("distance").removeAttribute("aria-invalid");

  ["origin-error", "destination-error", "distance-error", "transport-error"].forEach((id) => {
    getElement(id).textContent = "";
  });

  document.querySelectorAll('[name="transport"]').forEach((input) => {
    input.removeAttribute("aria-invalid");
  });

  getElement("distance-source").textContent = "Aguardando a seleção das cidades.";
  showMessage("");

  [
    "trip-result-section",
    "comparison-section",
    "carbon-credits-section"
  ].forEach(hideSection);

  ["result-origin", "result-destination", "result-distance", "result-distance-source", "result-transport",
    "result-factor", "result-emission-kg", "result-emission-tonnes", "credits-emission", "credits-quantity",
    "credits-unit-price", "credits-total"].forEach((id) => {
    getElement(id).textContent = "";
  });

  document.querySelectorAll(".comparison-item").forEach((item) => {
    item.classList.remove("comparison-item--selected", "comparison-item--lowest", "comparison-item--highest");
    item.querySelector(".comparison-item__badge").hidden = true;
    item.querySelector(".comparison-item__track").removeAttribute("aria-label");
  });

  ["bicycle", "car", "bus", "truck"].forEach((transport) => {
    getElement(`comparison-${transport}`).textContent = "";
    getElement(`bar-${transport}`).style.width = "";
    getElement(`summary-${transport}`).textContent = "";
  });
}
