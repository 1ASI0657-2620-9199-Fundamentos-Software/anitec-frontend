import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const animalsEndpointPath = import.meta.env.VITE_ANIMALS_ENDPOINT_PATH;

const herdsEndpointPath = import.meta.env.VITE_HERDS_ENDPOINT_PATH;

const corralsEndpointPath = import.meta.env.VITE_CORRALS_ENDPOINT_PATH;

/**
 * Handles HTTP requests for animals, farms, and corrals.
 */
export class LivestockApi extends BaseApi {
    #animalsEndpoint;
    #herdsEndpoint;
    #corralsEndpoint;

    /**
     * Prepares animal, herd, and corral endpoints using environment variables.
     */
    constructor() {
        super();
        this.#animalsEndpoint = new BaseEndpoint(this, animalsEndpointPath);
        this.#herdsEndpoint = new BaseEndpoint(this, herdsEndpointPath);
        this.#corralsEndpoint = new BaseEndpoint(this, corralsEndpointPath);
    }

    /** @returns {Promise} Lists registered animals. */
    getAnimals() {
        return this.#animalsEndpoint.getAll();
    }

    /** @param {number|string} id Animal identifier. @returns {Promise} */
    getAnimalById(id) {
        return this.#animalsEndpoint.getById(id);
    }

    /** @param {Object} resource Animal data. @returns {Promise} */
    createAnimal(resource) {
        return this.#animalsEndpoint.create(resource);
    }

    /** @param {Object} resource Updated animal data. @returns {Promise} */
    updateAnimal(resource) {
        return this.#animalsEndpoint.update(resource.id, resource);
    }

    /** @param {number|string} id Animal identifier. @returns {Promise} */
    deleteAnimal(id) {
        return this.#animalsEndpoint.delete(id);
    }

    /** @returns {Promise} Lists registered farms. */
    getHerds() {
        return this.#herdsEndpoint.getAll();
    }

    /** @param {Object} resource Farm data. @returns {Promise} */
    createHerd(resource) {
        return this.#herdsEndpoint.create(resource);
    }

    /** @param {Object} resource Updated farm data. @returns {Promise} */
    updateHerd(resource) {
        return this.#herdsEndpoint.update(resource.id, resource);
    }

    /** @param {number|string} id Farm identifier. @returns {Promise} */
    deleteHerd(id) {
        return this.#herdsEndpoint.delete(id);
    }

    /** @returns {Promise} Lists registered corrals. */
    getCorrals() {
        return this.#corralsEndpoint.getAll();
    }

    /** @param {Object} resource Corral data. @returns {Promise} */
    createCorral(resource) {
        return this.#corralsEndpoint.create(resource);
    }

    /** @param {Object} resource Updated corral data. @returns {Promise} */
    updateCorral(resource) {
        return this.#corralsEndpoint.update(resource.id, resource);
    }

    /** @param {number|string} id Corral identifier. @returns {Promise} */
    deleteCorral(id) {
        return this.#corralsEndpoint.delete(id);
    }

    /** @param {Object} resource Batch animal data (species, quantity, corralId, etc). @returns {Promise} */
    createAnimalsBulk(resource) {
        return this.#animalsEndpoint.http.post(
            `${animalsEndpointPath}/bulk`,
            resource,
        );
    }

    /** @param {Object} resource {animalIds, status}. @returns {Promise} */
    updateAnimalsStatusBulk(resource) {
        return this.#animalsEndpoint.http.patch(
            `${animalsEndpointPath}/bulk-status`,
            resource,
        );
    }

    /** @param {Object} resource {animalIds}. @returns {Promise} */
    deleteAnimalsBulk(resource) {
        return this.#animalsEndpoint.http.delete(`${animalsEndpointPath}/bulk`, {
            data: resource,
        });
    }

    /**
     * Uploads an animal image. Uses fetch directly (instead of the shared axios
     * instance) so the browser sets the multipart boundary itself; axios keeps
     * forcing the instance's default "application/json" content type otherwise.
     * @param {File} file Image file to upload.
     * @returns {Promise}
     */
    uploadAnimalImage(file) {
        const formData = new FormData();
        formData.append("file", file);
        const token = localStorage.getItem("token");

        return fetch(
            `${import.meta.env.VITE_ANITEC_API_URL}${animalsEndpointPath}/upload-image`,
            {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            },
        ).then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error("Image upload failed");
                error.response = { status: response.status, data };
                throw error;
            }
            return { data };
        });
    }
}
