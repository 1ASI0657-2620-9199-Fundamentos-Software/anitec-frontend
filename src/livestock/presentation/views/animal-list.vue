<script setup>
import { computed, onBeforeUnmount, onMounted, ref, toRefs } from "vue";
import { useConfirm } from "primevue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import useLivestockStore from "../../application/livestock.store.js";
import useIamStore from "../../../iam/application/iam.store.js";
import { resolveMediaUrl } from "../../../shared/infrastructure/media-url.js";

const { t } = useI18n();

const router = useRouter();

const confirm = useConfirm();

const store = useLivestockStore();

const iam = useIamStore();
const { animals, loaded, errors } = toRefs(store);

const searchTerm = ref("");

const corralFilter = ref(null);

const selectedAnimals = ref([]);

const bulkStatus = ref("Vendido");

const bulkStatusOptions = ["Vendido", "Saludable", "Observacion", "En tratamiento"];

const detailVisible = ref(false);

const detailAnimal = ref(null);

const mobileQuery = window.matchMedia("(max-width: 720px)");

const isMobile = ref(mobileQuery.matches);

const updateIsMobile = (event) => {
  isMobile.value = event.matches;
};

onMounted(() => mobileQuery.addEventListener("change", updateIsMobile));

onBeforeUnmount(() =>
  mobileQuery.removeEventListener("change", updateIsMobile),
);

/**
 * Opens the technical sheet dialog with the full data of the selected animal.
 * @param {Object} animal Selected animal.
 */
const openDetail = (animal) => {
  detailAnimal.value = animal;
  detailVisible.value = true;
};

/**
 * Returns visible animals based on the current user role.
 */
const visibleAnimals = computed(() => {
  if (iam.currentRole === "rancher")
    return store.getAnimalsByOwnerId(iam.currentUserId);
  if (iam.currentRole === "veterinarian")
    return store.getAnimalsByVeterinarianId(iam.currentUserId);
  return animals.value;
});

/**
 * Corrals the current user can filter by (their own herds' corrals for ranchers).
 */
const corralFilterOptions = computed(() => {
  if (iam.currentRole === "rancher") {
    const ownHerdIds = store
      .getHerdsByOwnerId(iam.currentUserId)
      .map((herd) => Number(herd.id));
    return store.corrals.filter((corral) =>
      ownHerdIds.includes(Number(corral.herdId)),
    );
  }

  return store.corrals;
});

/**
 * Filters animals by corral and by the text entered in the search bar.
 */
const filteredAnimals = computed(() => {
  let list = visibleAnimals.value;

  if (corralFilter.value) {
    list = list.filter(
      (animal) => Number(animal.corralId) === Number(corralFilter.value),
    );
  }

  const term = searchTerm.value.trim().toLowerCase();
  if (!term) return list;

  const animalsFound = [];

  list.forEach((animal) => {
    const herdName = store.getHerdName(animal.herdId);
    const corralName = store.getCorralName(animal.corralId);

    let tag = "";
    let name = "";
    let species = "";
    let breed = "";
    let gender = "";
    let status = "";
    let weight = "";
    let birthDate = "";
    let herd = "";
    let corral = "";

    if (animal.tag) tag = String(animal.tag).toLowerCase();
    if (animal.name) name = String(animal.name).toLowerCase();
    if (animal.species) species = String(animal.species).toLowerCase();
    if (animal.breed) breed = String(animal.breed).toLowerCase();
    if (animal.gender) gender = String(animal.gender).toLowerCase();
    if (animal.status) status = String(animal.status).toLowerCase();
    if (animal.weight) weight = String(animal.weight).toLowerCase();
    if (animal.birthDate) birthDate = String(animal.birthDate).toLowerCase();
    if (herdName) herd = String(herdName).toLowerCase();
    if (corralName) corral = String(corralName).toLowerCase();

    let matches = false;

    if (tag.includes(term)) matches = true;
    if (name.includes(term)) matches = true;
    if (species.includes(term)) matches = true;
    if (breed.includes(term)) matches = true;
    if (gender.includes(term)) matches = true;
    if (status.includes(term)) matches = true;
    if (weight.includes(term)) matches = true;
    if (birthDate.includes(term)) matches = true;
    if (herd.includes(term)) matches = true;
    if (corral.includes(term)) matches = true;

    if (matches) {
      animalsFound.push(animal);
    }
  });

  return animalsFound;
});

