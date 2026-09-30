<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { Animal } from "../../domain/model/animal.entity.js";
import useLivestockStore from "../../application/livestock.store.js";
import useIamStore from "../../../iam/application/iam.store.js";
import { resolveMediaUrl } from "../../../shared/infrastructure/media-url.js";

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

const speciesOptions = [
  "Bovino",
  "Ovino",
  "Caprino",
  "Porcino",
  "Equino",
  "Pollo",
  "Pato",
  "Gallina",
  "Pavo",
  "Cuy",
  "Otro",
];

const genderOptions = ["Hembra", "Macho", "Mixto"];

const statusOptions = [
  "Saludable",
  "Observacion",
  "En tratamiento",
  "Vendido",
];

const sourceOptions = [
  "Comprado",
  "Nacido en la finca",
  "Donacion",
  "Otro",
];

const ageRangeOptions = ["Cria", "Juvenil", "Adulto"];

const modeOptions = computed(() => [
  { label: t("animals.modeIndividual"), value: "individual" },
  { label: t("animals.modeBulk"), value: "bulk" },
]);

const mode = ref("individual");

const form = ref({
  tag: "",
  name: "",
  species: "Bovino",
  breed: "",
  gender: "Hembra",
  birthDate: "",
  weight: 0,
  status: "Saludable",
  herdId: null,
  corralId: null,
  source: null,
  ageRange: null,
  imageUrl: null,
});

const bulkForm = ref({
  species: "Bovino",
  breed: "",
  gender: "Hembra",
  status: "Saludable",
  birthDate: "",
  weight: 0,
  herdId: null,
  corralId: null,
  quantity: 1,
  source: null,
  ageRange: null,
  imageUrl: null,
});

const uploadingImage = ref(false);

const uploadingBulkImage = ref(false);

/**
 * Uploads the selected animal photo and stores the returned URL in the individual form.
 * @param {Object} event FileUpload uploader event with the selected files.
 */
const handleImageUpload = async (event) => {
  const file = event.files?.[0];
  if (!file) return;
  uploadingImage.value = true;
  const url = await store.uploadAnimalImage(file);
  uploadingImage.value = false;
  if (url) form.value.imageUrl = url;
};

/**
 * Uploads the selected corral photo and stores the returned URL in the bulk form.
 * @param {Object} event FileUpload uploader event with the selected files.
 */
const handleBulkImageUpload = async (event) => {
  const file = event.files?.[0];
  if (!file) return;
  uploadingBulkImage.value = true;
  const url = await store.uploadAnimalImage(file);
  uploadingBulkImage.value = false;
  if (url) bulkForm.value.imageUrl = url;
};

const herdOptions = computed(() => {
  if (iam.currentRole === "rancher") {
    return store.getHerdsByOwnerId(iam.currentUserId);
  }

  return store.herds;
});

const individualCorralOptions = computed(() =>
  store.getCorralsByHerdId(form.value.herdId),
);

const bulkCorralOptions = computed(() =>
  store.getCorralsByHerdId(bulkForm.value.herdId),
);

watch(
  () => form.value.herdId,
  () => {
    if (isEdit.value) return;
    form.value.corralId = individualCorralOptions.value[0]
      ? individualCorralOptions.value[0].id
      : null;
  },
);

watch(
  () => bulkForm.value.herdId,
  () => {
    bulkForm.value.corralId = bulkCorralOptions.value[0]
      ? bulkCorralOptions.value[0].id
      : null;
  },
);

onMounted(async () => {
  if (!store.herds.length) await store.fetchHerds();
  if (!store.corrals.length) await store.fetchCorrals();
  if (!store.loaded) await store.fetchAnimals();
  if (isEdit.value) {
    const animal = store.getAnimalById(route.params.id);
    if (animal) {
      form.value.tag = animal.tag;
      form.value.name = animal.name;
      form.value.species = animal.species;
      form.value.breed = animal.breed;
      form.value.gender = animal.gender;
      form.value.birthDate = animal.birthDate;
      form.value.weight = animal.weight;
      form.value.status = animal.status;
      form.value.herdId = animal.herdId;
      form.value.corralId = animal.corralId;
      form.value.source = animal.source;
      form.value.ageRange = animal.ageRange;
      form.value.imageUrl = animal.imageUrl;
    } else {
      router.push({ name: "livestock-animals" });
    }
  } else {
    const defaultHerdId = herdOptions.value[0] ? herdOptions.value[0].id : null;
    form.value.herdId = defaultHerdId;
    form.value.corralId = individualCorralOptions.value[0]
      ? individualCorralOptions.value[0].id
      : null;
    bulkForm.value.herdId = defaultHerdId;
    bulkForm.value.corralId = bulkCorralOptions.value[0]
      ? bulkCorralOptions.value[0].id
      : null;
  }
});

