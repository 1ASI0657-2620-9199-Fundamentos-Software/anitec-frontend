import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { SubscriptionsApi } from "../infrastructure/subscriptions-api.js";
import { SubscriptionPlanAssembler } from "../infrastructure/subscription-plan.assembler.js";
import { PaymentAssembler } from "../infrastructure/payment.assembler.js";
import { classifyPaymentError } from "./payment-errors.js";

const api = new SubscriptionsApi();

const sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Store that manages plans, active subscriptions, and test payments.
 */
const useSubscriptionsStore = defineStore("subscriptions", () => {
    const plans = ref([]);

    const activeSubscription = ref(null);

    const payments = ref([]);

    const lastCheckout = ref(null);

    const errors = ref([]);

    /** Key of `subscriptions.errors` for the last failure, or null when there is none. */
    const errorKind = ref(null);

    /** State of the confirmation of a payment: idle, confirming, confirmed, pending or failed. */
    const confirmation = ref("idle");

    const loaded = ref(false);

    const loading = ref(false);

    const activePlan = computed(() => {
        if (!activeSubscription.value) return null;

        let selectedPlan = null;

        plans.value.forEach((plan) => {
            if (Number(plan.id) === Number(activeSubscription.value.planId)) {
                selectedPlan = plan;
            }
        });

        return selectedPlan;
    });

    function registerError(error, context) {
        errors.value.push(error);
        errorKind.value = classifyPaymentError(error, context);
    }

    function fetchPlans() {
        loading.value = true;
        errors.value = [];
        errorKind.value = null;
        return api
            .getPlans()
            .then((response) => {
                plans.value =
                    SubscriptionPlanAssembler.toEntitiesFromResponse(response);
                loaded.value = true;
                return plans.value;
            })
            .catch((error) => registerError(error, "load"))
            .finally(() => {
                loading.value = false;
            });
    }

    function fetchActiveSubscription(userId) {
        return api
            .getActiveSubscription(userId)
            .then((response) => {
                activeSubscription.value = response.data;
                return response.data;
            })
            .catch((error) => {
                if (error.response?.status !== 404) registerError(error, "load");
                activeSubscription.value = null;
                return null;
            });
    }

    function fetchPayments(userId) {
        return api
            .getPayments(userId)
            .then((response) => {
                payments.value = PaymentAssembler.toEntitiesFromResponse(response);
                return payments.value;
            })
            .catch((error) => registerError(error, "load"));
    }

    function checkout(userId, plan) {
        loading.value = true;
        errors.value = [];
        errorKind.value = null;
        return api
            .createStripeCheckout(plan.id)
            .then((response) => {
                lastCheckout.value = response.data;
                window.location.href = response.data.checkoutUrl;
                return response.data;
            })
            .catch((error) => {
                registerError(error, "checkout");
                return null;
            })
            .finally(() => {
                loading.value = false;
            });
    }

    /**
     * Confirms a payment after Stripe sends the user back to the success page. The webhook is the main way a payment
     * is recorded; this call is the backup. Stripe can take a moment to mark the session as paid, so a "not paid yet"
     * answer is retried a few times before the page tells the user that the payment is still in progress.
     */
    async function confirmCheckout(
        sessionId,
        userId,
        { attempts = 5, delayMs = 2000 } = {},
    ) {
        loading.value = true;
        errors.value = [];
        errorKind.value = null;
        confirmation.value = "confirming";

        try {
            for (let attempt = 1; attempt <= attempts; attempt++) {
                try {
                    const response = await api.confirmStripeCheckout(sessionId);
                    lastCheckout.value = response.data;
                    activeSubscription.value = response.data.subscription;
                    payments.value = [
                        PaymentAssembler.toEntityFromResource(
                            response.data.payment,
                        ),
                        ...payments.value.filter(
                            (payment) =>
                                payment.providerPaymentId !==
                                response.data.payment.providerPaymentId,
                        ),
                    ];

                    if (userId) {
                        await fetchActiveSubscription(userId);
                        await fetchPayments(userId);
                    }

                    confirmation.value = "confirmed";
                    return response.data;
                } catch (error) {
                    const kind = classifyPaymentError(error, "confirm");
                    if (kind === "notPaid" && attempt < attempts) {
                        await sleep(delayMs);
                        continue;
                    }
                    registerError(error, "confirm");
                    confirmation.value = kind === "notPaid" ? "pending" : "failed";
                    return null;
                }
            }
            return null;
        } finally {
            loading.value = false;
        }
    }

    return {
        plans,
        activeSubscription,
        payments,
        lastCheckout,
        errors,
        errorKind,
        confirmation,
        loaded,
        loading,
        activePlan,
        fetchPlans,
        fetchActiveSubscription,
        fetchPayments,
        checkout,
        confirmCheckout,
    };
});

export default useSubscriptionsStore;
