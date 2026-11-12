/**
 * Classifies an HTTP error of the subscriptions flow into a key of `subscriptions.errors` in the locale files.
 *
 * The answers come from two places. The Subscriptions service answers 503 when Stripe is not configured, 502 when
 * Stripe fails and 404/400 for plans and sessions. The API gateway answers 502/503 with a JSON problem that carries
 * `service: "subscriptions"` when the service itself does not answer; that is told apart from the service's own 502/503.
 *
 * @param {import('axios').AxiosError|Error} error Error caught from an Axios request.
 * @param {"checkout"|"confirm"|"load"} context What the user was doing when it failed.
 * @returns {"serviceDown"|"unauthorized"|"notConfigured"|"providerFailed"|"planNotFound"|"sessionNotFound"|"notPaid"|"unknown"}
 */
export function classifyPaymentError(error, context = "load") {
    const response = error?.response;
    if (!response) return "serviceDown";

    const status = response.status;
    if (response.data?.service === "subscriptions") return "serviceDown";
    if (status === 401) return "unauthorized";
    if (status === 503) return "notConfigured";
    if (status === 502) return "providerFailed";
    if (status === 400 && context === "confirm") return "notPaid";
    if (status === 404 && context === "confirm") return "sessionNotFound";
    if (status === 404 && context === "checkout") return "planNotFound";
    return "unknown";
}
