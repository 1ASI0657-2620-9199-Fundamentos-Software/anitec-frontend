/**
 * Represents a physical pen or enclosure inside a farm or herd.
 */
export class Corral {
    /**
     * Creates a corral with its name and the herd it belongs to.
     * @param {Object} corral Corral data.
     */
    constructor({ id = null, name = "", herdId = null }) {
        this.id = id;
        this.name = name;

        if (herdId) {
            this.herdId = Number(herdId);
        } else {
            this.herdId = null;
        }
    }
}
