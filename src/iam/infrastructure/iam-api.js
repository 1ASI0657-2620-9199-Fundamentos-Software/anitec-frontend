import { BaseApi } from "../../shared/infrastructure/base-api.js";

const signInEndpointPath =
    import.meta.env.VITE_SIGNIN_ENDPOINT_PATH || "/authentication/sign-in";

const signUpEndpointPath =
    import.meta.env.VITE_SIGNUP_ENDPOINT_PATH || "/authentication/sign-up";

const usersEndpointPath = import.meta.env.VITE_USERS_ENDPOINT_PATH || "/users";

/**
 * Handles HTTP requests for authentication, users, and veterinarian clients.
 */
export class IamApi extends BaseApi {
    /** @param {Object} credentials Username and password. @returns {Promise} */
    signIn(credentials) {
        return this.http.post(signInEndpointPath, credentials);
    }

    /** @param {Object} resource User registration data. @returns {Promise} */
    signUp(resource) {
        return this.http.post(signUpEndpointPath, resource);
    }

    /** @returns {Promise} Lists platform users. */
    getUsers() {
        return this.http.get(usersEndpointPath);
    }

    /** @param {number|string} veterinarianId Veterinarian identifier. @returns {Promise} */
    getVeterinarianClients(veterinarianId) {
        return this.http.get(`/veterinarian/${veterinarianId}/clients`);
    }

    /** @param {number|string} veterinarianId Veterinarian identifier. @returns {Promise} */
    getAvailableRanchers(veterinarianId) {
        return this.http.get(
            `/veterinarian/${veterinarianId}/available-ranchers`,
        );
    }

    /**
     * Adds a rancher to the veterinarian client list.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @param {number|string} rancherId Rancher identifier.
     * @returns {Promise}
     */
    addVeterinarianClient(veterinarianId, rancherId) {
        return this.http.post(
            `/veterinarian/${veterinarianId}/clients/${rancherId}`,
        );
    }

    /**
     * Removes a rancher from the veterinarian client list.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @param {number|string} rancherId Rancher identifier.
     * @returns {Promise}
     */
    removeVeterinarianClient(veterinarianId, rancherId) {
        return this.http.delete(
            `/veterinarian/${veterinarianId}/clients/${rancherId}`,
        );
    }

    /**
     * Lists the access requests that veterinarians sent to a rancher.
     * @param {number|string} rancherId Rancher identifier.
     * @returns {Promise}
     */
    getRancherRequests(rancherId) {
        return this.http.get(`/rancher/${rancherId}/veterinarian-requests`);
    }

    /**
     * The rancher approves a veterinarian request.
     * @param {number|string} rancherId Rancher identifier.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise}
     */
    approveVeterinarianRequest(rancherId, veterinarianId) {
        return this.http.patch(
            `/rancher/${rancherId}/veterinarian-requests/${veterinarianId}/approve`,
        );
    }

    /**
     * The rancher rejects a request or revokes an approved access.
     * @param {number|string} rancherId Rancher identifier.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise}
     */
    rejectVeterinarianRequest(rancherId, veterinarianId) {
        return this.http.patch(
            `/rancher/${rancherId}/veterinarian-requests/${veterinarianId}/reject`,
        );
    }
}
