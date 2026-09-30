const animalList = () => import("./views/animal-list.vue");

const animalForm = () => import("./views/animal-form.vue");

const herdList = () => import("./views/herd-list.vue");

const herdForm = () => import("./views/herd-form.vue");

const corralList = () => import("./views/corral-list.vue");

const corralForm = () => import("./views/corral-form.vue");

const livestockRoutes = [
    {
        path: "herds",
        name: "livestock-herds",
        component: herdList,
        meta: { title: "Fincas", roles: ["rancher"] },
    },
    {
        path: "herds/new",
        name: "livestock-herd-new",
        component: herdForm,
        meta: { title: "Nueva finca", roles: ["rancher"] },
    },
    {
        path: "herds/:id/edit",
        name: "livestock-herd-edit",
        component: herdForm,
        meta: { title: "Editar finca", roles: ["rancher"] },
    },
    {
        path: "corrals",
        name: "livestock-corrals",
        component: corralList,
        meta: { title: "Corrales", roles: ["rancher", "veterinarian"] },
    },
    {
        path: "corrals/new",
        name: "livestock-corral-new",
        component: corralForm,
        meta: { title: "Nuevo corral", roles: ["rancher"] },
    },
    {
        path: "corrals/:id/edit",
        name: "livestock-corral-edit",
        component: corralForm,
        meta: { title: "Editar corral", roles: ["rancher"] },
    },
    {
        path: "animals",
        name: "livestock-animals",
        component: animalList,
        meta: { title: "Animales", roles: ["rancher", "veterinarian"] },
    },
    {
        path: "animals/new",
        name: "livestock-animal-new",
        component: animalForm,
        meta: { title: "Registrar animal", roles: ["rancher"] },
    },
    {
        path: "animals/:id/edit",
        name: "livestock-animal-edit",
        component: animalForm,
        meta: { title: "Editar animal", roles: ["rancher"] },
    },
];

export default livestockRoutes;
