import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { LivestockApi } from "../infrastructure/livestock-api.js";
import { AnimalAssembler } from "../infrastructure/animal.assembler.js";
import { HerdAssembler } from "../infrastructure/herd.assembler.js";
import { CorralAssembler } from "../infrastructure/corral.assembler.js";
import useIamStore from "../../iam/application/iam.store.js";

const api = new LivestockApi();

/**
 * Store that manages animals, farms, and livestock queries.
 */
const useLivestockStore = defineStore("livestock", () => {
    const iam = useIamStore();

    const animals = ref([]);

    const herds = ref([]);

    const corrals = ref([]);

    const errors = ref([]);

    const loaded = ref(false);

    const animalCount = computed(() => animals.value.length);

    const healthyCount = computed(() => {
        let total = 0;

        animals.value.forEach((animal) => {
            if (animal.status === "Saludable") {
                total++;
            }
        });

        return total;
    });

    /**
     * Loads animals from the API and saves them in state.
     * @returns {Promise}
     */
    function fetchAnimals() {
        return api
            .getAnimals()
            .then((response) => {
                animals.value =
                    AnimalAssembler.toEntitiesFromResponse(response);
                loaded.value = true;
            })
            .catch((error) => errors.value.push(error));
    }

    /**
     * Loads farms from the API.
     * @returns {Promise}
     */
    function fetchHerds() {
        return api
            .getHerds()
            .then((response) => {
                herds.value = HerdAssembler.toEntitiesFromResponse(response);
            })
            .catch((error) => errors.value.push(error));
    }

    /**
     * Loads corrals from the API.
     * @returns {Promise}
     */
    function fetchCorrals() {
        return api
            .getCorrals()
            .then((response) => {
                corrals.value = CorralAssembler.toEntitiesFromResponse(response);
            })
            .catch((error) => errors.value.push(error));
    }

    /**
     * Finds an animal by its identifier.
     * @param {number|string} id Animal identifier.
     * @returns {Object|null}
     */
    function getAnimalById(id) {
        let selectedAnimal = null;

        for (let i = 0; i < animals.value.length; i++) {
            const animal = animals.value[i];

            if (Number(animal.id) === Number(id)) {
                selectedAnimal = animal;
            }
        }

        return selectedAnimal;
    }

    /**
     * Returns the farm name using its identifier.
     * @param {number|string} herdId Farm identifier.
     * @returns {string}
     */
    function getHerdName(herdId) {
        let herdName = "Sin hato";

        for (let i = 0; i < herds.value.length; i++) {
            const herd = herds.value[i];

            if (Number(herd.id) === Number(herdId)) {
                herdName = herd.name;
            }
        }

        return herdName;
    }

    /**
     * Finds a rancher inside the platform users.
     * @param {number|string} id User identifier.
     * @returns {Object|null}
     */
    function getRancherById(id) {
        let selectedRancher = null;

        for (let i = 0; i < iam.users.length; i++) {
            const user = iam.users[i];

            if (user.role === "rancher" && Number(user.id) === Number(id)) {
                selectedRancher = user;
            }
        }

        return selectedRancher;
    }

    /**
     * Gets ranchers assigned to a veterinarian.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Object[]}
     */
    function getAssignedRanchers(veterinarianId = iam.currentUserId) {
        const ranchers = [];

        iam.users.forEach((user) => {
            if (
                user.role === "rancher" &&
                Number(user.veterinarianId) === Number(veterinarianId)
            ) {
                ranchers.push(user);
            }
        });

        return ranchers;
    }

    /**
     * Filters farms that belong to a rancher.
     * @param {number|string} ownerId Rancher identifier.
     * @returns {Object[]}
     */
    function getHerdsByOwnerId(ownerId) {
        const ownerHerds = [];

        herds.value.forEach((herd) => {
            if (Number(herd.ownerId) === Number(ownerId)) {
                ownerHerds.push(herd);
            }
        });

        return ownerHerds;
    }

    function getHerdsByVeterinarianId(veterinarianId = iam.currentUserId) {
        const veterinarianHerds = [];

        herds.value.forEach((herd) => {
            const owner = getRancherById(herd.ownerId);

            if (owner) {
                if (Number(owner.veterinarianId) === Number(veterinarianId)) {
                    veterinarianHerds.push(herd);
                }
            } else {
                if (Number(herd.veterinarianId) === Number(veterinarianId)) {
                    veterinarianHerds.push(herd);
                }
            }
        });

        return veterinarianHerds;
    }

    function getAnimalsByHerdIds(herdIds) {
        const ids = [];

        herdIds.forEach((id) => {
            ids.push(Number(id));
        });

        const selectedAnimals = [];

        animals.value.forEach((animal) => {
            if (ids.includes(Number(animal.herdId))) {
                selectedAnimals.push(animal);
            }
        });

        return selectedAnimals;
    }

    /**
     * Gets animals that belong to a rancher's farms.
     * @param {number|string} ownerId Rancher identifier.
     * @returns {Object[]}
     */
    function getAnimalsByOwnerId(ownerId) {
        const herdIds = [];

        getHerdsByOwnerId(ownerId).forEach((herd) => {
            herdIds.push(herd.id);
        });

        return getAnimalsByHerdIds(herdIds);
    }

    /**
     * Gets animals from ranchers assigned to a veterinarian.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Object[]}
     */
    function getAnimalsByVeterinarianId(veterinarianId = iam.currentUserId) {
        const herdIds = [];

        getHerdsByVeterinarianId(veterinarianId).forEach((herd) => {
            herdIds.push(herd.id);
        });

        return getAnimalsByHerdIds(herdIds);
    }

    function getHerdById(id) {
        let selectedHerd = null;

        for (let i = 0; i < herds.value.length; i++) {
            const herd = herds.value[i];

            if (Number(herd.id) === Number(id)) {
                selectedHerd = herd;
            }
        }

        return selectedHerd;
    }

    function getAnimalCountByHerd(herdId) {
        let total = 0;

        animals.value.forEach((animal) => {
            if (Number(animal.herdId) === Number(herdId)) {
                total++;
            }
        });

        return total;
    }

    /**
     * Finds a corral by its identifier.
     * @param {number|string} id Corral identifier.
     * @returns {Object|null}
     */
    function getCorralById(id) {
        let selectedCorral = null;

        for (let i = 0; i < corrals.value.length; i++) {
            const corral = corrals.value[i];

            if (Number(corral.id) === Number(id)) {
                selectedCorral = corral;
            }
        }

        return selectedCorral;
    }

    /**
     * Returns the corral name using its identifier.
     * @param {number|string} corralId Corral identifier.
     * @returns {string}
     */
    function getCorralName(corralId) {
        if (!corralId) return "Sin corral";

        let corralName = "Sin corral";

        for (let i = 0; i < corrals.value.length; i++) {
            const corral = corrals.value[i];

            if (Number(corral.id) === Number(corralId)) {
                corralName = corral.name;
            }
        }

        return corralName;
    }

    /**
     * Filters corrals that belong to a herd.
     * @param {number|string} herdId Herd identifier.
     * @returns {Object[]}
     */
    function getCorralsByHerdId(herdId) {
        const herdCorrals = [];

        corrals.value.forEach((corral) => {
            if (Number(corral.herdId) === Number(herdId)) {
                herdCorrals.push(corral);
            }
        });

        return herdCorrals;
    }

    function getAnimalCountByCorral(corralId) {
        let total = 0;

        animals.value.forEach((animal) => {
            if (Number(animal.corralId) === Number(corralId)) {
                total++;
            }
        });

        return total;
    }

    /**
     * Registers a new animal and updates the local list.
     * @param {Object} animal Animal data.
     * @returns {Promise}
     */
    function addAnimal(animal) {
        return api
            .createAnimal(animal)
            .then((response) => {
                animals.value.push(
                    AnimalAssembler.toEntityFromResource(response.data),
                );
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Updates an existing animal.
     * @param {Object} animal Updated animal data.
     * @returns {Promise}
     */
    function updateAnimal(animal) {
        return api
            .updateAnimal(animal)
            .then((response) => {
                const updated = AnimalAssembler.toEntityFromResource(
                    response.data,
                );

                let index = -1;

                for (let i = 0; i < animals.value.length; i++) {
                    const item = animals.value[i];

                    if (Number(item.id) === Number(updated.id)) {
                        index = i;
                    }
                }

                if (index !== -1) animals.value[index] = updated;
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Deletes an animal and removes it from local state.
     * @param {Object} animal Selected animal.
     * @returns {Promise}
     */
    function deleteAnimal(animal) {
        return api
            .deleteAnimal(animal.id)
            .then(() => {
                const newAnimals = [];

                animals.value.forEach((item) => {
                    if (Number(item.id) !== Number(animal.id)) {
                        newAnimals.push(item);
                    }
                });

                animals.value = newAnimals;
            })
            .catch((error) => errors.value.push(error));
    }

    /**
     * Registers many animals at once inside a corral and updates the local list.
     * @param {Object} payload {species, breed, gender, birthDate, weight, status, herdId, corralId, quantity}.
     * @returns {Promise<boolean>}
     */
    function addAnimalsBulk(payload) {
        return api
            .createAnimalsBulk(payload)
            .then((response) => {
                response.data.forEach((resource) => {
                    animals.value.push(AnimalAssembler.toEntityFromResource(resource));
                });
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Updates the status of many animals at once (e.g. marking them as sold).
     * @param {number[]} animalIds Selected animal identifiers.
     * @param {string} status New status to apply.
     * @returns {Promise<boolean>}
     */
    function updateAnimalsStatusBulk(animalIds, status) {
        return api
            .updateAnimalsStatusBulk({ animalIds, status })
            .then((response) => {
                response.data.forEach((resource) => {
                    const updated = AnimalAssembler.toEntityFromResource(resource);

                    let index = -1;

                    for (let i = 0; i < animals.value.length; i++) {
                        const item = animals.value[i];

                        if (Number(item.id) === Number(updated.id)) {
                            index = i;
                        }
                    }

                    if (index !== -1) animals.value[index] = updated;
                });
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Uploads an animal photo and returns the relative URL saved by the backend.
     * @param {File} file Image file selected by the user.
     * @returns {Promise<string|null>}
     */
    function uploadAnimalImage(file) {
        return api
            .uploadAnimalImage(file)
            .then((response) => {
                errors.value = [];
                return response.data.url;
            })
            .catch((error) => {
                errors.value.push(error);
                return null;
            });
    }

    /**
     * Deletes many animals at once and removes them from local state.
     * @param {number[]} animalIds Selected animal identifiers.
     * @returns {Promise<boolean>}
     */
    function deleteAnimalsBulk(animalIds) {
        return api
            .deleteAnimalsBulk({ animalIds })
            .then(() => {
                const ids = animalIds.map((id) => Number(id));
                animals.value = animals.value.filter(
                    (animal) => !ids.includes(Number(animal.id)),
                );
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Registers a new farm and updates the local list.
     * @param {Object} herd Farm data.
     * @returns {Promise}
     */
    function addHerd(herd) {
        return api
            .createHerd(herd)
            .then((response) => {
                herds.value.push(
                    HerdAssembler.toEntityFromResource(response.data),
                );
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Updates farm data.
     * @param {Object} herd Updated farm data.
     * @returns {Promise}
     */
    function updateHerd(herd) {
        return api
            .updateHerd(herd)
            .then((response) => {
                const updated = HerdAssembler.toEntityFromResource(
                    response.data,
                );

                let index = -1;

                for (let i = 0; i < herds.value.length; i++) {
                    const item = herds.value[i];

                    if (Number(item.id) === Number(updated.id)) {
                        index = i;
                    }
                }

                if (index !== -1) herds.value[index] = updated;
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Deletes a farm and removes it from local state.
     * @param {Object} herd Selected farm.
     * @returns {Promise}
     */
    function deleteHerd(herd) {
        return api
            .deleteHerd(herd.id)
            .then(() => {
                const newHerds = [];

                herds.value.forEach((item) => {
                    if (Number(item.id) !== Number(herd.id)) {
                        newHerds.push(item);
                    }
                });

                herds.value = newHerds;
            })
            .catch((error) => errors.value.push(error));
    }

    /**
     * Registers a new corral and updates the local list.
     * @param {Object} corral Corral data.
     * @returns {Promise<boolean>}
     */
    function addCorral(corral) {
        return api
            .createCorral(corral)
            .then((response) => {
                corrals.value.push(
                    CorralAssembler.toEntityFromResource(response.data),
                );
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Updates corral data.
     * @param {Object} corral Updated corral data.
     * @returns {Promise<boolean>}
     */
    function updateCorral(corral) {
        return api
            .updateCorral(corral)
            .then((response) => {
                const updated = CorralAssembler.toEntityFromResource(
                    response.data,
                );

                let index = -1;

                for (let i = 0; i < corrals.value.length; i++) {
                    const item = corrals.value[i];

                    if (Number(item.id) === Number(updated.id)) {
                        index = i;
                    }
                }

                if (index !== -1) corrals.value[index] = updated;
                errors.value = [];
                return true;
            })
            .catch((error) => {
                errors.value.push(error);
                return false;
            });
    }

    /**
     * Deletes a corral and removes it from local state.
     * @param {Object} corral Selected corral.
     * @returns {Promise}
     */
    function deleteCorral(corral) {
        return api
            .deleteCorral(corral.id)
            .then(() => {
                const newCorrals = [];

                corrals.value.forEach((item) => {
                    if (Number(item.id) !== Number(corral.id)) {
                        newCorrals.push(item);
                    }
                });

                corrals.value = newCorrals;
            })
            .catch((error) => errors.value.push(error));
    }

    return {
        animals,
        herds,
        corrals,
        errors,
        loaded,
        animalCount,
        healthyCount,
        fetchAnimals,
        fetchHerds,
        fetchCorrals,
        getAnimalById,
        getHerdName,
        getRancherById,
        getAssignedRanchers,
        getHerdsByOwnerId,
        getHerdsByVeterinarianId,
        getAnimalsByHerdIds,
        getAnimalsByOwnerId,
        getAnimalsByVeterinarianId,
        getHerdById,
        getAnimalCountByHerd,
        getCorralById,
        getCorralName,
        getCorralsByHerdId,
        getAnimalCountByCorral,
        addAnimal,
        updateAnimal,
        deleteAnimal,
        addAnimalsBulk,
        updateAnimalsStatusBulk,
        deleteAnimalsBulk,
        uploadAnimalImage,
        addHerd,
        updateHerd,
        deleteHerd,
        addCorral,
        updateCorral,
        deleteCorral,
    };
});

export default useLivestockStore;
