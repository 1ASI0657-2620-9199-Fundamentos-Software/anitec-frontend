<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import useIamStore from "../../../iam/application/iam.store.js";
import useLivestockStore from "../../../livestock/application/livestock.store.js";

const { t } = useI18n();

const router = useRouter();

const iam = useIamStore();

const livestock = useLivestockStore();

const search = ref("");

const availableRanchers = ref([]);

/** Message shown after sending an access request. */
const requestNotice = ref("");

onMounted(async () => {
  await iam.fetchVeterinarianClients();
  availableRanchers.value = await iam.fetchAvailableRanchers();
  if (!livestock.herds.length) await livestock.fetchHerds();
  if (!livestock.loaded) await livestock.fetchAnimals();
});

/**
 * Gets all available users with the rancher role.
 */
const ranchers = computed(() => {
  const rancherUsers = [];

  availableRanchers.value.forEach((user) => {
    if (user.role === "rancher") {
      rancherUsers.push(user);
    }
  });

  return rancherUsers;
});

/**
 * Filters ranchers by name. The farms of a rancher are not visible until the rancher accepts the invitation.
 */
const filteredRanchers = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return ranchers.value;

  return ranchers.value.filter((rancher) =>
    rancher.fullName.toLowerCase().includes(term),
  );
});

/**
 * Generates initials to show a simple avatar.
 * @param {string} name Full name.
 * @returns {string}
 */
const initials = (name) => {
  const parts = name.split(" ");
  let result = "";
  let usedParts = 0;

  parts.forEach((part) => {
    if (part && usedParts < 2) {
      result = result + part[0];
      usedParts++;
    }
  });

  return result.toUpperCase();
};

const isAssignedToCurrentVet = (rancher) =>
  Number(rancher.veterinarianId) === Number(iam.currentUserId);

const herdCountByRancher = (rancher) => rancher.herdCount ?? 0;

const animalCountByRancher = (rancher) => rancher.animalCount ?? 0;

/**
 * Invites a rancher to become a client. The rancher must accept the invitation.
 * @param {Object} rancher Selected rancher.
 */
const sendRequest = async (rancher) => {
  const assigned = await iam.assignRancherToVeterinarian(rancher.id);

  if (assigned) {
    requestNotice.value = t("requests.sent", { name: rancher.fullName });
    availableRanchers.value = await iam.fetchAvailableRanchers();
  }
};
</script>

<template>
  <section class="panel client-discovery-panel">
    <div class="panel-header">
      <div>
        <span class="section-chip">{{ t("veterinary.rancherClients") }}</span>
        <h2>{{ t("veterinary.addClientTitle") }}</h2>
        <p>{{ t("veterinary.addClientSubtitle") }}</p>
      </div>
      <pv-button
        :label="t('veterinary.backToClients')"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="router.push('/veterinary/clients')"
      />
    </div>

    <p v-if="requestNotice" class="empty-state" role="status">
      {{ requestNotice }}
      <router-link to="/veterinary/clients">{{ t("requests.viewSent") }}</router-link>
    </p>

    <div class="client-discovery-toolbar">
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <pv-input-text
          v-model="search"
          :placeholder="t('veterinary.searchRancherPlaceholder')"
        />
      </span>
      <small>{{ t("veterinary.ranchersFound", { count: filteredRanchers.length }) }}</small>
    </div>

    <div class="client-discovery-grid">
      <article
        v-for="rancher in filteredRanchers"
        :key="rancher.id"
        class="client-discovery-card"
      >
        <div class="client-profile">
          <div class="client-avatar" aria-hidden="true">
            {{ initials(rancher.fullName) }}
          </div>
          <div>
            <h3>{{ rancher.fullName }}</h3>
            <span
              >{{ herdCountByRancher(rancher) }} {{ t("veterinary.farms").toLowerCase() }} -
              {{ animalCountByRancher(rancher) }} {{ t("veterinary.animals").toLowerCase() }}</span
            >
          </div>
        </div>

        <footer>
          <pv-tag
            v-if="isAssignedToCurrentVet(rancher)"
            :value="t('veterinary.clientAdded')"
            severity="success"
          />
          <pv-button
            v-else
            :label="t('requests.invite')"
            icon="pi pi-send"
            @click="sendRequest(rancher)"
          />
        </footer>
      </article>
    </div>

    <p v-if="!filteredRanchers.length" class="empty-state">
      {{ t("veterinary.noRanchersFound") }}
    </p>
  </section>
</template>
