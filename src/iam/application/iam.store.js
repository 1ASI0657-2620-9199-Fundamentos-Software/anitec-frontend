import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { IamApi } from "../infrastructure/iam-api.js";

const api = new IamApi();

const defaultDemoUsers = [
    {
        id: 1,
        username: "ganadero",
        password: "anitec123",
        role: "rancher",
        fullName: "Carlos Mendoza",
        veterinarianId: 2,
    },
    {
        id: 2,
        username: "veterinaria",
        password: "anitec123",
        role: "veterinarian",
        fullName: "Dra. Ana Lopez",
    },
    {
        id: 3,
        username: "maria",
        password: "anitec123",
        role: "rancher",
        fullName: "Maria Gonzales",
        veterinarianId: 2,
    },
    {
        id: 4,
        username: "jose",
        password: "anitec123",
        role: "rancher",
        fullName: "Jose Quispe",
        veterinarianId: 5,
    },
    {
        id: 5,
        username: "vetpedro",
        password: "anitec123",
        role: "veterinarian",
        fullName: "Dr. Pedro Ramirez",
    },
    {
        id: 6,
        username: "rosa",
        password: "anitec123",
        role: "rancher",
        fullName: "Rosa Huaman",
        veterinarianId: 7,
    },
    {
        id: 7,
        username: "vetlucia",
        password: "anitec123",
        role: "veterinarian",
        fullName: "Dra. Lucia Torres",
    },
];

const sessionKey = "anitec-session";

const demoUsersKey = "anitec-demo-users";

const normalizeRole = (role) => {
    if (!role) return null;

    const normalized = String(role).toLowerCase();

    if (normalized === "rancher") return "rancher";
    if (normalized === "veterinarian") return "veterinarian";

    return normalized;
};

const toUserFromResource = (resource) => ({
    id: resource.id,
    username: resource.username,
    role: normalizeRole(resource.role),
    fullName: resource.fullName || resource.username,
    veterinarianId: resource.veterinarianId || null,
});

const getResponseList = (response) => {
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
};

/**
 * Reads the session saved in localStorage.
 * @returns {Object|null}
 */
const readSession = () => {
    try {
        const session = JSON.parse(localStorage.getItem(sessionKey));
        const token = localStorage.getItem("token");

        if (!session || !token) {
            localStorage.removeItem(sessionKey);
            localStorage.removeItem("token");
            return null;
        }

        return session;
    } catch {
        return null;
    }
};

/**
 * Reads saved demo users or returns the default users.
 * @returns {Object[]}
 */
const readDemoUsers = () => {
    try {
        const users = JSON.parse(localStorage.getItem(demoUsersKey));

        if (users) {
            return users;
        }

        return defaultDemoUsers;
    } catch {
        return defaultDemoUsers;
    }
};

/**
 * Saves demo users to keep assignment changes.
 * @param {Object[]} users Updated demo users.
 */
const saveDemoUsers = (users) => {
    localStorage.setItem(demoUsersKey, JSON.stringify(users));
};

/**
 * Store that manages the current session and demo users.
 */
