/**
 * Represents an animal registered inside a farm or herd.
 */
export class Animal {
    /**
     * Creates an animal with its main data and converts numeric values when needed.
     * @param {Object} animal Animal data.
     */
    constructor({
        id = null,
        tag = "",
        name = "",
        species = "Bovino",
        breed = "",
        gender = "",
        birthDate = "",
        weight = 0,
        status = "Saludable",
        herdId = null,
        corralId = null,
        source = null,
        ageRange = null,
        imageUrl = null,
    }) {
        this.id = id;
        this.tag = tag;
        this.name = name;
        this.species = species;
        this.breed = breed;
        this.gender = gender;
        this.birthDate = birthDate || null;
        this.weight = Number(weight);
        this.status = status;
        this.source = source || null;
        this.ageRange = ageRange || null;
        this.imageUrl = imageUrl || null;

        if (herdId) {
            this.herdId = Number(herdId);
        } else {
            this.herdId = null;
        }

        if (corralId) {
            this.corralId = Number(corralId);
        } else {
            this.corralId = null;
        }
    }
}