onMounted(() => {
  if (!store.loaded) store.fetchAnimals();
  if (!store.herds.length) store.fetchHerds();
  if (!store.corrals.length) store.fetchCorrals();
});

/**
 * Shows the confirmation before deleting an animal.
 * @param {Object} animal Selected animal.
 */
const confirmDelete = (animal) => {
  confirm.require({
    message: t("animals.confirmDelete", { name: animal.name }),
    header: t("common.confirmDelete"),
    icon: "pi pi-exclamation-triangle",
    accept: () => store.deleteAnimal(animal),
  });
};

const animalSeverity = (status) => {
  if (status === "Saludable") return "success";
  if (status === "Vendido") return "info";
  return "warn";
};

/**
 * Applies the chosen status to every selected animal at once.
 */
const applyBulkStatus = () => {
  const ids = selectedAnimals.value.map((animal) => Number(animal.id));

  confirm.require({
    message: t("animals.confirmBulkStatus", {
      count: ids.length,
      status: bulkStatus.value,
    }),
    header: t("common.confirmDelete"),
    icon: "pi pi-exclamation-triangle",
    accept: async () => {
      const saved = await store.updateAnimalsStatusBulk(ids, bulkStatus.value);
      if (saved) selectedAnimals.value = [];
    },
  });
};

/**
 * Deletes every selected animal at once.
 */
const applyBulkDelete = () => {
  const ids = selectedAnimals.value.map((animal) => Number(animal.id));

  confirm.require({
    message: t("animals.confirmBulkDelete", { count: ids.length }),
    header: t("common.confirmDelete"),
    icon: "pi pi-exclamation-triangle",
    accept: async () => {
      const saved = await store.deleteAnimalsBulk(ids);
      if (saved) selectedAnimals.value = [];
    },
  });
};

