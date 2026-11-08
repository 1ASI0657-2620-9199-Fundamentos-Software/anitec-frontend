<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import useIamStore from "../../../iam/application/iam.store.js";
import useSubscriptionsStore from "../../application/subscriptions.store.js";

const { t } = useI18n();

const route = useRoute();

const router = useRouter();

const iam = useIamStore();

const subscriptions = useSubscriptionsStore();

const sessionId = computed(() => route.query.session_id || "");

/** What the page shows: missing, confirming, confirmed, pending (Stripe has not completed it) or failed. */
const state = computed(() => {
  if (!sessionId.value) return "missing";
  if (subscriptions.confirmation === "idle") return "confirming";
  return subscriptions.confirmation;
});

const icon = computed(
  () =>
    ({
      confirmed: "pi pi-check-circle",
      confirming: "pi pi-spin pi-spinner",
      pending: "pi pi-clock",
      failed: "pi pi-exclamation-triangle",
      missing: "pi pi-question-circle",
    })[state.value],
);

const title = computed(() => {
  if (state.value === "confirmed") return t("subscriptions.successTitle");
  if (state.value === "pending") return t("subscriptions.pendingTitle");
  if (state.value === "failed") return t("subscriptions.failedTitle");
  if (state.value === "missing") return t("subscriptions.missingSession");
  return t("subscriptions.confirmingPayment");
});

const subtitle = computed(() => {
  if (state.value === "confirmed") return t("subscriptions.successSubtitle");
  if (state.value === "pending") return t("subscriptions.pendingSubtitle");
  if (state.value === "failed") return t("subscriptions.failedSubtitle");
  return "";
});

/** Plan and amount of the payment that was just registered. */
const confirmedDetail = computed(() => {
  const checkout = subscriptions.lastCheckout;
  if (!checkout?.subscription || !checkout?.payment) return "";
  const plan = subscriptions.plans.find(
    (item) => Number(item.id) === Number(checkout.subscription.planId),
  );
  return t("subscriptions.confirmedDetail", {
    plan: plan ? plan.name : `#${checkout.subscription.planId}`,
    amount: Number(checkout.payment.amount).toFixed(2),
  });
});

/** Trying again only helps when the problem can go away by itself. */
const canRetry = computed(
  () =>
    state.value === "pending" ||
    (state.value === "failed" &&
      !["sessionNotFound", "unauthorized", "notConfigured"].includes(
        subscriptions.errorKind,
      )),
);

const confirm = async () => {
  if (!sessionId.value) return;
  const result = await subscriptions.confirmCheckout(
    sessionId.value,
    iam.currentUserId,
  );
  if (result) await subscriptions.fetchPlans();
};

onMounted(confirm);
</script>

<template>
  <section class="panel payment-result-panel">
    <div class="form-hero">
      <i :class="icon"></i>
      <div>
        <span class="section-chip">Stripe Checkout</span>
        <h2 data-test="payment-title">{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <p v-if="state === 'confirming'" class="empty-state">
      {{ t("subscriptions.confirmingPayment") }}
    </p>
    <p v-else-if="state === 'confirmed'" class="empty-state">
      {{ t("subscriptions.confirmedPayment") }}
      <strong v-if="confirmedDetail"> {{ confirmedDetail }}</strong>
    </p>
    <p
      v-else-if="state === 'pending'"
      class="empty-state"
      data-test="payment-message"
    >
      {{ t("subscriptions.pendingMessage") }}
    </p>
    <p
      v-else-if="state === 'failed'"
      class="error-text"
      role="alert"
      data-test="payment-message"
    >
      {{ t(`subscriptions.errors.${subscriptions.errorKind || "unknown"}`) }}
    </p>

    <div class="form-actions friendly-actions">
      <pv-button
        v-if="canRetry"
        :label="t('subscriptions.retry')"
        icon="pi pi-refresh"
        :disabled="subscriptions.loading"
        @click="confirm"
      />
      <pv-button
        :label="t('subscriptions.backToPlans')"
        icon="pi pi-credit-card"
        :severity="state === 'confirmed' ? undefined : 'secondary'"
        @click="router.push({ name: 'subscription-plans' })"
      />
    </div>
  </section>
</template>
