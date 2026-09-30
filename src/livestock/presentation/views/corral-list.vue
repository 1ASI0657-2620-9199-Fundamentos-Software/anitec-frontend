<script setup>
import { computed, onMounted, toRefs } from "vue";
import { useConfirm } from "primevue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import useLivestockStore from "../../application/livestock.store.js";
import useIamStore from "../../../iam/application/iam.store.js";

const { t } = useI18n();

const router = useRouter();

const confirm = useConfirm();

const store = useLivestockStore();

const iam = useIamStore();
const { corrals, errors } = toRefs(store);

/**
 * Returns the corrals that the current user should see.
 */
const userCorrals = computed(() => {
  if (iam.currentRole === "rancher") {
    const ownHerdIds = store
      .getHerdsByOwnerId(iam.currentUserId)
      .map((herd) => Number(herd.id));
    return corrals.value.filter((corral) =>
      ownHerdIds.includes(Number(corral.herdId)),
    );
  }

  return corrals.value;
});

onMounted(() => {
  if (!store.herds.length) store.fetchHerds();
  if (!store.corrals.length) store.fetchCorrals();
  if (!store.loaded) store.fetchAnimals();
});

/**
 * Shows the confirmation before deleting a corral.
 * @param {Object} corral Selected corral.
 */
const confirmDelete = (corral) => {
  confirm.require({
    message: t("corrals.confirmDelete", { name: corral.name }),
    header: t("common.confirmDelete"),
    icon: "pi pi-exclamation-triangle",
    accept: () => store.deleteCorral(corral),
  });
};
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <span class="section-chip">Livestock BC</span>
        <h2>{{ t("corrals.title") }}</h2>
        <p>{{ t("corrals.subtitle") }}</p>
      </div>
      <pv-button
        :label="t('corrals.new')"
        icon="pi pi-plus"
        @click="router.push({ name: 'livestock-corral-new' })"
      />
    </div>

    <div class="record-card-grid">
      <article
        v-for="corral in userCorrals"
        :key="corral.id"
        class="record-card"
      >
        <header>
          <div>
            <span>{{ store.getHerdName(corral.herdId) }}</span>
            <h3>{{ corral.name }}</h3>
          </div>
          <strong
            >{{ store.getAnimalCountByCorral(corral.id) }} animales</strong
          >
        </header>

        <dl>
          <div>
            <dt>{{ t("corrals.herd") }}</dt>
            <dd>{{ store.getHerdName(corral.herdId) }}</dd>
          </div>
          <div>
            <dt>{{ t("corrals.animalCount") }}</dt>
            <dd>{{ store.getAnimalCountByCorral(corral.id) }}</dd>
          </div>
        </dl>

        <footer>
          <pv-button
            :label="t('common.edit')"
            icon="pi pi-pencil"
            outlined
            @click="
              router.push({
                name: 'livestock-corral-edit',
                params: { id: corral.id },
              })
            "
          />
          <pv-button
            :label="t('common.delete')"
            icon="pi pi-trash"
            severity="danger"
            text
            @click="confirmDelete(corral)"
          />
        </footer>
      </article>
    </div>

    <p v-if="!userCorrals.length" class="empty-state">
      {{ t("corrals.empty") }}
    </p>
    <p v-if="errors.length" class="error-text">{{ t("common.errors") }}</p>
  </section>
</template>