const useIamStore = defineStore("iam", () => {
    const savedSession = readSession();

    const demoUsers = ref(readDemoUsers());

    const currentUser = ref(savedSession);

    const errors = ref([]);

    /** Requests a veterinarian sent and that the rancher has not accepted yet. */
    const pendingClients = ref([]);

    /** Requests a rancher received from veterinarians (any status). */
    const rancherRequests = ref([]);

    const users = computed(() => demoUsers.value);

    const isSignedIn = computed(() => {
        if (currentUser.value) {
            return true;
        }

        return false;
    });

    const currentUserId = computed(() => {
        if (currentUser.value) {
            return currentUser.value.id;
        }

        return 0;
    });

    const currentRole = computed(() => {
        if (currentUser.value) {
            return currentUser.value.role;
        }

        return null;
    });

    const currentFullName = computed(() => {
        if (currentUser.value) {
            return currentUser.value.fullName;
        }

        return "";
    });

    /**
     * Loads platform users from the backend.
     * @returns {Promise<Object[]>}
     */
    function fetchUsers() {
        return api
            .getUsers()
            .then((response) => {
                demoUsers.value = getResponseList(response).map(
                    toUserFromResource,
                );
                saveDemoUsers(demoUsers.value);
                return demoUsers.value;
            })
            .catch((error) => {
                errors.value.push(error);
                return demoUsers.value;
            });
    }

    /**
     * Synchronizes veterinarian clients from the backend. Only ranchers that accepted the
     * veterinarian are treated as clients; the rest are kept as pending requests.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise<Object[]>}
     */
    function fetchVeterinarianClients(veterinarianId = currentUserId.value) {
        return api
            .getVeterinarianClients(veterinarianId)
            .then((response) => {
                const clientIds = [];
                const allClients = getResponseList(response);

                pendingClients.value = allClients
                    .filter(
                        (client) =>
                            String(client.status).toLowerCase() === "pending",
                    )
                    .map((client) => ({
                        id: Number(client.rancherId),
                        fullName: client.rancherName || `Ganadero ${client.rancherId}`,
                        requestedAt: client.requestedAt,
                    }));

                const clients = allClients
                    .filter(
                        (client) =>
                            String(client.status).toLowerCase() === "accepted",
                    )
                    .map((client) => {
                    const rancherId = Number(client.rancherId);

                    clientIds.push(rancherId);
                    return {
                        id: rancherId,
                        username: client.username || `rancher-${rancherId}`,
                        role: "rancher",
                        fullName:
                            client.rancherName ||
                            client.fullName ||
                            client.username ||
                            `Ganadero ${rancherId}`,
                        veterinarianId: Number(veterinarianId),
                    };
                });

                const usersById = new Map();

                demoUsers.value.forEach((user) => {
                    usersById.set(Number(user.id), { ...user });
                });

                clients.forEach((client) => {
                    usersById.set(Number(client.id), client);
                });

                demoUsers.value = Array.from(usersById.values()).map(
                    (user) => {
                        if (
                            user.role === "rancher" &&
                            Number(user.veterinarianId) ===
                                Number(veterinarianId) &&
                            !clientIds.includes(Number(user.id))
                        ) {
                            return { ...user, veterinarianId: null };
                        }

                        return user;
                    },
                );

                saveDemoUsers(demoUsers.value);
                return clients;
            })
            .catch((error) => {
                errors.value.push(error);
                return [];
            });
    }

    /**
     * Lists ranchers that can be added to a veterinarian portfolio.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise<Object[]>}
     */
    function fetchAvailableRanchers(veterinarianId = currentUserId.value) {
        return api
            .getAvailableRanchers(veterinarianId)
            .then((response) => {
                const ranchers = getResponseList(response).map((resource) => ({
                    ...toUserFromResource(resource),
                    role: "rancher",
                    veterinarianId: null,
                    herdCount: resource.herds,
                    animalCount: resource.animals,
                }));
                const usersById = new Map();

                demoUsers.value.forEach((user) => {
                    usersById.set(Number(user.id), { ...user });
                });

                ranchers.forEach((rancher) => {
                    usersById.set(Number(rancher.id), rancher);
                });

                demoUsers.value = Array.from(usersById.values());
                saveDemoUsers(demoUsers.value);
                return ranchers;
            })
            .catch((error) => {
                errors.value.push(error);
                return [];
            });
    }

    /**
     * Validates credentials in the backend, saves the session, and redirects by role.
     * @param {Object} credentials Entered username and password.
     * @param {Object} router Vue Router instance used after login.
     * @returns {Promise<boolean>}
     */
    async function signUp(resource, router) {
        try {
            const fullName = resource.fullName ? resource.fullName.trim() : "";
            const username = resource.username ? resource.username.trim() : "";
            const role = resource.role || "Rancher";

            await api.signUp({
                fullName,
                username,
                password: resource.password,
                role,
            });

            await fetchUsers();

            return signIn(
                {
                    username,
                    password: resource.password,
                },
                router,
            );
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.response?.data?.title ||
                "No se pudo registrar el usuario";

            errors.value = [new Error(message)];
            return false;
        }
    }

    async function signIn(credentials, router) {
        try {
            const username = credentials.username
                ? credentials.username.trim()
                : "";
            const response = await api.signIn({
                username,
                password: credentials.password,
            });
            const user = response.data;
            const role = normalizeRole(user.role);

            const session = {
                id: user.id,
                username: user.username,
                role,
                fullName: user.fullName || user.username,
                token: user.token,
            };

            currentUser.value = session;
            errors.value = [];
            localStorage.setItem(sessionKey, JSON.stringify(session));
            localStorage.setItem("token", user.token);

            await fetchUsers();

            if (role === "veterinarian") {
                await fetchVeterinarianClients(user.id);
            }

            if (role === "rancher") router.push({ name: "rancher-dashboard" });
            if (role === "veterinarian")
                router.push({ name: "veterinarian-dashboard" });

            return true;
        } catch (error) {
            const username = credentials.username
                ? credentials.username.trim()
                : "";
            const demoUser =
                demoUsers.value.find(
                    (u) =>
                        String(u.username) === String(username) &&
                        String(u.password) === String(credentials.password),
                ) ||
                defaultDemoUsers.find(
                    (u) =>
                        String(u.username) === String(username) &&
                        String(u.password) === String(credentials.password),
                );

            if (demoUser) {
                const session = {
                    id: demoUser.id,
                    username: demoUser.username,
                    role: normalizeRole(demoUser.role),
                    fullName: demoUser.fullName || demoUser.username,
                    token: `demo-token-${demoUser.id}`,
                };

                currentUser.value = session;
                errors.value = [];
                localStorage.setItem(sessionKey, JSON.stringify(session));
                localStorage.setItem("token", session.token);

                if (demoUser.role === "rancher")
                    router.push({ name: "rancher-dashboard" });
                if (demoUser.role === "veterinarian")
                    router.push({ name: "veterinarian-dashboard" });

                return true;
            }

            errors.value = [
                new Error("Credenciales invalidas o API no disponible"),
            ];
            return false;
        }
    }

    /**
     * Sends an access request to a rancher. The rancher must approve it before the
     * veterinarian can see any data, so the rancher is not added to the portfolio yet.
     * @param {number|string} rancherId Rancher identifier.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise<boolean>}
     */
    async function assignRancherToVeterinarian(
        rancherId,
        veterinarianId = currentUserId.value,
    ) {
        try {
            await api.addVeterinarianClient(veterinarianId, rancherId);
        } catch (error) {
            errors.value.push(error);
            return false;
        }

        await fetchVeterinarianClients(veterinarianId);
        return true;
    }

    /**
     * Loads the access requests received by the current rancher.
     * @param {number|string} rancherId Rancher identifier.
     * @returns {Promise<Object[]>}
     */
    function fetchRancherRequests(rancherId = currentUserId.value) {
        return api
            .getRancherRequests(rancherId)
            .then((response) => {
                rancherRequests.value = getResponseList(response);
                return rancherRequests.value;
            })
            .catch((error) => {
                errors.value.push(error);
                rancherRequests.value = [];
                return [];
            });
    }

    /**
     * The rancher approves the request of a veterinarian.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise<boolean>}
     */
    async function approveVeterinarianRequest(veterinarianId) {
        try {
            await api.approveVeterinarianRequest(
                currentUserId.value,
                veterinarianId,
            );
        } catch (error) {
            errors.value.push(error);
            return false;
        }

        await fetchRancherRequests();
        return true;
    }

    /**
     * The rancher rejects a request or revokes the access of a veterinarian.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise<boolean>}
     */
    async function rejectVeterinarianRequest(veterinarianId) {
        try {
            await api.rejectVeterinarianRequest(
                currentUserId.value,
                veterinarianId,
            );
        } catch (error) {
            errors.value.push(error);
            return false;
        }

        await fetchRancherRequests();
        return true;
    }

    /**
     * Removes the relationship between a rancher and a veterinarian.
     * @param {number|string} rancherId Rancher identifier.
     * @param {number|string} veterinarianId Veterinarian identifier.
     * @returns {Promise<boolean>}
     */
    async function unassignRancherFromVeterinarian(
        rancherId,
        veterinarianId = currentUserId.value,
    ) {
        try {
            await api.removeVeterinarianClient(veterinarianId, rancherId);
        } catch (error) {
            errors.value.push(error);
            return false;
        }

        let rancherIndex = -1;

        for (let i = 0; i < demoUsers.value.length; i++) {
            const user = demoUsers.value[i];

            if (
                user.role === "rancher" &&
                Number(user.id) === Number(rancherId) &&
                Number(user.veterinarianId) === Number(veterinarianId)
            ) {
                rancherIndex = i;
            }
        }

        if (rancherIndex !== -1) {
            demoUsers.value[rancherIndex].veterinarianId = null;
            saveDemoUsers(demoUsers.value);
        }

        // Also refreshes the pending requests when the veterinarian cancels one.
        await fetchVeterinarianClients(veterinarianId);
        return true;
    }

    /**
     * Closes the current session and clears saved data.
     * @param {Object} router Vue Router instance used to return to login.
     */
    function signOut(router) {
        currentUser.value = null;
        errors.value = [];
        localStorage.removeItem(sessionKey);
        localStorage.removeItem("token");
        localStorage.removeItem(demoUsersKey);

        if (router) {
            router.push({ name: "iam-sign-in" });
        }
    }

    return {
        users,
        demoUsers,
        errors,
        currentUser,
        currentUserId,
        currentRole,
        currentFullName,
        isSignedIn,
        fetchUsers,
        fetchVeterinarianClients,
        fetchAvailableRanchers,
        fetchRancherRequests,
        approveVeterinarianRequest,
        rejectVeterinarianRequest,
        pendingClients,
        rancherRequests,
        signUp,
        signIn,
        signOut,
        assignRancherToVeterinarian,
        unassignRancherFromVeterinarian,
    };
});

export default useIamStore;
