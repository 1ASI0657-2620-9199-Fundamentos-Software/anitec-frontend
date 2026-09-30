import { Corral } from "../domain/model/corral.entity.js";

/**
 * Converts data received from the API into Corral entities.
 */
export class CorralAssembler {
    /**
     * Converts a simple resource into a Corral entity.
     * @param {Object} resource Corral data.
     * @returns {Corral}
     */
    static toEntityFromResource(resource) {
        return new Corral({ ...resource });
    }

    /**
     * Converts an HTTP response into a list of corrals.
     * @param {Object} response API response.
     * @returns {Corral[]}
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) return [];

        const resources = Array.isArray(response.data)
            ? response.data
            : response.data.corrals;
        return resources.map((resource) => this.toEntityFromResource(resource));
    }
}
