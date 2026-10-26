<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import useIamStore from "../../../iam/application/iam.store.js";

const { t, locale } = useI18n();

const iam = useIamStore();

onMounted(() => {
  iam.fetchRancherRequests();
});

const requests = computed(() => iam.rancherRequests);

/**
 * Maps a request status to the tag color.
 * @param {string} status Request status.
 * @returns {string}
 */
const severityByStatus = (status) => {
  if (status === "Accepted") return "success";
  if (status === "Pending") return "warn";
  if (status === "Rejected") return "danger";
  return "secondary";
};

/**
 * Formats a date using the active language.
 * @param {string} value ISO date.
 * @returns {string}
 */
const formatDate = (value) => {
  if (!value) return "";

  const tag = locale.value === "es" ? "es-PE" : "en-US";
  return new Date(value).toLocaleDateString(tag);
};

const statusLabel = (status) => t(`requests.status.${status}`);

const approve = (request) => iam.approveVeterinarianRequest(request.veterinarianId);

const reject = (request) => iam.rejectVeterinarianRequest(request.veterinarianId);
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <span class="section-chip">{{ t("requests.chip") }}</span>
        <h2>{{ t("requests.title") }}</h2>
        <p>{{ t("requests.subtitle") }}</p>
      </div>
    </div>

    <div class="assigned-client-grid">
      <article
        v-for="request in requests"
        :key="request.id"
        class="assigned-client-card"
      >
        <header>
          <div>
            <span>{{ t("requests.veterinarian") }}</span>
            <h3>{{ request.veterinarianName }}</h3>
          </div>
          <pv-tag
            :value="statusLabel(request.status)"
            :severity="severityByStatus(request.status)"
          />
        </header>

        <dl>
          <div>
            <dt>{{ t("requests.requestedOn", { date: formatDate(request.requestedAt) }) }}</dt>
          </div>
          <div v-if="request.acceptedAt">
            <dt>{{ t("requests.acceptedOn", { date: formatDate(request.acceptedAt) }) }}</dt>
          </div>
        </dl>

        <footer>
          <template v-if="request.status === 'Pending'">
            <pv-button
              :label="t('requests.approve')"
              icon="pi pi-check"
              @click="approve(request)"
            />
            <pv-button
              :label="t('requests.reject')"
              icon="pi pi-times"
              severity="danger"
              outlined
              @click="reject(request)"
            />
          </template>
          <pv-button
            v-else-if="request.status === 'Accepted'"
            :label="t('requests.revoke')"
            icon="pi pi-ban"
            severity="danger"
            outlined
            @click="reject(request)"
          />
        </footer>
      </article>
    </div>

    <p v-if="!requests.length" class="empty-state">
      {{ t("requests.empty") }}
    </p>
  </section>
</template>
