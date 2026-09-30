<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { Corral } from "../../domain/model/corral.entity.js";
import useLivestockStore from "../../application/livestock.store.js";
import useIamStore from "../../../iam/application/iam.store.js";

const { t } = useI18n();

const route = useRoute();

const router = useRouter();

const store = useLivestockStore();

const iam = useIamStore();

const isEdit = computed(() => {
  if (route.params.id) {
    return true;
  }

  return false;
});

const form = ref({
  name: "",
  herdId: null,
});

const herdOptions = computed(() => {
  if (iam.currentRole === "rancher") {
    return store.getHerdsByOwnerId(iam.currentUserId);
  }

  return store.herds;
});

onMounted(async () => {
  if (!store.herds.length) await store.fetchHerds();
  if (!store.corrals.length) await store.fetchCorrals();
  if (isEdit.value) {
    const corral = store.getCorralById(route.params.id);
    if (corral) {
      form.value.name = corral.name;
      form.value.herdId = corral.herdId;
    } else {
      router.push({ name: "livestock-corrals" });
    }
  } else if (herdOptions.value[0]) {
    form.value.herdId = herdOptions.value[0].id;
  }
});

/**
 * Saves the corral from the form, creating a new one or updating the existing one.
 * @returns {Promise<void>}
 */
const save = async () => {
  let id = null;
  if (isEdit.value) id = route.params.id;

  const corral = new Corral({
    id,
    name: form.value.name,
    herdId: form.value.herdId,
  });
  const saved = isEdit.value
    ? await store.updateCorral(corral)
    : await store.addCorral(corral);

  if (saved) router.push({ name: "livestock-corrals" });
};

const formTitle = computed(() => {
  if (isEdit.value) return t("corrals.editTitle");
  return t("corrals.newTitle");
});
</script>

<template>
  <form class="panel form-grid friendly-form" @submit.prevent="save">
    <div class="form-hero full">
      <i class="pi pi-stop"></i>
      <div>
        <span class="section-chip">Livestock BC</span>
        <h2>{{ formTitle }}</h2>
        <p>{{ t("corrals.formSubtitle") }}</p>
      </div>
    </div>
    <label
      >{{ t("corrals.name")
      }}<pv-input-text
        v-model="form.name"
        :placeholder="t('corrals.namePlaceholder')"
        required
    /></label>
    <label
      >{{ t("corrals.herd")
      }}<pv-select
        v-model="form.herdId"
        :options="herdOptions"
        option-label="name"
        option-value="id"
        required
    /></label>
    <p v-if="!herdOptions.length" class="error-text full">
      {{ t("corrals.noHerds") }}
    </p>
    <p v-if="store.errors.length" class="error-text full">
      {{ t("corrals.saveError") }}
    </p>
    <div class="form-actions friendly-actions full">
      <pv-button :label="t('common.save')" icon="pi pi-save" type="submit" />
      <pv-button
        :label="t('common.cancel')"
        severity="secondary"
        outlined
        @click="router.push({ name: 'livestock-corrals' })"
      />
    </div>
  </form>
</template>
