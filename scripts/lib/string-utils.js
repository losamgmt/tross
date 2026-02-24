/**
 * Shared String Utilities for Scripts
 *
 * Case conversion and string manipulation utilities.
 * Import this instead of defining inline functions.
 *
 * @module scripts/lib/string-utils
 */

/**
 * Convert snake_case to camelCase
 * @param {string} str - Snake case string (e.g., 'work_order')
 * @returns {string} Camel case string (e.g., 'workOrder')
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 * @param {string} str - Camel case string (e.g., 'workOrder')
 * @returns {string} Snake case string (e.g., 'work_order')
 */
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * Convert snake_case to Title Case
 * @param {string} str - Snake case string (e.g., 'work_order')
 * @returns {string} Title case string (e.g., 'Work Order')
 */
function snakeToTitleCase(str) {
  return str
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Convert camelCase to Title Case
 * @param {string} str - Camel case string (e.g., 'workOrder')
 * @returns {string} Title case string (e.g., 'Work Order')
 */
function camelToTitleCase(str) {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Capitalize first letter of a string
 * @param {string} str - Input string (e.g., 'system')
 * @returns {string} Capitalized string (e.g., 'System')
 */
function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  snakeToCamel,
  camelToSnake,
  snakeToTitleCase,
  camelToTitleCase,
  capitalize,
};