/**
 * Saves the animal from the form, creating a new one, registering many at
 * once inside a corral, or updating the existing one.
 * @returns {Promise<void>}
 */
const save = async () => {
  if (!isEdit.value && mode.value === "bulk") {
    const saved = await store.addAnimalsBulk({
      species: bulkForm.value.species,
      breed: bulkForm.value.breed,
      gender: bulkForm.value.gender,
      birthDate: bulkForm.value.birthDate || null,
      weight: bulkForm.value.weight,
      status: bulkForm.value.status,
      herdId: bulkForm.value.herdId,
      corralId: bulkForm.value.corralId,
      quantity: bulkForm.value.quantity,
      source: bulkForm.value.source,
      ageRange: bulkForm.value.ageRange,
      imageUrl: bulkForm.value.imageUrl,
    });

    if (saved) router.push({ name: "livestock-animals" });
    return;
  }

  let id = null;
  if (isEdit.value) id = route.params.id;

  const animal = new Animal({
    id,
    tag: form.value.tag,
    name: form.value.name,
    species: form.value.species,
    breed: form.value.breed,
    gender: form.value.gender,
    birthDate: form.value.birthDate,
    weight: form.value.weight,
    status: form.value.status,
    herdId: form.value.herdId,
    corralId: form.value.corralId,
    source: form.value.source,
    ageRange: form.value.ageRange,
    imageUrl: form.value.imageUrl,
  });
  const saved = isEdit.value
    ? await store.updateAnimal(animal)
    : await store.addAnimal(animal);

  if (saved) router.push({ name: "livestock-animals" });
};

const formTitle = computed(() => {
  if (isEdit.value) return t("animals.editTitle");
  return t("animals.newTitle");
});

const formErrorMessages = computed(() => {
  const messages = [];
  store.errors.forEach((error) => {
    const data = error?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length) {
      messages.push(...data.errors);
    } else if (data?.message) {
      messages.push(data.message);
    }
  });
  return messages;
});
</script>

