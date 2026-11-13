/** A role's name for people: "contributor" -> "Contributor", "site-admin" -> "Site admin". */
export const roleLabel = (name) => {
    const words = name.replace(/-/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
};
