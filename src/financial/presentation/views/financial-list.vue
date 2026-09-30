<script setup>
import { computed, onBeforeUnmount, onMounted, ref, toRefs } from "vue";
import { useConfirm } from "primevue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import useFinancialStore from "../../application/financial.store.js";
import useIamStore from "../../../iam/application/iam.store.js";

const { t } = useI18n();

const router = useRouter();

const confirm = useConfirm();

const store = useFinancialStore();
const iam = useIamStore();
const { loaded, errors } = toRefs(store);

const mobileQuery = window.matchMedia("(max-width: 720px)");

const isMobile = ref(mobileQuery.matches);

const updateIsMobile = (event) => {
  isMobile.value = event.matches;
};

onMounted(() => mobileQuery.addEventListener("change", updateIsMobile));

onBeforeUnmount(() =>
  mobileQuery.removeEventListener("change", updateIsMobile),
);

const detailVisible = ref(false);

const detailRecord = ref(null);

/**
 * Opens the floating card with the full data of the selected transaction.
 * @param {Object} record Selected record.
 */
const openDetail = (record) => {
  detailRecord.value = record;
  detailVisible.value = true;
};

onMounted(() => {
  if (!store.loaded) store.fetchRecords();
});

/**
 * Defines the visual color depending on whether the record is income or expense.
 * @param {string} type Record type.
 * @returns {string}
 */
const severityFor = (type) => {
  if (type === "Ingreso") return "success";
  return "danger";
};

const visibleRecords = computed(() =>
  store.getRecordsByOwnerId(iam.currentUserId),
);

const visibleIncomeTotal = computed(() =>
  store.getIncomeTotalByOwnerId(iam.currentUserId),
);

const visibleExpenseTotal = computed(() =>
  store.getExpenseTotalByOwnerId(iam.currentUserId),
);

const visibleBalance = computed(() =>
  store.getBalanceByOwnerId(iam.currentUserId),
);

/**
 * Shows the confirmation before deleting a financial record.
 * @param {Object} record Selected record.
 */
const confirmDelete = (record) =>
  confirm.require({
    message: t("finance.confirmDelete"),
    header: t("common.confirmDelete"),
    icon: "pi pi-exclamation-triangle",
    accept: () => store.deleteRecord(record),
  });
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <span class="section-chip">Financial BC</span>
        <h2>{{ t("finance.title") }}</h2>
      </div>
      <pv-button
        :label="t('finance.new')"
        icon="pi pi-plus"
        @click="router.push({ name: 'financial-record-new' })"
      />
    </div>
    <section class="metric-grid compact">
      <article class="metric-card">
        <span>Ingresos</span><strong>S/ {{ visibleIncomeTotal }}</strong>
      </article>
      <article class="metric-card">
        <span>Egresos</span><strong>S/ {{ visibleExpenseTotal }}</strong>
      </article>
      <article class="metric-card">
        <span>Balance</span><strong>S/ {{ visibleBalance }}</strong>
      </article>
    </section>
    <pv-data-table
      :value="visibleRecords"
      :loading="!loaded"
      paginator
      :rows="8"
      striped-rows
      class="financial-list-table"
    >
      <pv-column field="type" :header="t('finance.type')"
        ><template #body="slotProps"
          ><pv-tag
            :value="slotProps.data.type"
            :severity="severityFor(slotProps.data.type)" /></template
      ></pv-column>
      <pv-column field="category" :header="t('finance.category')" sortable />
      <pv-column field="amount" :header="t('finance.amount')" sortable
        ><template #body="slotProps"
          >S/ {{ slotProps.data.amount }}</template
        ></pv-column
      >
      <pv-column
        v-if="!isMobile"
        field="date"
        :header="t('finance.date')"
        sortable
      />
      <pv-column
        v-if="!isMobile"
        field="description"
        :header="t('finance.description')"
      />
      <pv-column :header="t('common.actions')">
        <template #body="slotProps">
          <pv-button
            v-tooltip="t('finance.viewDetail')"
            icon="pi pi-info-circle"
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
                name: 'financial-record-edit',
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
    <p v-if="!visibleRecords.length && loaded" class="empty-state">
      No hay movimientos financieros registrados.
    </p>
    <p v-if="errors.length" class="error-text">{{ t("common.errors") }}</p>

    <pv-dialog
      v-model:visible="detailVisible"
      modal
      :header="t('finance.detailTitle')"
      :style="{ width: '28rem' }"
    >
      <dl v-if="detailRecord" class="animal-detail-grid">
        <dt>{{ t("finance.type") }}</dt>
        <dd>
          <pv-tag
            :value="detailRecord.type"
            :severity="severityFor(detailRecord.type)"
          />
        </dd>
        <dt>{{ t("finance.category") }}</dt>
        <dd>{{ detailRecord.category }}</dd>
        <dt>{{ t("finance.amount") }}</dt>
        <dd>S/ {{ detailRecord.amount }}</dd>
        <dt>{{ t("finance.date") }}</dt>
        <dd>{{ detailRecord.date || "-" }}</dd>
        <dt>{{ t("finance.description") }}</dt>
        <dd>{{ detailRecord.description || "-" }}</dd>
      </dl>
    </pv-dialog>
  </div>
</template>