<template>
  <form class="panel form-grid friendly-form" @submit.prevent="save">
    <div class="form-hero full">
      <i class="pi pi-id-card"></i>
      <div>
        <span class="section-chip">Livestock BC</span>
        <h2>{{ formTitle }}</h2>
        <p>{{ t("animals.formSubtitle") }}</p>
      </div>
    </div>

    <label v-if="!isEdit" class="full"
      >{{ t("animals.mode")
      }}<pv-select-button
        v-model="mode"
        :options="modeOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
    /></label>

    <template v-if="mode === 'individual' || isEdit">
      <label
        >{{ t("animals.tag")
        }}<pv-input-text
          v-model="form.tag"
          :placeholder="t('animals.tagPlaceholder')"
          required
      /></label>
      <label
        >{{ t("animals.name")
        }}<pv-input-text
          v-model="form.name"
          :placeholder="t('animals.namePlaceholder')"
          required
      /></label>
      <label
        >{{ t("animals.species")
        }}<pv-select
          v-model="form.species"
          :options="speciesOptions"
          editable
          required
      /></label>
      <label
        >{{ t("animals.breed")
        }}<pv-input-text
          v-model="form.breed"
          :placeholder="t('animals.breedPlaceholder')"
          required
      /></label>
      <label
        >{{ t("animals.gender")
        }}<pv-select v-model="form.gender" :options="genderOptions"
      /></label>
      <label
        >{{ t("animals.birthDate")
        }}<pv-input-text v-model="form.birthDate" type="date"
      /></label>
      <label
        >{{ t("animals.weight")
        }}<pv-input-number v-model="form.weight" :min="0"
      /></label>
      <label
        >{{ t("animals.status")
        }}<pv-select v-model="form.status" :options="statusOptions"
      /></label>
      <label
        >{{ t("animals.herd")
        }}<pv-select
          v-model="form.herdId"
          :options="herdOptions"
          option-label="name"
          option-value="id"
          required
      /></label>
      <label
        >{{ t("animals.corral")
        }}<pv-select
          v-model="form.corralId"
          :options="individualCorralOptions"
          option-label="name"
          option-value="id"
          :placeholder="t('animals.corralPlaceholder')"
          required
      /></label>
      <p v-if="!individualCorralOptions.length" class="hint-text full">
        {{ t("animals.noCorralsForHerd") }}
        <router-link :to="{ name: 'livestock-corral-new' }">{{
          t("corrals.new")
        }}</router-link>
      </p>
      <label
        >{{ t("animals.source")
        }}<pv-select
          v-model="form.source"
          :options="sourceOptions"
          show-clear
          :placeholder="t('animals.sourcePlaceholder')"
      /></label>
      <label
        >{{ t("animals.ageRange")
        }}<pv-select
          v-model="form.ageRange"
          :options="ageRangeOptions"
          show-clear
          :placeholder="t('animals.ageRangePlaceholder')"
      /></label>
      <label class="full"
        >{{ t("animals.photo")
        }}<pv-file-upload
          mode="basic"
          accept="image/*"
          :max-file-size="5000000"
          :choose-label="t('animals.photoUpload')"
          :disabled="uploadingImage"
          auto
          custom-upload
          @uploader="handleImageUpload"
      /></label>
      <span v-if="uploadingImage" class="hint-text full">{{
        t("animals.uploadingPhoto")
      }}</span>
      <div v-if="form.imageUrl" class="photo-preview full">
        <img :src="resolveMediaUrl(form.imageUrl)" :alt="form.name" />
      </div>
    </template>

    <template v-else>
      <label
        >{{ t("animals.herd")
        }}<pv-select
          v-model="bulkForm.herdId"
          :options="herdOptions"
          option-label="name"
          option-value="id"
          required
      /></label>
      <label
        >{{ t("animals.corral")
        }}<pv-select
          v-model="bulkForm.corralId"
          :options="bulkCorralOptions"
          option-label="name"
          option-value="id"
          :placeholder="t('animals.corralPlaceholder')"
          required
      /></label>
      <p v-if="!bulkCorralOptions.length" class="hint-text full">
        {{ t("animals.noCorralsForHerd") }}
        <router-link :to="{ name: 'livestock-corral-new' }">{{
          t("corrals.new")
        }}</router-link>
      </p>
      <label
        >{{ t("animals.source")
        }}<pv-select
          v-model="bulkForm.source"
          :options="sourceOptions"
          show-clear
          :placeholder="t('animals.sourcePlaceholder')"
      /></label>
      <label
        >{{ t("animals.ageRange")
        }}<pv-select
          v-model="bulkForm.ageRange"
          :options="ageRangeOptions"
          show-clear
          :placeholder="t('animals.ageRangePlaceholder')"
      /></label>
      <label
        >{{ t("animals.species")
        }}<pv-select
          v-model="bulkForm.species"
          :options="speciesOptions"
          editable
          required
      /></label>
      <label
        >{{ t("animals.breed")
        }}<pv-input-text
          v-model="bulkForm.breed"
          :placeholder="t('animals.breedPlaceholder')"
          required
      /></label>
      <label
        >{{ t("animals.gender")
        }}<pv-select v-model="bulkForm.gender" :options="genderOptions"
      /></label>
      <label
        >{{ t("animals.status")
        }}<pv-select v-model="bulkForm.status" :options="statusOptions"
      /></label>
      <label
        >{{ t("animals.birthDate")
        }}<pv-input-text v-model="bulkForm.birthDate" type="date"
      /></label>
      <label
        >{{ t("animals.weight")
        }}<pv-input-number v-model="bulkForm.weight" :min="0"
      /></label>
      <label
        >{{ t("animals.quantity")
        }}<pv-input-number
          v-model="bulkForm.quantity"
          :min="1"
          :max="500"
          show-buttons
          required
      /></label>
      <p class="hint-text full">{{ t("animals.bulkHint") }}</p>
      <label class="full"
        >{{ t("animals.photo")
        }}<pv-file-upload
          mode="basic"
          accept="image/*"
          :max-file-size="5000000"
          :choose-label="t('animals.photoUpload')"
          :disabled="uploadingBulkImage"
          auto
          custom-upload
          @uploader="handleBulkImageUpload"
      /></label>
      <p class="hint-text full">{{ t("animals.photoBulkHint") }}</p>
      <span v-if="uploadingBulkImage" class="hint-text full">{{
        t("animals.uploadingPhoto")
      }}</span>
      <div v-if="bulkForm.imageUrl" class="photo-preview full">
        <img :src="resolveMediaUrl(bulkForm.imageUrl)" :alt="t('animals.photo')" />
      </div>
    </template>

    <div v-if="store.errors.length" class="error-text full">
      <p>{{ t("animals.saveError") }}</p>
      <ul v-if="formErrorMessages.length" class="error-list">
        <li v-for="(message, index) in formErrorMessages" :key="index">
          {{ message }}
        </li>
      </ul>
    </div>
    <div class="form-actions friendly-actions full">
      <pv-button :label="t('common.save')" icon="pi pi-save" type="submit" />
      <pv-button
        :label="t('common.cancel')"
        severity="secondary"
        outlined
        @click="router.push({ name: 'livestock-animals' })"
      />
    </div>
  </form>
</template>