const birthDateText = (birthDate) => {
  if (birthDate) {
    return birthDate;
  }

  return "Sin fecha";
};
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <span class="section-chip">Livestock BC</span>
        <h2>{{ t("animals.title") }}</h2>
      </div>
      <pv-button
        :label="t('animals.new')"
        icon="pi pi-plus"
        @click="router.push({ name: 'livestock-animal-new' })"
      />
    </div>

    <div class="animal-searchbar">
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <pv-input-text
          v-model="searchTerm"
          placeholder="Buscar por codigo, nombre, animal, raza, finca o estado"
          aria-label="Buscar animal"
        />
      </span>
      <label class="corral-filter"
        >{{ t("animals.filterByCorral") }}
        <pv-select
          v-model="corralFilter"
          :options="corralFilterOptions"
          option-label="name"
          option-value="id"
          show-clear
          :placeholder="t('animals.allCorrals')"
      /></label>
      <small
        >{{ filteredAnimals.length }} de
        {{ visibleAnimals.length }} animales</small
      >
    </div>

    <div
      v-if="iam.currentRole === 'rancher' && selectedAnimals.length"
      class="bulk-action-bar"
    >
      <span>{{
        t("animals.selectedCount", { count: selectedAnimals.length })
      }}</span>
      <pv-select v-model="bulkStatus" :options="bulkStatusOptions" />
      <pv-button
        :label="t('animals.applyBulkStatus')"
        icon="pi pi-check"
        @click="applyBulkStatus"
      />
      <pv-button
        :label="t('common.delete')"
        icon="pi pi-trash"
        severity="danger"
        @click="applyBulkDelete"
      />
      <pv-button
        :label="t('common.cancel')"
        severity="secondary"
        outlined
        @click="selectedAnimals = []"
      />
    </div>

    <pv-data-table
      v-model:selection="selectedAnimals"
      :value="filteredAnimals"
      :loading="!loaded"
      paginator
      :rows="10"
      striped-rows
      data-key="id"
      class="animal-list-table"
    >
      <pv-column
        v-if="iam.currentRole === 'rancher' && !isMobile"
        selection-mode="multiple"
        header-style="width: 3rem"
      />
      <pv-column field="name" :header="t('animals.name')" sortable>
        <template #body="slotProps">
          <div>
            <strong>{{ slotProps.data.name }}</strong>
            <div class="muted-text">{{ slotProps.data.tag }}</div>
          </div>
        </template>
      </pv-column>
      <pv-column
        v-if="!isMobile"
        field="species"
        :header="t('animals.species')"
        sortable
      />
      <pv-column v-if="!isMobile" :header="t('animals.herd')">
        <template #body="slotProps">{{
          store.getHerdName(slotProps.data.herdId)
        }}</template>
      </pv-column>
      <pv-column v-if="!isMobile" :header="t('animals.corral')">
        <template #body="slotProps">{{
          store.getCorralName(slotProps.data.corralId)
        }}</template>
      </pv-column>
      <pv-column :header="t('animals.status')">
        <template #body="slotProps">
          <pv-tag
            :value="slotProps.data.status"
            :severity="animalSeverity(slotProps.data.status)"
          />
        </template>
      </pv-column>
      <pv-column :header="t('common.actions')">
        <template #body="slotProps">
          <pv-button
            v-tooltip="t('animals.viewDetail')"
            icon="pi pi-id-card"
            rounded
            text
            @click="openDetail(slotProps.data)"
          />
          <pv-button
            icon="pi pi-pencil"
            rounded
            text
            @click="
              router.push({
                name: 'livestock-animal-edit',
                params: { id: slotProps.data.id },
              })
            "
          />
          <pv-button
            icon="pi pi-trash"
            rounded
            text
            severity="danger"
            @click="confirmDelete(slotProps.data)"
          />
        </template>
      </pv-column>
    </pv-data-table>

    <p v-if="loaded && !filteredAnimals.length" class="empty-state">
      No se encontraron animales con esa busqueda.
    </p>
    <p v-if="errors.length" class="error-text">{{ t("common.errors") }}</p>

    <pv-dialog
      v-model:visible="detailVisible"
      modal
      :header="t('animals.detailTitle')"
      :style="{ width: '32rem' }"
    >
      <div v-if="detailAnimal" class="animal-detail-sheet">
        <img
          v-if="detailAnimal.imageUrl"
          :src="resolveMediaUrl(detailAnimal.imageUrl)"
          :alt="detailAnimal.name"
          class="animal-detail-photo"
        />
        <p v-else class="muted-text">{{ t("animals.noPhoto") }}</p>

        <dl class="animal-detail-grid">
          <dt>{{ t("animals.tag") }}</dt>
          <dd>{{ detailAnimal.tag }}</dd>
          <dt>{{ t("animals.name") }}</dt>
          <dd>{{ detailAnimal.name }}</dd>
          <dt>{{ t("animals.species") }}</dt>
          <dd>{{ detailAnimal.species }}</dd>
          <dt>{{ t("animals.breed") }}</dt>
          <dd>{{ detailAnimal.breed }}</dd>
          <dt>{{ t("animals.gender") }}</dt>
          <dd>{{ detailAnimal.gender }}</dd>
          <dt>{{ t("animals.birthDate") }}</dt>
          <dd>{{ birthDateText(detailAnimal.birthDate) }}</dd>
          <dt>{{ t("animals.weight") }}</dt>
          <dd>{{ detailAnimal.weight }} kg</dd>
          <dt>{{ t("animals.status") }}</dt>
          <dd>
            <pv-tag
              :value="detailAnimal.status"
              :severity="animalSeverity(detailAnimal.status)"
            />
          </dd>
          <dt>{{ t("animals.herd") }}</dt>
          <dd>{{ store.getHerdName(detailAnimal.herdId) }}</dd>
          <dt>{{ t("animals.corral") }}</dt>
          <dd>{{ store.getCorralName(detailAnimal.corralId) }}</dd>
          <dt>{{ t("animals.source") }}</dt>
          <dd>{{ detailAnimal.source || "-" }}</dd>
          <dt>{{ t("animals.ageRange") }}</dt>
          <dd>{{ detailAnimal.ageRange || "-" }}</dd>
        </dl>
      </div>
    </pv-dialog>
  </div>
</template>
