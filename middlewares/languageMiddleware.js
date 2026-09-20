const ar = require("../locales/ar");
const en = require("../locales/en");

const translations = { ar, en };

const getLanguage = (req) => {
  const header = req.headers["accept-language"];
  if (!header) return "en";
  const language = header.split(",")[0].split("-")[0].trim().toLowerCase();
  return translations[language] ? language : "en";
};

const getTranslation = (translations, key, params = {}) => {
  const keys = key.split(".");
  let value = translations;

  for (const item of keys) {
    value = value?.[item];
  }

  if (typeof value !== "string") return key;

  return value.replace(/\{\{(\w+)\}\}/g, (_, param) => params[param] ?? "");
};

const languageMiddleware = (req, res, next) => {
  const language = getLanguage(req);

  req.language = language;
  req.t = (key, params) => getTranslation(translations[language], key, params);

  next();
};

module.exports = languageMiddleware;